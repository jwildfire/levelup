// Tests for R10: Playwright GM Session (NEW — RED until implemented)
import { test, expect } from '@playwright/test';

test.describe('R10: Playwright GM Session', () => {

  test('R10.1 — gm-session launches browser and navigates to game', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({ gameUrl: 'http://localhost:3001', headless: true });
    try {
      await session.launch();
      const title = await session.page.title();
      expect(title).toBe('Level Up');
    } finally {
      await session.close();
    }
  });

  test('R10.2 — Can read full game state', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({ gameUrl: 'http://localhost:3001', headless: true });
    try {
      await session.launch();
      const state = await session.getGameState();
      expect(state).toBeTruthy();
      expect(state.phase).toBe('menu');
    } finally {
      await session.close();
    }
  });

  test('R10.3 — Can execute arbitrary JS in browser context', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({ gameUrl: 'http://localhost:3001', headless: true });
    try {
      await session.launch();
      const result = await session.evaluate('1 + 2');
      expect(result).toBe(3);
    } finally {
      await session.close();
    }
  });

  test('R10.4 — getGameState returns serializable snapshot', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({ gameUrl: 'http://localhost:3001', headless: true });
    try {
      await session.launch();
      // Select GM and start playing
      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      const state = await session.getGameState();
      expect(state.phase).toBe('playing');
      expect(state.level).toBe(1);
      expect(typeof state.timerRemaining).toBe('number');
      expect(state.gameMaster).toBeTruthy();
      // Should be JSON-serializable (no functions, no circular refs)
      const json = JSON.stringify(state);
      expect(json.length).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });

  test('R10.5 — injectNextLevel sets _nextLevel in browser', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({ gameUrl: 'http://localhost:3001', headless: true });
    try {
      await session.launch();
      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      await session.injectNextLevel({
        world: 'open',
        width: 800,
        height: 400,
        playerPos: { x: 100, y: 200 },
        goalPos: { x: 700, y: 300 },
        playerSpeed: 200,
      });

      const nextLevel = await session.evaluate('window._nextLevel');
      expect(nextLevel).toBeTruthy();
      expect(nextLevel.width).toBe(800);
    } finally {
      await session.close();
    }
  });

  test('R10.6 — injectRuleLive injects rule into running game', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({ gameUrl: 'http://localhost:3001', headless: true });
    try {
      await session.launch();
      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      // Inject rule using code string (since functions can't cross process boundary)
      await session.injectRuleLive({
        id: 'playwright-test-rule',
        name: 'Playwright Test',
        description: 'Injected via Playwright.',
        category: 'modifier',
        difficulty: 1,
        initCode: 'function(gs) { gs.ruleData.playwrightTest = true; }',
        onTickCode: 'function(dt, gs) {}',
      });

      const activeRules = await session.evaluate('window._gs.activeRuleIds');
      expect(activeRules).toContain('playwright-test-rule');
    } finally {
      await session.close();
    }
  });

  test('R10.7 — sendChat calls _chat in browser', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({ gameUrl: 'http://localhost:3001', headless: true });
    try {
      await session.launch();
      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      await session.sendChat('Hello from Playwright', 'Test GM');

      const chatLog = await session.evaluate(
        'window._gs.chatLog.map(c => ({ text: c.text, sender: c.sender }))'
      );
      expect(chatLog.some(c => c.text === 'Hello from Playwright')).toBe(true);
    } finally {
      await session.close();
    }
  });

  test('R10.8 — Can detect game phase changes', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({ gameUrl: 'http://localhost:3001', headless: true });
    try {
      await session.launch();
      let state = await session.getGameState();
      expect(state.phase).toBe('menu');

      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      state = await session.getGameState();
      expect(state.phase).toBe('intro-chat');

      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');
      state = await session.getGameState();
      expect(state.phase).toBe('playing');
    } finally {
      await session.close();
    }
  });
});
