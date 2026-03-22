// Tests for R4: Level 2+ — GM-Built Levels
import { test, expect } from '@playwright/test';
import { startPlaying, getState } from '../helpers.js';

async function advanceToLevel2(page, nextLevelSpec = null) {
  await startPlaying(page);
  if (nextLevelSpec) {
    await page.evaluate((spec) => { window._nextLevel = spec; }, nextLevelSpec);
  }
  await page.keyboard.press('l');
  await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });
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
}

test.describe('R4: Level 2+ — GM-Built Levels', () => {

  test('R4.1 — _nextLevel set before level end is used for next level', async ({ page }) => {
    const customSpec = {
      world: 'open',
      width: 400,
      height: 300,
      playerPos: { x: 200, y: 150 },
      goalPos: { x: 350, y: 250 },
      playerSpeed: 100,
    };
    await advanceToLevel2(page, customSpec);
    const state = await getState(page);
    expect(state.level).toBe(2);
    expect(state.worldWidth).toBe(400);
    expect(state.worldHeight).toBe(300);
  });

  test('R4.2 — _nextLevel.injectRules activates rules at level start', async ({ page }) => {
    await startPlaying(page);
    // Set _nextLevel with injectRules inside browser context (functions can't be serialized)
    await page.evaluate(() => {
      window._nextLevel = {
        world: 'open',
        width: 640,
        height: 380,
        playerPos: { x: 80, y: 190 },
        goalPos: { x: 560, y: 190 },
        playerSpeed: 180,
        injectRules: [{
          id: 'test-injected-rule',
          name: 'Test Rule',
          description: 'A test rule.',
          category: 'modifier',
          difficulty: 1,
          init() {},
          onTick() {},
        }],
      };
    });
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
    const state = await getState(page);
    expect(state.activeRuleIds).toContain('test-injected-rule');
  });

  test('R4.3 — Level 2+ timer is 120 seconds', async ({ page }) => {
    await advanceToLevel2(page);
    const state = await getState(page);
    expect(state.timerDuration).toBe(120000);
  });

  test('R4.4 — Default injection schedule: 3 injections for level 2+', async ({ page }) => {
    await advanceToLevel2(page);
    const eventCount = await page.evaluate(() => {
      return window._gs.events.filter(e => e.trigger.type === 'time').length;
    });
    // Should have up to 3 time-based events (may be fewer if rules are already active)
    expect(eventCount).toBeGreaterThanOrEqual(1);
    expect(eventCount).toBeLessThanOrEqual(3);
  });
});
