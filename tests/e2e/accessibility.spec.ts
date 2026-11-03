import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const route of [
  '/',
  '/tools/image.convert',
  '/editor?template=cleaner',
  '/settings',
]) {
  test('WCAG A/AA automated checks for ' + route, async ({ page }) => {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      scan.violations.map(({ id, nodes }) => ({
        id,
        nodes: nodes.map((node) => node.target),
      })),
    ).toEqual([])
  })
}
