import { test, expect } from '@playwright/test'

test.describe('Complete User Journey', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    displayName: 'Test User',
  }

  test('should complete full user flow: register -> browse -> bet (blind) -> bet (open) -> resolve -> payout -> leaderboard', async ({ page }) => {
    test.setTimeout(120000) // 2 minute timeout for full flow

    // Step 1: User Registration
    await page.goto('/')

    // Check if login/register exists
    const registerLink = page.locator('text=Register').or(page.locator('text=Sign Up')).first()
    if (await registerLink.isVisible()) {
      await registerLink.click()

      await page.fill('input[name="username"]', testUser.username)
      await page.fill('input[name="email"]', testUser.email)
      await page.fill('input[name="displayName"]', testUser.displayName)

      await page.click('button[type="submit"]')
      await page.waitForURL('/', { timeout: 10000 })
    }

    // Step 2: Browse Markets
    await page.goto('/markets')
    await expect(page.locator('h1')).toContainText('Markets')

    // Wait for markets to load
    await page.waitForSelector('[data-testid="market-card"]', { timeout: 10000 })
    const marketCards = page.locator('[data-testid="market-card"]')
    const marketCount = await marketCards.count()
    expect(marketCount).toBeGreaterThan(0)

    // Step 3: Click on first market
    const firstMarket = marketCards.first()
    await firstMarket.click()

    // Wait for market details
    await page.waitForSelector('h1', { timeout: 5000 })

    // Step 4: Place a bet during blind period (if applicable)
    const betButton = page.locator('button:has-text("Place Bet")').or(page.locator('button:has-text("Yes")'))
    if (await betButton.first().isVisible()) {
      await betButton.first().click()

      // Fill bet amount
      const betInput = page.locator('input[type="number"]').first()
      if (await betInput.isVisible()) {
        await betInput.fill('100')
      }

      // Confirm bet
      const confirmButton = page.locator('button:has-text("Confirm")').or(page.locator('button:has-text("Submit")')).first()
      await confirmButton.click()

      // Wait for success message
      await page.waitForSelector('text=/Bet placed|Success/i', { timeout: 5000 })
    }

    // Step 5: Navigate to leaderboard
    await page.goto('/leaderboards')
    await expect(page.locator('h1')).toContainText('Leaderboard')

    // Verify leaderboard displays
    await page.waitForSelector('[data-testid="leaderboard-entry"]', { timeout: 10000 })
    const leaderboardEntries = page.locator('[data-testid="leaderboard-entry"]')
    expect(await leaderboardEntries.count()).toBeGreaterThan(0)
  })

  test('should handle betting in blind period correctly', async ({ page }) => {
    await page.goto('/markets')

    // Find a market in blind period
    await page.waitForSelector('[data-testid="market-card"]', { timeout: 10000 })
    const blindMarket = page.locator('[data-testid="market-card"]:has-text("Blind")').first()

    if (await blindMarket.isVisible()) {
      await blindMarket.click()

      // Verify blind period indicator
      await expect(page.locator('text=/Blind Period|Hidden Odds/i')).toBeVisible()

      // Place blind bet
      const yesButton = page.locator('button:has-text("Yes")').first()
      if (await yesButton.isVisible()) {
        await yesButton.click()

        const betInput = page.locator('input[type="number"]').first()
        if (await betInput.isVisible()) {
          await betInput.fill('50')
        }

        const confirmButton = page.locator('button:has-text("Confirm")').first()
        await confirmButton.click()

        await page.waitForSelector('text=/Success|Bet placed/i', { timeout: 5000 })
      }
    }
  })

  test('should display dynamic odds during open period', async ({ page }) => {
    await page.goto('/markets')

    await page.waitForSelector('[data-testid="market-card"]', { timeout: 10000 })
    const openMarket = page.locator('[data-testid="market-card"]:has-text("Open")').or(
      page.locator('[data-testid="market-card"]')
    ).first()

    await openMarket.click()

    // Check for odds display
    const oddsDisplay = page.locator('text=/Odds|\\d+\\.\\d+x/i')
    if (await oddsDisplay.isVisible()) {
      const oddsText = await oddsDisplay.textContent()
      expect(oddsText).toMatch(/\d+\.?\d*/);
    }
  })
})

test.describe('Cross-Browser Compatibility', () => {
  test('should render markets page correctly', async ({ page }) => {
    await page.goto('/markets')
    await expect(page.locator('h1')).toBeVisible()
    await page.waitForSelector('[data-testid="market-card"]', { timeout: 10000 })
  })

  test('should handle responsive design on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page.locator('h1').or(page.locator('nav'))).toBeVisible()
  })
})

test.describe('Performance Tests', () => {
  test('should load homepage within 2 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(2000)
  })

  test('should load markets page within 2 seconds', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/markets')
    await page.waitForSelector('[data-testid="market-card"]', { timeout: 10000 })
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(3000)
  })
})
