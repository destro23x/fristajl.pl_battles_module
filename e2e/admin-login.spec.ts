import { test, expect } from '@playwright/test'

test.describe('Admin login', () => {
  test('shows an error when credentials are invalid', async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Błąd logowania' }),
      })
    })

    await page.goto('/admin/login')
    await page.getByPlaceholder('Login').fill('wrong-user')
    await page.getByPlaceholder('Hasło').fill('wrong-pass')
    await page.getByRole('button', { name: /Zaloguj się/i }).click()

    await expect(page.getByText('Błąd logowania')).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test('redirects to the dashboard on successful login', async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'test-token' }),
      })
    })
    await page.route('**/api/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ username: 'admin', role: 'admin' }),
      })
    })
    await page.route('**/api/admin/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ proposals: [] }),
      })
    })

    await page.goto('/admin/login')
    await page.getByPlaceholder('Login').fill('admin')
    await page.getByPlaceholder('Hasło').fill('correct-pass')
    await page.getByRole('button', { name: /Zaloguj się/i }).click()

    await expect(page).toHaveURL(/\/admin$/)
  })

  test('redirects unauthenticated users away from the dashboard', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login$/)
  })
})
