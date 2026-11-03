// @vitest-environment node
import { expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { strToU8, zipSync } from 'fflate'
import { z } from 'zod'
import { defineTool, Registry } from '../src/core/tool'
import {
  newWorkflow,
  runWorkflow,
  type Log,
  type WorkflowNode,
} from '../src/core/workflow'
import { registry } from '../src/tools/registry'
import { openShared, shareFragment } from '../src/features/sharing'

async function samplePdf(name: string, widths: number[]) {
  const doc = await PDFDocument.create()
  for (const width of widths) doc.addPage([width, 500])
  return new File([new Uint8Array(await doc.save())], name, {
    type: 'application/pdf',
  })
}

it('merges PDF pages in file order and extracts a one-based inclusive range', async () => {
  const one = await samplePdf('one.pdf', [101, 102])
  const two = await samplePdf('two.pdf', [201])
  const merged = (await registry.run('pdf.merge', { files: [one, two] }, {}))
    .pdf as File
  const mergedDoc = await PDFDocument.load(await merged.arrayBuffer())
  expect(mergedDoc.getPages().map((page) => page.getWidth())).toEqual([
    101, 102, 201,
  ])
  const extracted = (
    await registry.run('pdf.extract', { pdf: merged }, { first: 2, last: 3 })
  ).pdf as File
  expect(
    (await PDFDocument.load(await extracted.arrayBuffer()))
      .getPages()
      .map((page) => page.getWidth()),
  ).toEqual([102, 201])
  await expect(
    registry.run('pdf.extract', { pdf: one }, { first: 2, last: 3 }),
  ).rejects.toThrow('page-range')
  await expect(
    registry.run('pdf.merge', { files: [new Blob(['broken'])] }, {}),
  ).rejects.toThrow('invalid-pdf')
})

it('round-trips ZIP bytes and rejects traversal and duplicate files', async () => {
  const files = [
    new File(['한글'], 'korean.txt'),
    new File([Uint8Array.of(0, 255, 10)], 'binary.dat'),
  ]
  const archive = (await registry.run('zip.pack', { files }, {})).file as File
  expect(archive.type).toBe('application/zip')
  const extracted = (await registry.run('zip.unpack', { file: archive }, {}))
    .files as File[]
  expect(extracted.map((file) => file.name)).toEqual([
    'korean.txt',
    'binary.dat',
  ])
  expect(await extracted[0].text()).toBe('한글')
  expect([...new Uint8Array(await extracted[1].arrayBuffer())]).toEqual([
    0, 255, 10,
  ])
  const nested = new Blob([
    new Uint8Array(zipSync({ folder: { 'note.txt': strToU8('nested') } })),
  ])
  const nestedFiles = (await registry.run('zip.unpack', { file: nested }, {}))
    .files as File[]
  expect(nestedFiles[0].name).toBe('folder__note.txt')
  expect(await nestedFiles[0].text()).toBe('nested')
  const unsafe = new Blob([
    new Uint8Array(zipSync({ '../outside.txt': strToU8('bad') })),
  ])
  await expect(
    registry.run('zip.unpack', { file: unsafe }, {}),
  ).rejects.toThrow('archive-name')
  await expect(
    registry.run('zip.pack', { files: [files[0], files[0]] }, {}),
  ).rejects.toThrow('archive-name')
})

function node(id: string, toolId: string, config = {}): WorkflowNode {
  return { id, toolId, config, toolVersion: '1.0.0', position: { x: 0, y: 0 } }
}
const edge = (
  sourceNodeId: string,
  targetNodeId: string,
  sourcePortId = 'text',
) => ({
  id: sourceNodeId + '-' + targetNodeId,
  sourceNodeId,
  targetNodeId,
  sourcePortId,
  targetPortId: 'text',
})

it.each([
  ['yes', 'selected', 'other'],
  ['no', 'other', 'selected'],
])('runs only the chosen branch for %s', async (text, chosen, skipped) => {
  const workflow = {
    ...newWorkflow('Conditional'),
    parallelism: 4,
    nodes: [
      node('input', 'input.text'),
      node('condition', 'flow.condition', { mode: 'equals', match: 'yes' }),
      node('selected', 'output.text'),
      node('other', 'output.text'),
      node('downstream', 'output.text'),
    ],
    edges: [
      edge('input', 'condition'),
      edge('condition', 'selected', 'match'),
      edge('condition', 'other', 'otherwise'),
      edge('other', 'downstream'),
    ],
  }
  const logs: Log[] = []
  const results = await runWorkflow(
    workflow,
    registry,
    { input: { text } },
    new AbortController().signal,
    (log) => logs.push(log),
  )
  expect(results.get(chosen)).toEqual({ text })
  expect(results.has(skipped)).toBe(false)
  expect(results.has('downstream')).toBe(chosen === 'other')
  expect(logs).toContainEqual({
    nodeId: skipped,
    status: 'skipped',
    error: 'branch-skipped',
  })
})

it('starts independent work concurrently and opens a free slot as soon as its dependency finishes', async () => {
  const local = new Registry()
  const releases = new Map<string, () => void>()
  local.register(
    defineTool({
      id: 'test.delay',
      inputs: [{ id: 'text', type: 'text', optional: true }],
      outputs: [{ id: 'text', type: 'text' }],
      fields: [],
      defaults: { key: '' },
      configSchema: z.strictObject({ key: z.string() }),
      async execute(_, inputs, { key }) {
        await new Promise<void>((resolve) => releases.set(key, resolve))
        return { text: (inputs.text ?? '') + key }
      },
    }),
  )
  const workflow = {
    ...newWorkflow('Parallel'),
    parallelism: 2,
    nodes: ['one', 'two', 'dependent'].map((key) =>
      node(key, 'test.delay', { key }),
    ),
    edges: [edge('one', 'dependent')],
  }
  const run = runWorkflow(
    workflow,
    local,
    {},
    new AbortController().signal,
    () => {},
  )
  expect([...releases.keys()]).toEqual(['one', 'two'])
  releases.get('one')!()
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect([...releases.keys()]).toEqual(['one', 'two', 'dependent'])
  releases.get('dependent')!()
  releases.get('two')!()
  expect((await run).get('dependent')).toEqual({ text: 'onedependent' })
})

it('reissues the ID of a shared template and rejects malformed or unsupported links', () => {
  const workflow = {
    ...newWorkflow('한글 & example'),
    nodes: [node('input', 'input.text')],
  }
  const opened = openShared(shareFragment(workflow))
  expect(opened.id).not.toBe(workflow.id)
  expect(opened.name).toBe(workflow.name)
  expect(opened.nodes).toEqual(workflow.nodes)
  expect(() => openShared('#w=%garbage')).toThrow('invalid-workflow')
  expect(() =>
    openShared(
      shareFragment({ ...workflow, nodes: [node('evil', 'arbitrary.js')] }),
    ),
  ).toThrow('unknown-tool')
})
