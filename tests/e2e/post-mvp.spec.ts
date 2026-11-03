import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { PDFDocument } from 'pdf-lib'
import { unzipSync } from 'fflate'

test('merges and extracts real PDFs in a browser worker', async ({ page }) => {
  async function sample(width: number) {
    const pdf = await PDFDocument.create()
    pdf.addPage([width, 456])
    return Buffer.from(await pdf.save())
  }
  await page.goto('/tools/pdf.merge')
  await page.locator('input[type=file]').setInputFiles([
    {
      name: 'first.pdf',
      mimeType: 'application/pdf',
      buffer: await sample(123),
    },
    {
      name: 'second.pdf',
      mimeType: 'application/pdf',
      buffer: await sample(234),
    },
  ])
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByText('Run complete', { exact: true })).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const merged = await readFile((await (await downloaded).path())!)
  const result = await PDFDocument.load(merged)
  expect(result.getPages().map((item) => item.getWidth())).toEqual([123, 234])

  await page.goto('/tools/pdf.extract')
  await page.locator('input[type=file]').setInputFiles({
    name: 'merged.pdf',
    mimeType: 'application/pdf',
    buffer: merged,
  })
  await page.getByLabel('First page').fill('2')
  await page.getByLabel('Last page').fill('2')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByText('Run complete', { exact: true })).toBeVisible()
  const extracted = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const pages = await PDFDocument.load(
    await readFile((await (await extracted).path())!),
  )
  expect(pages.getPages().map((item) => item.getWidth())).toEqual([234])
})

test('compresses and extracts multiple files without uploading them', async ({
  page,
}) => {
  const networkWrites: string[] = []
  page.on('request', (request) => {
    if (request.postData() || !['GET', 'HEAD'].includes(request.method()))
      networkWrites.push(request.url())
  })
  await page.goto('/tools/zip.pack')
  await page.locator('input[type=file]').setInputFiles([
    { name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') },
    {
      name: 'raw.bin',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from([0, 1, 255]),
    },
  ])
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByText('Run complete', { exact: true })).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const zip = await readFile((await (await downloaded).path())!)
  expect([...unzipSync(zip)['raw.bin']]).toEqual([0, 1, 255])
  await page.goto('/tools/zip.unpack')
  await page.locator('input[type=file]').setInputFiles({
    name: 'sample.zip',
    mimeType: 'application/zip',
    buffer: zip,
  })
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  const extracted = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download hello.txt' }).click()
  expect(await readFile((await (await extracted).path())!, 'utf8')).toBe(
    'hello',
  )
  expect(networkWrites).toEqual([])
})

test('shares a template with a fresh browser context and preserves local runtime input privacy', async ({
  page,
  browser,
}) => {
  await page.goto('/templates/cleaner')
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click()
  await page.getByLabel('Run input · text').fill('private test input')
  await page.getByRole('link', { name: 'My Workflows' }).click()
  await page.getByRole('button', { name: 'Share template' }).click()
  const link = await page.getByLabel('Share link').inputValue()
  expect(link).not.toContain('private')
  expect(new URL(link).pathname).toBe('/templates/shared')
  const fresh = await browser.newContext()
  try {
    const receiver = await fresh.newPage()
    await receiver.goto(link)
    await expect(
      receiver.getByRole('heading', { name: 'Shared template' }),
    ).toBeVisible()
    await expect(
      receiver.getByRole('heading', { name: 'Text Cleaner' }),
    ).toBeVisible()
    await receiver.getByRole('link', { name: 'Open', exact: true }).click()
    await expect(receiver.getByLabel('Run input · text')).toHaveValue('')
    await receiver.getByLabel('Run input · text').fill('one  two')
    await receiver.getByRole('button', { name: 'Run', exact: true }).click()
    await expect(receiver.locator('.run-panel pre')).toHaveText('one two')
    await receiver.goto(link)
    await receiver
      .getByRole('button', { name: 'Duplicate', exact: true })
      .click()
    await expect(receiver).toHaveURL(/\/editor\?id=/)
    await expect(receiver.getByLabel('Workflow name')).toHaveValue(
      'Text Cleaner',
    )
    await receiver.getByRole('link', { name: 'My Workflows' }).click()
    await expect(
      receiver.getByRole('heading', { name: 'Text Cleaner', exact: true }),
    ).toHaveCount(1)
  } finally {
    await fresh.close()
  }
})

test('executes the chosen condition, exposes skipped logs, and exports diagnostics', async ({
  page,
}) => {
  await page.goto('/editor')
  const palette = page.locator('.library')
  await palette.getByRole('button', { name: 'Text Input', exact: true }).click()
  await page.getByLabel('Run input · text').fill('yes, please')
  await palette
    .getByRole('button', { name: 'Text Condition', exact: true })
    .click()
  await palette
    .getByRole('button', { name: 'Text Output', exact: true })
    .click()
  await palette
    .getByRole('button', { name: 'Text Output', exact: true })
    .click()
  for (const [source, target] of [
    ['1. Text Input · text (text)', '2. Text Condition · text (text)'],
    ['2. Text Condition · match (text)', '3. Text Output · text (text)'],
    ['2. Text Condition · otherwise (text)', '4. Text Output · text (text)'],
  ]) {
    await page.getByLabel('Source port').selectOption({ label: source })
    await page.getByLabel('Target port').selectOption({ label: target })
    await page.getByRole('button', { name: 'Connect', exact: true }).click()
  }
  await page.getByLabel('Concurrent steps').selectOption('2')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.locator('.run-panel pre')).toHaveText('yes, please')
  await page.getByLabel('Filter logs').selectOption('skipped')
  await expect(page.locator('.run-panel .log-item')).toHaveCount(1)
  await expect(page.locator('.run-panel .log-item')).toContainText(
    'The condition did not select this branch.',
  )
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export run log' }).click()
  const raw = await readFile((await (await downloaded).path())!, 'utf8')
  expect(raw).not.toContain('yes, please')
  expect(JSON.parse(raw)).toEqual(
    expect.arrayContaining([expect.objectContaining({ status: 'skipped' })]),
  )
})
