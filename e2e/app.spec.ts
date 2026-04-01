// CortexOps - E2E Tests
import { test, expect } from '@playwright/test'

test.describe('CortexOps Application', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/CortexOps/)
  })

  test('should load the workflows page', async ({ page }) => {
    await page.goto('/workflows')
    // App loads the main SPA — the page title should still be CortexOps
    await expect(page).toHaveTitle(/CortexOps/)
  })

  test('should show the main app heading', async ({ page }) => {
    await page.goto('/')
    // The homepage renders the main h1 with the app name
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('should display health check endpoint', async ({ request }) => {
    const response = await request.get('/api/health')
    // Health endpoint always returns JSON even if services are degraded (200 or 503)
    const data = await response.json()
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    // Status should be either healthy or degraded — never missing
    expect(['healthy', 'degraded']).toContain(data.status)
  })
})
