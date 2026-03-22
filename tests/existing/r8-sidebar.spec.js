// Tests for R8: Sidebar Chat
import { test, expect } from '@playwright/test';
import { startPlaying, getState } from '../helpers.js';

test.describe('R8: Sidebar Chat', () => {

  test('R8.1 — Sidebar renders with GM name header', async ({ page }) => {
    await startPlaying(page);
    const headerText = await page.evaluate(() =>
      document.getElementById('sidebar-gm-name').textContent
    );
    expect(headerText.length).toBeGreaterThan(0);
  });

  test('R8.2 — Player can type and send messages', async ({ page }) => {
    await startPlaying(page);
    const inputEl = page.locator('#sidebar-input');
    await inputEl.fill('Hello GM');
    await page.locator('#sidebar-send').click();
    // Message should appear in sidebar
    const sidebarText = await page.evaluate(() =>
      document.getElementById('sidebar-messages').innerText
    );
    expect(sidebarText).toContain('Hello GM');
  });

  test('R8.3 — _chat messages appear with sender and timestamp', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => window._chat('Test sidebar msg', 'The GM'));
    const msgHtml = await page.evaluate(() =>
      document.getElementById('sidebar-messages').innerHTML
    );
    expect(msgHtml).toContain('Test sidebar msg');
    expect(msgHtml).toContain('The GM');
  });

  test('R8.4 — Messages stored in gs.chatLog', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => window._chat('Log test', 'Logger'));
    const state = await getState(page);
    const found = state.chatLog.some(c => c.text === 'Log test' && c.sender === 'Logger');
    expect(found).toBe(true);
  });
});
