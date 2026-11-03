import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function connect(page: Page, source: string, target: string) {
  await page.getByLabel('Source port').selectOption({ label: source })
  await page.getByLabel('Target port').selectOption({ label: target })
  await page.getByRole('button', { name: 'Connect', exact: true }).click()
}
test('search, run a Quick Tool, favorite it and see the result', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('searchbox', { name: 'Search tools' })
    .fill('Text Replace')
  await page.getByRole('link', { name: /Text Replace/ }).click()
  await expect(page).toHaveTitle('Text Replace | ToolChain')
  await page.getByRole('button', { name: 'Add to favorites' }).click()
  await page.getByLabel('Input · text').fill('an old idea')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.locator('.result pre')).toHaveText('an new idea')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect(await readFile((await (await download).path())!, 'utf8')).toBe(
    'an new idea',
  )
  await page.goto('/tools')
  await expect(page.getByRole('heading', { name: 'Favorites' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Recently used' }),
  ).toBeVisible()
})
test('add, connect, run, save, reload, reopen and run again', async ({
  page,
}) => {
  await page.goto('/editor')
  await page.getByLabel('Workflow name').fill('Repeatable cleanup')
  const palette = page.locator('.library')
  await palette.getByRole('button', { name: 'Text Input' }).click()
  await page.getByLabel('Run input · text').fill('old old')
  await palette.getByRole('button', { name: 'Text Replace' }).click()
  await palette.getByRole('button', { name: 'Text Output' }).click()
  await connect(
    page,
    '1. Text Input · text (text)',
    '2. Text Replace · text (text)',
  )
  await connect(
    page,
    '2. Text Replace · text (text)',
    '3. Text Output · text (text)',
  )
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.locator('.run-panel pre')).toHaveText('new new')
  await expect(page.locator('progress')).toHaveAttribute('value', '3')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Workflow saved' }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Workflow name')).toHaveValue(
    'Repeatable cleanup',
  )
  await expect(page.getByLabel('Run input · text')).toHaveValue('')
  await page.getByRole('link', { name: 'My Workflows' }).click()
  await page.getByRole('link', { name: 'Open' }).click()
  await page.getByLabel('Run input · text').fill('old plan')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.locator('.run-panel pre')).toHaveText('new plan')
})
test('runs real raster decode, resize, convert and download', async ({
  page,
}) => {
  await page.goto('/templates/optimizer')
  await page.getByRole('link', { name: 'Run' }).click()
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 40
    canvas.height = 20
    const context = canvas.getContext('2d')!
    context.fillStyle = '#164fce'
    context.fillRect(0, 0, 40, 20)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.getByLabel('Run input · image').setInputFiles({
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(encoded, 'base64'),
  })
  await page
    .locator('.node-list')
    .getByRole('button', { name: /Image Resize/ })
    .click()
  await page.getByLabel('Width (px)').fill('20')
  await page
    .locator('.node-list')
    .getByRole('button', { name: /Image Convert/ })
    .click()
  await page.getByLabel('Format', { exact: true }).selectOption('image/jpeg')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByText('Run complete', { exact: true })).toBeVisible()
  await page
    .locator('.node-list')
    .getByRole('button', { name: /Image Convert/ })
    .click()
  const image = page.locator('.run-panel img')
  await expect
    .poll(() =>
      image.evaluate((img) => [
        (img as HTMLImageElement).naturalWidth,
        (img as HTMLImageElement).naturalHeight,
      ]),
    )
    .toEqual([20, 10])
  await page
    .locator('.node-list')
    .getByRole('button', { name: /File Download/ })
    .click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('sample.jpeg')
  const bytes = await readFile((await file.path())!)
  expect([...bytes.subarray(0, 3)]).toEqual([255, 216, 255])

  await page
    .locator('.node-list')
    .getByRole('button', { name: /Image Convert/ })
    .click()
  await page.getByLabel('Format', { exact: true }).selectOption('image/webp')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByText('Run complete', { exact: true })).toBeVisible()
  const webpDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const webp = await webpDownload
  expect(webp.suggestedFilename()).toBe('sample.webp')
  const webpBytes = await readFile((await webp.path())!)
  expect(webpBytes.toString('ascii', 0, 4)).toBe('RIFF')
  expect(webpBytes.toString('ascii', 8, 12)).toBe('WEBP')
})
test('mobile editor, natural-language generation, Korean and theme persist', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/editor')
  await expect(page.locator('.canvas')).toBeHidden()
  await page.locator('summary').getByText('Generate workflow').click()
  await page
    .getByLabel('Describe your workflow')
    .fill('Format JSON and upload it')
  await page.getByRole('button', { name: 'Generate workflow' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'outside the supported commands',
  )
  await page.getByLabel('Describe your workflow').fill('Format JSON')
  await page.getByRole('button', { name: 'Generate workflow' }).click()
  await page.getByLabel('Run input · text').fill('{"a":1}')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.locator('.result pre')).toHaveText('{\n  "a": 1\n}', {
    useInnerText: true,
  })
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390)
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByLabel('Theme').selectOption('dark')
  await page.getByLabel('Language').selectOption('ko')
  await expect(page.getByRole('heading', { name: '설정' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko')
  await page.goto('/tools/text.split')
  await page.getByLabel('입력 · text').fill('가,나')
  await page.getByRole('button', { name: '실행', exact: true }).click()
  await expect(page.locator('.result pre')).toContainText('가')
})
test('validates imports and supports rename, duplicate, export, and delete', async ({
  page,
}) => {
  await page.goto('/templates/cleaner')
  await page.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.getByLabel('Workflow name')).toHaveValue('Text Cleaner')
  await page.getByRole('link', { name: 'My Workflows' }).click()
  await page.getByRole('button', { name: 'Rename' }).click()
  await page.getByLabel('Workflow name').fill('My cleaner')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'My cleaner' })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const file = await download
  const buffer = await readFile((await file.path())!)
  const exported = JSON.parse(buffer.toString())
  expect(exported).toMatchObject({ name: 'My cleaner', schemaVersion: 1 })
  expect(exported.nodes).toHaveLength(3)
  await page.getByLabel('Import JSON').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{}'),
  })
  await expect(page.getByRole('alert')).toContainText(
    'valid ToolChain workflow',
  )
  await page.getByLabel('Import JSON').setInputFiles({
    name: 'export.json',
    mimeType: 'application/json',
    buffer,
  })
  await expect(page.getByRole('heading', { name: 'My cleaner' })).toHaveCount(2)
  await page.getByRole('button', { name: 'Duplicate' }).first().click()
  await expect(page.getByRole('heading', { name: 'My cleaner' })).toHaveCount(3)
  page.once('dialog', (dialog) => dialog.accept())
  await page
    .getByRole('button', { name: 'Delete', exact: true })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'My cleaner' })).toHaveCount(2)
})

test('drag a node onto the canvas and connect using graph handles', async ({
  page,
}) => {
  await page.goto('/editor')
  const canvas = page.getByRole('group', { name: 'Workflow canvas' })
  const palette = page.locator('.library')
  await palette
    .getByRole('button', { name: 'Text Input' })
    .dragTo(canvas, { targetPosition: { x: 40, y: 45 } })
  await expect(canvas.locator('.flow-node')).toHaveCount(1)
  await page.getByLabel('Run input · text').fill('canvas works')
  await palette.getByRole('button', { name: 'Text Output' }).click()
  await expect(canvas.locator('.flow-node')).toHaveCount(2)
  await canvas
    .locator('.flow-node')
    .filter({ hasText: 'Text Input' })
    .locator('.vue-flow__handle.source')
    .hover()
  await page.mouse.down()
  await canvas.locator('.vue-flow__handle.target').hover()
  await canvas.locator('.vue-flow__handle.target').hover()
  await page.mouse.up()
  await expect(page.locator('.edge-item')).toHaveCount(1)
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.locator('.run-panel pre')).toHaveText('canvas works')
})

test('clear local data and reset preferences', async ({ page }) => {
  await page.goto('/templates/cleaner')
  await page.getByRole('button', { name: 'Duplicate' }).click()
  await expect(page.getByLabel('Workflow name')).toHaveValue('Text Cleaner')
  await page.getByRole('link', { name: 'Settings' }).click()
  await page.getByLabel('Theme').selectOption('dark')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Clear local data' }).click()
  await expect(page.getByRole('status')).toHaveText('Local data cleared')
  await expect(page.getByLabel('Theme')).toHaveValue('system')
  await page.getByRole('link', { name: 'My Workflows' }).click()
  await expect(page.getByRole('status')).toHaveText('No saved workflows yet.')
})

test('runs CSV in a lazy worker and reports workflow errors without a page crash', async ({
  page,
}) => {
  await page.goto('/tools/csv.to-json')
  await page.getByLabel('Input · csv').fill('name,city\nAda,"Seoul, Korea"')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.locator('.result pre').first()).toContainText(
    '"city": "Seoul, Korea"',
  )
  await page.goto('/editor?template=formatter')
  await page.getByLabel('Run input · text').fill('{')
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByText('Run ended with errors')).toBeVisible()
  await expect(page.locator('.run-panel')).toContainText('Enter valid JSON')
  await expect(page.locator('.run-panel')).toContainText(
    'Skipped because an upstream step failed',
  )
})
