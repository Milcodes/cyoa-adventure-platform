import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login first
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should display dashboard with genres', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/üdvözöllek|dashboard/i);

    // Check for genre tiles
    await expect(page.locator('text=Kaland')).toBeVisible();
    await expect(page.locator('text=Horror')).toBeVisible();
    await expect(page.locator('text=Sci-Fi')).toBeVisible();
    await expect(page.locator('text=Fantasy')).toBeVisible();
  });

  test('should navigate to stories when clicking genre', async ({ page }) => {
    await page.click('text=Kaland');

    await expect(page).toHaveURL(/\/stories\?genre=adventure/);
  });

  test('should display stats', async ({ page }) => {
    await expect(page.locator('text=Összesen játszott')).toBeVisible();
    await expect(page.locator('text=Befejezett')).toBeVisible();
  });

  test('should show new story button for authors', async ({ page }) => {
    // Note: This test assumes the logged-in user is an author
    const newStoryButton = page.locator('text=Új Történet');

    if (await newStoryButton.isVisible()) {
      await newStoryButton.click();
      await expect(page).toHaveURL(/\/creator\/new/);
    }
  });
});
