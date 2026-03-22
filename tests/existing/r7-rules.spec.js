// Tests for R7: Rule System
import { test, expect } from '@playwright/test';
import { startPlaying, getState } from '../helpers.js';

test.describe('R7: Rule System', () => {

  test('R7.1 — Rules are registered and accessible', async ({ page }) => {
    await startPlaying(page);
    // level-timer should be registered
    const hasTimer = await page.evaluate(() => {
      return !!window._getRuleById('level-timer');
    });
    expect(hasTimer).toBe(true);
  });

  test('R7.2 — activate calls init and adds to active list', async ({ page }) => {
    await startPlaying(page);
    // level-timer is auto-activated
    const state = await getState(page);
    expect(state.activeRuleIds).toContain('level-timer');
  });

  test('R7.3 — deactivate removes from active list', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => window._removeRule('level-timer'));
    const state = await getState(page);
    expect(state.activeRuleIds).not.toContain('level-timer');
  });

  test('R7.4 — registerInjected persists across level transitions', async ({ page }) => {
    await startPlaying(page);
    // Inject a custom rule
    await page.evaluate(() => {
      window._injectRuleLive({
        id: 'persist-test',
        name: 'Persist Test',
        description: 'Testing persistence.',
        category: 'modifier',
        difficulty: 1,
        init() {},
        onTick() {},
      });
    });
    let state = await getState(page);
    expect(state.activeRuleIds).toContain('persist-test');

    // End level and advance
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });
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

    state = await getState(page);
    expect(state.level).toBe(2);
    expect(state.activeRuleIds).toContain('persist-test');
  });

  test('R7.5 — Rule onTick fires each frame', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => {
      window._testTickCount = 0;
      window._injectRuleLive({
        id: 'tick-test',
        name: 'Tick Test',
        description: 'Counts ticks.',
        category: 'modifier',
        difficulty: 1,
        init() {},
        onTick() { window._testTickCount++; },
      });
    });
    await page.waitForTimeout(200); // ~12 frames at 60fps
    const count = await page.evaluate(() => window._testTickCount);
    expect(count).toBeGreaterThan(0);
  });

  test('R7.6 — onInput can modify player direction', async ({ page }) => {
    await startPlaying(page);
    // Inject a rule that reverses input (right → left)
    await page.evaluate(() => {
      window._testInputModified = false;
      window._injectRuleLive({
        id: 'reverse-input',
        name: 'Reverse Input',
        description: 'Reverses directions.',
        category: 'modifier',
        difficulty: 1,
        init() {},
        onInput(dir, gs) {
          window._testInputModified = true;
          if (dir === 'right') return 'left';
          if (dir === 'left') return 'right';
          return dir;
        },
      });
    });
    // Press right — the onInput hook should fire and modify it
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(100);
    const modified = await page.evaluate(() => window._testInputModified);
    expect(modified).toBe(true);
  });

  test('R7.7 — Game modes (game-replace) are accessible', async ({ page }) => {
    await startPlaying(page);
    const modes = await page.evaluate(() => window._getGameModes());
    expect(modes.length).toBeGreaterThan(0);
    expect(modes.some(m => m.id === 'pong')).toBe(true);
  });
});
