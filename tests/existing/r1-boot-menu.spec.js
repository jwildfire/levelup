// Tests for R1: Game Boot & Menu
import { test, expect } from '@playwright/test';
import { loadGame, selectGM, getState } from '../helpers.js';

test.describe('R1: Game Boot & Menu', () => {

  test('R1.1 — Page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test('R1.2 — Menu screen shows 6 GM personality options', async ({ page }) => {
    await loadGame(page);
    const count = await page.evaluate(() => {
      const overlay = document.getElementById('overlay');
      return overlay.querySelectorAll('.gm-choice').length;
    });
    expect(count).toBe(6);
  });

  test('R1.3 — Clicking a GM reveals the Begin button', async ({ page }) => {
    await loadGame(page);
    // Click first GM
    await page.evaluate(() => {
      const overlay = document.getElementById('overlay');
      const options = overlay.querySelectorAll('.gm-choice');
      options[0].click();
    });
    // Should transition to intro-chat
    await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
    const phase = await page.evaluate(() => window._gs.phase);
    expect(phase).toBe('intro-chat');
  });

  test('R1.4 — Intro chat screen shows GM welcome message', async ({ page }) => {
    await loadGame(page);
    await selectGM(page, 0);
    // Check overlay has text content (GM's welcome)
    const hasWelcome = await page.evaluate(() => {
      const overlay = document.getElementById('overlay');
      return overlay.innerText.length > 20; // GM welcome is substantial
    });
    expect(hasWelcome).toBe(true);
  });

  test('R1.5 — Intro chat has text input and Start Level 1 button', async ({ page }) => {
    await loadGame(page);
    await selectGM(page, 0);
    const hasInput = await page.evaluate(() => {
      return !!document.getElementById('intro-input');
    });
    const hasStartBtn = await page.evaluate(() => {
      return !!document.getElementById('intro-start');
    });
    expect(hasInput).toBe(true);
    expect(hasStartBtn).toBe(true);
  });
});
