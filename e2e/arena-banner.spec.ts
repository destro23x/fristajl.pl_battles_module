import { test, expect } from '@playwright/test'

test.describe('Arena banner', () => {
  test('shows the new-feature badge, pitch and feedback info', async ({ page }) => {
    await page.route('**/api/matchmaking/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ waiting: 0, online: 0 }),
      })
    })

    await page.goto('/')

    const banner = page.locator('a', { hasText: 'Freestyle Arena' })
    await expect(banner).toBeVisible()
    await expect(banner.getByText('NOWOŚĆ')).toBeVisible()
    await expect(banner).toContainText('fristajl.pl.inc@gmail.com')
    await expect(banner).toContainText('konstruktywną krytykę')
    await expect(banner).toHaveAttribute('href', /^http:\/\/localhost:7070/)
    await expect(banner).toHaveAttribute('target', '_blank')
  })

  test('displays live online and waiting counts from the backend', async ({ page }) => {
    await page.route('**/api/matchmaking/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ waiting: 3, online: 5 }),
      })
    })

    await page.goto('/')

    const banner = page.locator('a', { hasText: 'Freestyle Arena' })
    await expect(banner).toContainText('5 osób na Arenie')
    await expect(banner).toContainText('3 osób szuka przeciwnika teraz')
  })

  test('invites users to be the first when no one is waiting', async ({ page }) => {
    await page.route('**/api/matchmaking/stats', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ waiting: 0, online: 1 }),
      })
    })

    await page.goto('/')

    const banner = page.locator('a', { hasText: 'Freestyle Arena' })
    await expect(banner).toContainText('1 osoba na Arenie')
    await expect(banner).toContainText('Bądź pierwszy — wejdź i poczekaj na przeciwnika')
  })

  test('still renders correctly if the stats endpoint fails', async ({ page }) => {
    await page.route('**/api/matchmaking/stats', async route => {
      await route.fulfill({ status: 500, body: 'error' })
    })

    await page.goto('/')

    const banner = page.locator('a', { hasText: 'Freestyle Arena' })
    await expect(banner).toBeVisible()
  })
})
