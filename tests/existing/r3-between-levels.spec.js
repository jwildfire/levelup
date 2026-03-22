// Tests for R3: Between-Levels Screen
import { test, expect } from '@playwright/test';
import { startPlaying, getState } from '../helpers.js';

async function goToBetweenLevels(page) {
  await startPlaying(page);
  await page.keyboard.press('l');
  await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });
}

test.describe('R3: Between-Levels Screen', () => {

  test('R3.1 — Shows level summary (dots, moves)', async ({ page }) => {
    await goToBetweenLevels(page);
    const overlayText = await page.evaluate(() => document.getElementById('overlay').innerText);
    // Should mention dots and/or moves
    expect(overlayText.toLowerCase()).toMatch(/dot|move|complete/);
  });

  test('R3.2 — Shows recent chat messages', async ({ page }) => {
    await startPlaying(page);
    // Send a chat message first
    await page.evaluate(() => window._chat('Test message from GM', 'Test GM'));
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });
    const overlayText = await page.evaluate(() => document.getElementById('overlay').innerText);
    expect(overlayText).toContain('Test message from GM');
  });

  test('R3.3 — Has a wish/chat input field', async ({ page }) => {
    await goToBetweenLevels(page);
    const hasInput = await page.evaluate(() => {
      const overlay = document.getElementById('overlay');
      return !!overlay.querySelector('input[type="text"], textarea');
    });
    expect(hasInput).toBe(true);
  });

  test('R3.4 — Has an advance button', async ({ page }) => {
    await goToBetweenLevels(page);
    const hasBtn = await page.evaluate(() => {
      const overlay = document.getElementById('overlay');
      const btns = overlay.querySelectorAll('button');
      return Array.from(btns).some(b =>
        b.textContent.includes('Level') || b.textContent.includes('LEVEL') || b.textContent.includes('→')
      );
    });
    expect(hasBtn).toBe(true);
  });

  test('R3.5 — Advancing increments level and starts next level', async ({ page }) => {
    await goToBetweenLevels(page);
    // Click advance button
    await page.evaluate(() => {
      const overlay = document.getElementById('overlay');
      const btns = overlay.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.includes('Level') || btn.textContent.includes('LEVEL') || btn.textContent.includes('→')) {
          btn.click();
          return;
        }
      }
    });
    await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });
    const state = await getState(page);
    expect(state.level).toBe(2);
  });
});
