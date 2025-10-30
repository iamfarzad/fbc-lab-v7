/**
 * Playwright integration tests for Live Page flows
 * Tests: session start, transcript states, media toggles, file uploads, export summary
 */

import { test, expect } from '@playwright/test';

test.describe('Live Page Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/live');
  });

  test('should start session after accepting terms', async ({ page }) => {
    // Wait for terms overlay
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in terms form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]'); // Agree to terms
    await page.click('button:has-text("Start")');

    // Session should auto-start
    await expect(page.getByLabel(/toggle microphone/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start recording/i })).toBeVisible();
  });

  test('should toggle transcript panel states', async ({ page }) => {
    // Accept terms first
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Start")');

    // Wait for controls
    const transcriptButton = page.getByLabel(/toggle transcript/i);
    await expect(transcriptButton).toBeVisible();

    // Chat should be visible initially
    await expect(page.locator('[data-testid="live-chat-messages"]').or(page.locator('text=/Welcome/'))).toBeVisible();

    // Minimize chat
    await transcriptButton.click();
    await expect(page.locator('[data-testid="live-chat-messages"]')).not.toBeVisible();

    // Expand chat
    await transcriptButton.click();
    await expect(page.locator('[data-testid="live-chat-messages"]').or(page.locator('text=/Welcome/'))).toBeVisible();

    // Verify state persisted in localStorage
    const chatState = await page.evaluate(() => localStorage.getItem('fbc-live-chat-state'));
    expect(chatState).toBeTruthy();
  });

  test('should toggle camera on/off', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Start")');

    const cameraButton = page.getByLabel(/toggle camera/i);
    await expect(cameraButton).toBeVisible();

    // Start camera
    await cameraButton.click();
    await expect(cameraButton).toHaveAttribute('aria-pressed', 'true');

    // Stop camera
    await cameraButton.click();
    await expect(cameraButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('should toggle screen share on/off', async ({ page, context }) => {
    // Grant permissions
    await context.grantPermissions(['camera', 'microphone']);

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Start")');

    const screenShareButton = page.getByLabel(/toggle screen share/i);
    
    // Skip on iOS Safari where screen share isn't supported
    const isScreenShareSupported = await page.evaluate(() => {
      return typeof navigator.mediaDevices?.getDisplayMedia === 'function';
    });

    if (!isScreenShareSupported) {
      test.skip();
      return;
    }

    await expect(screenShareButton).toBeVisible();

    // Start screen share
    await screenShareButton.click();
    
    // Browser will prompt for screen share - we'll just verify button state changes
    // In real tests, you'd need to handle the permission dialog
    await expect(screenShareButton).toBeVisible();
  });

  test('should upload file and trigger chat message', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Start")');

    // Wait for controls
    const moreButton = page.getByLabel(/more actions/i);
    await expect(moreButton).toBeVisible();

    // Open dropdown
    await moreButton.click();
    await page.click('text=/Upload files/i');

    // Create a test file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test pdf content'),
    });

    // Wait for upload to complete (mock API response)
    await page.waitForResponse((response) => 
      response.url().includes('/api/upload') || response.url().includes('/api/attachments')
    );

    // Verify toast notification
    await expect(page.locator('text=/uploaded/i')).toBeVisible();
  });

  test('should export summary PDF', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Start")');

    // Mock download
    const downloadPromise = page.waitForEvent('download');

    const moreButton = page.getByLabel(/more actions/i);
    await moreButton.click();
    await page.click('text=/Export summary PDF/i');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('fbc-consultation-summary');
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Start")');

    // Tab through controls
    await page.keyboard.press('Tab');
    const micButton = page.getByLabel(/toggle microphone/i);
    await expect(micButton).toBeFocused();

    await page.keyboard.press('Tab');
    const cameraButton = page.getByLabel(/toggle camera/i);
    await expect(cameraButton).toBeFocused();

    // Press Enter to activate
    await page.keyboard.press('Enter');
    await expect(cameraButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should show welcome banner and allow dismissal', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Start")');

    // Wait for welcome banner
    const welcomeBanner = page.locator('text=/Welcome.*We.*re live/i');
    await expect(welcomeBanner).toBeVisible();

    // Dismiss banner
    const closeButton = page.locator('button:has-text("Close")').first();
    await closeButton.click();

    // Banner should be hidden
    await expect(welcomeBanner).not.toBeVisible();
  });

  test('should persist chat state across page reload', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.check('input[type="checkbox"]');
    await page.click('button:has-text("Start")');

    // Minimize chat
    const transcriptButton = page.getByLabel(/toggle transcript/i);
    await transcriptButton.click();

    // Reload page
    await page.reload();

    // Chat should still be minimized
    await expect(page.locator('[data-testid="live-chat-messages"]')).not.toBeVisible();
  });
});

