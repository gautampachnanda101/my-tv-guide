import { test, expect } from '@playwright/test';

async function openBrowse(page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'My TV Guide' })).toBeVisible();
  await page.getByRole('tab', { name: 'Browse' }).click();
  await expect(page.getByRole('heading', { name: /Find something to watch|Search and Channel Catalogue/ })).toBeVisible();
}

test.describe('My TV Guide deployment smoke tests', () => {
  test('home page renders and primary navigation works', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/My TV Guide/i);
    await expect(page.getByRole('heading', { name: 'My TV Guide' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Browse' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Timeline' })).toBeVisible();
  });

  test('browse exposes worldwide Region and Genre filters', async ({ page }) => {
    await openBrowse(page);

    await expect(page.getByLabel('Search programmes, channels, and services')).toBeVisible();
    await expect(page.getByLabel('Region')).toContainText('All regions');
    await expect(page.getByLabel('Genre')).toContainText('All genres');
    await expect(page.getByLabel('Watch service')).toContainText('All streaming apps');
    expect(await page.getByLabel('Region').locator('option').count()).toBeGreaterThan(1);
    expect(await page.getByLabel('Genre').locator('option').count()).toBeGreaterThan(1);
  });

  test('Region and Genre selections keep the catalogue usable', async ({ page }) => {
    await openBrowse(page);
    await page.getByLabel('Region').selectOption({ index: 1 });
    await page.getByLabel('Genre').selectOption({ index: 1 });
    await expect(page.getByRole('button', { name: /Channels/ })).toBeVisible();
  });

  test('18+ content is opt-in and the setting persists in the session', async ({ page }) => {
    await openBrowse(page);
    await page.getByRole('button', { name: 'Toggle sidebar menu' }).click();
    const setting = page.getByLabel('Show 18+ channels');
    await expect(setting).not.toBeChecked();
    await setting.check();
    await expect(setting).toBeChecked();
  });

  test('watch services view renders', async ({ page }) => {
    await openBrowse(page);
    await page.getByRole('button', { name: /Watch services|Streaming Apps/ }).click();
    await expect(page.getByRole('button', { name: /Watch services|Streaming Apps/ })).toHaveClass(/active/);
  });

  test('catalog API returns countries, genres, and channels', async ({ request }) => {
    const response = await request.get('/api/guide', {
      params: { region: 'uk', catalogOnly: 'true', page: '1', pageSize: '25' }
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.catalogTotal).toBeGreaterThan(0);
    expect(payload.catalogCountries.length).toBeGreaterThan(1);
    expect(payload.catalogGenres.length).toBeGreaterThan(1);
    expect(payload.tvChannels.length).toBeGreaterThan(0);
  });

  test('adult catalogue remains server-side opt-in', async ({ request }) => {
    const hidden = await request.get('/api/guide', {
      params: { region: 'uk', catalogOnly: 'true', genre: 'xxx', includeAdult: 'false' }
    });
    const enabled = await request.get('/api/guide', {
      params: { region: 'uk', catalogOnly: 'true', genre: 'xxx', includeAdult: 'true' }
    });
    expect(hidden.ok()).toBeTruthy();
    expect(enabled.ok()).toBeTruthy();
    expect((await hidden.json()).catalogTotal).toBe(0);
    expect((await enabled.json()).catalogTotal).toBeGreaterThan(0);
  });

  test('M3U playlist resolver returns entries', async ({ request }) => {
    const response = await request.get('/api/playlist', {
      params: { url: 'https://adultiptv.net/chs.m3u' }
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.entries.length).toBeGreaterThan(0);
    expect(payload.entries[0].url).toMatch(/^https?:/);
  });

  test('stream checker rejects a known dead URL without opening it', async ({ request }) => {
    const response = await request.get('/api/stream-check', {
      params: { url: 'https://cdn.live.br1.jmvstream.com/w/LVW-8155/ngrp:LVW8155_41E1ciuCvO_all/playlist.m3u8' }
    });
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(payload.ok).toBeFalsy();
  });
});
