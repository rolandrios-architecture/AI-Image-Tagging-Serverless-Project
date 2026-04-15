/* eslint-env node, browser */
/* global Buffer, process */

import { test, expect } from '@playwright/test';

test('Upload image flow', async ({ page, baseURL }) => {
  const url = process.env.FRONT_URL || baseURL || 'http://localhost:5173';

  // Stub the backend upload URL endpoint
  await page.route('**/upload-image', async (route) => {
    const body = {
      success: true,
      data: {
        uploadUrl: 'https://storage.test/upload/sample',
        key: 'images/sample.png',
      },
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  // Stub S3 PUT uploads (two PUT calls in UploadCard)
  await page.route('https://storage.test/**', async (route) => {
    await route.fulfill({ status: 200, body: '' });
  });

  // Stub the image result polling endpoint and return a ready result
  await page.route('**/images/*', async (route) => {
    const json = {
      status: 'done',
      description: 'A small test image',
      tags: ['test', 'sample'],
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
  });

  await page.goto(url);

  // Verify "Upload Image" header is visible
  await expect(page.getByRole('heading', { name: /upload image/i })).toBeVisible();

  // Find the file input and attach an in-memory PNG fixture
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();

  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
  const filePayload = {
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(base64Png, 'base64'),
  };

  await fileInput.setInputFiles(filePayload);

  // Check that upload starts — look for the uploading/processing text
  await expect(page.getByText(/uploading image|analyzing content|uploading|processing/i)).toBeVisible({ timeout: 5000 });

  // Wait for the ResultPanel container (stable marker) then assert content
  const resultContainer = page.locator('.result-container');
  await expect(resultContainer).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('A small test image', { exact: false })).toBeVisible();
  await expect(page.getByText('test', { exact: true })).toBeVisible();
});

test('Uploading an invalid file type shows error and does not call S3', async ({ page, baseURL }) => {
  const url = process.env.FRONT_URL || baseURL || 'http://localhost:5173';

  // stub upload-image to return 400
  await page.route('**/upload-image', async (route) => {
    await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Invalid file type' }) });
  });

  // capture whether S3 PUT is invoked
  let s3Called = false;
  await page.route('https://storage.test/**', async (route) => {
    s3Called = true;
    await route.fulfill({ status: 200, body: '' });
  });

  const consoleMsgs = [];
  page.on('console', (m) => consoleMsgs.push({ type: m.type(), text: m.text() }));

  await page.goto(url);

  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();

  const textPayload = {
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello world', 'utf8'),
  };

  await fileInput.setInputFiles(textPayload);

  // Expect an error logged by the upload handler
  await page.waitForTimeout(500); // allow catch block to run
  const hasUploadError = consoleMsgs.some((m) => /Error uploading image/i.test(m.text));
  expect(hasUploadError).toBe(true);
  expect(s3Called).toBe(false);
});

test('API failure during upload results in error handling', async ({ page, baseURL }) => {
  const url = process.env.FRONT_URL || baseURL || 'http://localhost:5173';

  // Stub upload-image to return 500
  await page.route('**/upload-image', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Server error' }) });
  });

  const consoleMsgs = [];
  page.on('console', (m) => consoleMsgs.push({ type: m.type(), text: m.text() }));

  await page.goto(url);

  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();

  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=';
  const filePayload = {
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(base64Png, 'base64'),
  };

  await fileInput.setInputFiles(filePayload);

  // The upload should fail and the catch block should log an error
  await page.waitForTimeout(500);
  const hasUploadError = consoleMsgs.some((m) => /Error uploading image/i.test(m.text));
  expect(hasUploadError).toBe(true);
  // Also ensure ResultPanel did not appear
  await expect(page.getByText(/description|tags|result/i)).toHaveCount(0);
});

test('Empty upload attempt does nothing', async ({ page, baseURL }) => {
  const url = process.env.FRONT_URL || baseURL || 'http://localhost:5173';

  let uploadCalled = false;
  await page.route('**/upload-image', async (route) => {
    uploadCalled = true;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });

  await page.goto(url);

  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeVisible();

  // Simulate clearing/setting no files
  await fileInput.setInputFiles([]);

  // Wait briefly and ensure no upload API was called
  await page.waitForTimeout(500);
  expect(uploadCalled).toBe(false);
  // Upload heading should still be visible
  await expect(page.getByRole('heading', { name: /upload image/i })).toBeVisible();
});
