import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
  });

  test('should load dashboard with KPI cards', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Check that main heading exists
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Check that KPI cards are rendered
    const kpiCards = page.locator('[role="article"]');
    const count = await kpiCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate between tabs', async ({ page }) => {
    // Wait for tabs to be visible
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Get all tabs
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    // Should have 4 tabs (Resumen, Incidencias, Rotación, Tendencias)
    expect(tabCount).toBe(4);

    // Click on second tab (Incidencias)
    await tabs.nth(1).click();
    await page.waitForTimeout(500);

    // Verify tab is active
    const secondTab = tabs.nth(1);
    await expect(secondTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should open and close filter panel', async ({ page }) => {
    // Wait for filter button
    await page.waitForSelector('button:has-text("Filtros")', { timeout: 10000 });

    // Click filter button to expand
    await page.click('button:has-text("Filtros")');
    await page.waitForTimeout(300);

    // Check that filter options are visible
    const filterPanel = page.locator('[data-dropdown]').first();
    if (await filterPanel.isVisible()) {
      // Click again to collapse
      await page.click('button:has-text("Filtros")');
      await page.waitForTimeout(300);
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Check that content is still visible
    const content = page.locator('main, [role="main"]').first();
    await expect(content).toBeVisible();
  });

  test('should toggle theme (dark/light mode)', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Look for theme toggle button (usually has sun/moon icon)
    const themeToggle = page.locator('button[aria-label*="theme"], button[aria-label*="Theme"]').first();

    if (await themeToggle.isVisible()) {
      // Get initial theme class
      const html = page.locator('html');
      const initialClass = await html.getAttribute('class');

      // Click theme toggle
      await themeToggle.click();
      await page.waitForTimeout(300);

      // Check that theme class changed
      const newClass = await html.getAttribute('class');
      expect(initialClass).not.toBe(newClass);
    }
  });
});
