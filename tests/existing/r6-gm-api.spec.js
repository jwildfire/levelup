// Tests for R6: GM API — Mid-Level
import { test, expect } from '@playwright/test';
import { startPlaying, getState } from '../helpers.js';

test.describe('R6: GM API — Mid-Level', () => {

  test('R6.1 — _chat(msg) adds message to sidebar and chat log', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => window._chat('Hello from GM', 'Test GM'));
    const state = await getState(page);
    const found = state.chatLog.some(c => c.text === 'Hello from GM');
    expect(found).toBe(true);

    // Also check sidebar
    const sidebarText = await page.evaluate(() =>
      document.getElementById('sidebar-messages').innerText
    );
    expect(sidebarText).toContain('Hello from GM');
  });

  test('R6.2 — _addEvent time trigger fires after ms elapsed', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => {
      window._testEventFired = false;
      window._addEvent({ type: 'time', ms: 100 }, () => {
        window._testEventFired = true;
      });
    });
    await page.waitForTimeout(500);
    const fired = await page.evaluate(() => window._testEventFired);
    expect(fired).toBe(true);
  });

  test('R6.3 — _addEvent moves trigger fires after N moves', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => {
      window._testMoveEventFired = false;
      window._addEvent({ type: 'moves', count: 1 }, () => {
        window._testMoveEventFired = true;
      });
    });
    // Move the player
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);
    const fired = await page.evaluate(() => window._testMoveEventFired);
    expect(fired).toBe(true);
  });

  test('R6.4 — _clearEvents removes all queued events', async ({ page }) => {
    await startPlaying(page);
    // There should be default events scheduled
    const before = await page.evaluate(() => window._gs.events.length);
    expect(before).toBeGreaterThan(0);
    await page.evaluate(() => window._clearEvents());
    const after = await page.evaluate(() => window._gs.events.length);
    expect(after).toBe(0);
  });

  test('R6.5 — _injectRuleLive registers, activates, and spawns immediately', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => {
      window._injectRuleLive({
        id: 'test-live-rule',
        name: 'Live Test',
        description: 'Testing live injection.',
        category: 'modifier',
        difficulty: 1,
        init(gs) { gs.ruleData.liveTestActive = true; },
        onTick() {},
      });
    });
    const state = await getState(page);
    expect(state.activeRuleIds).toContain('test-live-rule');
    const ruleData = await page.evaluate(() => window._gs.ruleData.liveTestActive);
    expect(ruleData).toBe(true);
  });

  test('R6.6 — _removeRule deactivates a rule', async ({ page }) => {
    await startPlaying(page);
    // Inject then remove
    await page.evaluate(() => {
      window._injectRuleLive({
        id: 'test-remove-rule',
        name: 'Remove Test',
        description: 'Testing removal.',
        category: 'modifier',
        difficulty: 1,
        init() {},
        destroy() {},
        onTick() {},
      });
    });
    let state = await getState(page);
    expect(state.activeRuleIds).toContain('test-remove-rule');

    await page.evaluate(() => window._removeRule('test-remove-rule'));
    state = await getState(page);
    expect(state.activeRuleIds).not.toContain('test-remove-rule');
  });

  test('R6.7 — _extendTimer adds time', async ({ page }) => {
    await startPlaying(page);
    const before = await page.evaluate(() => window._gs.ruleData.timer_remaining);
    await page.evaluate(() => window._extendTimer(10000));
    const after = await page.evaluate(() => window._gs.ruleData.timer_remaining);
    expect(after).toBeGreaterThan(before);
  });

  test('R6.8 — _setTimer sets timer to specific value', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => window._setTimer(42000));
    const remaining = await page.evaluate(() => window._gs.ruleData.timer_remaining);
    expect(remaining).toBe(42000);
  });

  test('R6.9 — _completeLevel forces level end', async ({ page }) => {
    await startPlaying(page);
    await page.evaluate(() => window._completeLevel());
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });
    const state = await getState(page);
    expect(state.phase).toBe('between-levels');
  });

  test('R6.10 — _failLevel restarts current level', async ({ page }) => {
    await startPlaying(page);
    // Move a bit first
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);
    await page.keyboard.up('ArrowRight');

    const beforeX = await page.evaluate(() => window._gs.player.x);

    await page.evaluate(() => window._failLevel('Test fail'));
    await page.waitForTimeout(300);

    const state = await getState(page);
    expect(state.phase).toBe('playing');
    expect(state.level).toBe(1); // still level 1
    // Player should be back at start position
    expect(state.playerX).toBeLessThan(beforeX);
  });
});
