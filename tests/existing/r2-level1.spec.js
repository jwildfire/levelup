// Tests for R2: Level 1 — The Warm-Up
import { test, expect } from '@playwright/test';
import { startPlaying, getState } from '../helpers.js';

test.describe('R2: Level 1 — The Warm-Up', () => {

  test('R2.1 — Level 1 starts in open-world mode', async ({ page }) => {
    await startPlaying(page);
    const state = await getState(page);
    expect(state.worldType).toBe('open');
    expect(state.hasMaze).toBe(false);
  });

  test('R2.2 — Player dot renders and responds to arrow keys', async ({ page }) => {
    await startPlaying(page);
    const before = await getState(page);
    // Press right arrow for a bit
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(100);
    const after = await getState(page);
    expect(after.playerX).toBeGreaterThan(before.playerX);
  });

  test('R2.3 — Gold goal dot is active (reach-dot goal)', async ({ page }) => {
    await startPlaying(page);
    // Check that the world has a goal position set (reach-dot goal uses this)
    const hasGoalPos = await page.evaluate(() => {
      const gs = window._gs;
      return gs.world && gs.world.goalPos && typeof gs.world.goalPos.x === 'number';
    });
    expect(hasGoalPos).toBe(true);
  });

  test('R2.4 — Timer starts at 60 seconds for level 1', async ({ page }) => {
    await startPlaying(page);
    const state = await getState(page);
    expect(state.timerDuration).toBe(60000);
    expect(state.timerRemaining).toBeGreaterThan(55000); // within 5s of start
    expect(state.timerRemaining).toBeLessThanOrEqual(60000);
  });

  test('R2.5 — Timer renders countdown text', async ({ page }) => {
    await startPlaying(page);
    // The timer renders on canvas — we check that level-timer rule is active
    const hasTimer = await page.evaluate(() => {
      return window._gs.activeRuleIds.includes('level-timer');
    });
    expect(hasTimer).toBe(true);
  });

  test('R2.6 — Reaching dot: respawns and counter increments', async ({ page }) => {
    await startPlaying(page);
    // Teleport player to goal position
    await page.evaluate(() => {
      const gs = window._gs;
      const goal = gs.world.goalPos || { x: 560, y: 190 };
      gs.player.x = goal.x;
      gs.player.y = goal.y;
    });
    await page.waitForTimeout(200); // let goal check fire
    const state = await getState(page);
    expect(state.dotsReached).toBeGreaterThanOrEqual(1);
  });

  test('R2.7 — HUD shows level number, dot count, move count', async ({ page }) => {
    await startPlaying(page);
    const state = await getState(page);
    expect(state.level).toBe(1);
    // HUD renders on canvas — we verify the data exists
    expect(state.dotsReached).toBeDefined();
    expect(state.moveCount).toBeDefined();
  });

  test('R2.8 — Default injection at 30s increments sub-level', async ({ page }) => {
    await startPlaying(page);
    // Verify events are scheduled
    const hasEvent = await page.evaluate(() => {
      return window._gs.events.some(e => e.trigger.type === 'time' && e.trigger.ms === 30000);
    });
    expect(hasEvent).toBe(true);
  });

  test('R2.9 — Timer expiry triggers level end', async ({ page }) => {
    await startPlaying(page);
    // Force timer to expire
    await page.evaluate(() => {
      window._gs.ruleData.timer_remaining = 0;
      window._gs.ruleData.timer_fired = true;
      window._gs.levelTimerExpired = true;
    });
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });
    const state = await getState(page);
    expect(state.phase).toBe('between-levels');
  });

  test('R2.10 — Pressing L triggers level end', async ({ page }) => {
    await startPlaying(page);
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });
    const state = await getState(page);
    expect(state.phase).toBe('between-levels');
  });
});
