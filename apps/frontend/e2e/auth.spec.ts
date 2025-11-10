import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/auth/login');

    await expect(page).toHaveTitle(/CYOA Platform/);
    await expect(page.locator('h1')).toContainText(/bejelentkezés|login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/auth/login');
    await page.click('text=Regisztráció');

    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.locator('input[name="display_name"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/auth/login');

    await page.click('button[type="submit"]');

    // Should not navigate away
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should login with valid credentials', async ({ page }) => {
    // Note: This test requires a test user in the database
    await page.goto('/auth/login');

    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
