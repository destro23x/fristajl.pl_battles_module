import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test('loads and shows hero, navigation and randomizer tools', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveTitle(/./)
    await expect(page.getByRole('link', { name: 'Fristajl.pl', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Narzędzia freestyle'owca/i })).toBeVisible()
  })

  test('navigation scrolls to the randomizer tools section', async ({ page }) => {
    await page.goto('/')

    await page.getByText('Narzędzia', { exact: true }).click()
    await expect(page.locator('#randomizers')).toBeInViewport()
  })
})
