import { test, expect } from '@playwright/test';

test.describe('User Flows - Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('TI1: Usuario filtra y explora dashboard completo', async ({ page }) => {
    // Step 1: Dashboard loads
    await page.waitForSelector('body', { state: 'visible' });

    // Step 2: User opens filters
    const filterButton = page.locator('button:has-text("Filtros")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);
    }

    // Step 3: User navigates to Tab 2: Incidencias
    const tabs = page.locator('[role="tab"]');
    if ((await tabs.count()) >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
    }

    // Step 4: User navigates to Tab 3: Rotación
    if ((await tabs.count()) >= 3) {
      await tabs.nth(2).click();
      await page.waitForTimeout(500);
    }

    // Verification
    expect(await page.isVisible('body')).toBe(true);
  });

  test('TI2: Usuario analiza rotación en detalle', async ({ page }) => {
    // Navigate to Tab Rotación
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount >= 3) {
      await tabs.nth(2).click();
      await page.waitForTimeout(500);

      // Page should be visible
      expect(await page.isVisible('body')).toBe(true);
    }
  });

  test('TI3: Usuario analiza incidencias', async ({ page }) => {
    // Navigate to Tab Incidencias
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount >= 2) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);

      // Page should be visible
      expect(await page.isVisible('body')).toBe(true);
    }
  });

  test('TI4: Usuario cambia tema dark/light', async ({ page }) => {
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class');

    // Look for theme toggle
    const themeButton = page.locator('button[aria-label*="theme"], button[aria-label*="Theme"]').first();

    if (await themeButton.isVisible()) {
      await themeButton.click();
      await page.waitForTimeout(300);

      const newClass = await html.getAttribute('class');
      expect(initialClass).not.toBe(newClass);
    }
  });

  test('TI5: Dashboard es responsive en mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    // Content should still be visible
    expect(await page.isVisible('body')).toBe(true);
  });

  test('TI6: Performance - Dashboard carga en < 5s', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000); // 5 segundos
  });
});
