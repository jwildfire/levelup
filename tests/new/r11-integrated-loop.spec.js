// Tests for R11: Integrated GM Loop (NEW — RED until implemented)
import { test, expect } from '@playwright/test';

test.describe('R11: Integrated GM Loop', () => {

  test('R11.1 — GM session starts bridge and browser together', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8780,
    });
    try {
      await session.launch();
      // Bridge should be running
      expect(session.bridge).toBeTruthy();
      // Browser should be connected to bridge
      await session.page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      const connected = await session.evaluate('window._bridgeConnected');
      expect(connected).toBe(true);
    } finally {
      await session.close();
    }
  });

  test('R11.2 — AI receives notification when Level 1 starts', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8781,
    });
    try {
      await session.launch();
      await session.page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });

      const phasePromise = session.waitForEvent('phase-change');

      // Select GM and start
      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);

      const event = await phasePromise;
      expect(event.phase).toBe('playing');
      expect(event.level).toBe(1);
    } finally {
      await session.close();
    }
  });

  test('R11.3 — AI reads player chat in real-time via bridge', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8782,
    });
    try {
      await session.launch();
      await session.page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });

      // Start playing
      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      const chatPromise = session.waitForEvent('player-chat');

      // Player sends chat
      await session.page.locator('#sidebar-input').fill('I want a puzzle game');
      await session.page.locator('#sidebar-send').click();

      const event = await chatPromise;
      expect(event.message).toBe('I want a puzzle game');
    } finally {
      await session.close();
    }
  });

  test('R11.4 — AI sends chat responses in real-time via bridge', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8783,
    });
    try {
      await session.launch();
      await session.page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });

      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      // Send chat via bridge
      session.sendChatViaBridge('Interesting choice...', 'The GM');
      await session.page.waitForTimeout(500);

      const chatLog = await session.evaluate(
        'window._gs.chatLog.map(c => ({ text: c.text, sender: c.sender }))'
      );
      expect(chatLog.some(c => c.text === 'Interesting choice...')).toBe(true);
    } finally {
      await session.close();
    }
  });

  test('R11.5 — AI sets _nextLevel via Playwright before Level 1 ends', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8784,
    });
    try {
      await session.launch();
      await session.page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });

      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      // AI injects next level while level 1 is playing
      await session.injectNextLevel({
        world: 'open',
        width: 800,
        height: 500,
        playerPos: { x: 400, y: 50 },
        goalPos: { x: 400, y: 450 },
        playerSpeed: 100,
      });

      // Verify it's set
      const nextLevel = await session.evaluate('window._nextLevel');
      expect(nextLevel).toBeTruthy();
      expect(nextLevel.width).toBe(800);

      // End level 1
      await session.evaluate('window._completeLevel()');
      await session.page.waitForFunction(() => window._gs.phase === 'between-levels');

      // _nextLevel should still be set (consumed on advance)
      const stillSet = await session.evaluate('window._nextLevel');
      expect(stillSet).toBeTruthy();
    } finally {
      await session.close();
    }
  });

  test('R11.6 — Level 2 loads GM-built spec after advancing', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8785,
    });
    try {
      await session.launch();
      await session.page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });

      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      // Set next level
      await session.injectNextLevel({
        world: 'open',
        width: 999,
        height: 555,
        playerPos: { x: 100, y: 100 },
        goalPos: { x: 800, y: 400 },
        playerSpeed: 250,
      });

      // End level and advance
      await session.evaluate('window._completeLevel()');
      await session.page.waitForFunction(() => window._gs.phase === 'between-levels');
      await session.evaluate(`
        const btns = document.getElementById('overlay').querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent.includes('Level') || btn.textContent.includes('→')) {
            btn.click();
            break;
          }
        }
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      const state = await session.getGameState();
      expect(state.level).toBe(2);
      expect(state.worldWidth).toBe(999);
      expect(state.worldHeight).toBe(555);
    } finally {
      await session.close();
    }
  });

  test('R11.7 — Loop repeats: AI builds Level 3 during Level 2', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8786,
    });
    try {
      await session.launch();
      await session.page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });

      // Get through to level 1
      await session.evaluate(`
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'intro-chat');
      await session.evaluate(`document.getElementById('intro-start').click()`);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      // Set next level for level 2
      await session.injectNextLevel({
        world: 'open', width: 640, height: 380,
        playerPos: { x: 80, y: 190 }, goalPos: { x: 560, y: 190 }, playerSpeed: 180,
      });

      // Advance to level 2
      await session.evaluate('window._completeLevel()');
      await session.page.waitForFunction(() => window._gs.phase === 'between-levels');
      await session.evaluate(`
        const btns = document.getElementById('overlay').querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent.includes('Level') || btn.textContent.includes('→')) { btn.click(); break; }
        }
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      let state = await session.getGameState();
      expect(state.level).toBe(2);

      // Now during level 2, set next level for level 3
      await session.injectNextLevel({
        world: 'open', width: 1200, height: 600,
        playerPos: { x: 600, y: 50 }, goalPos: { x: 600, y: 550 }, playerSpeed: 300,
      });

      // Advance to level 3
      await session.evaluate('window._completeLevel()');
      await session.page.waitForFunction(() => window._gs.phase === 'between-levels');
      await session.evaluate(`
        const btns = document.getElementById('overlay').querySelectorAll('button');
        for (const btn of btns) {
          if (btn.textContent.includes('Level') || btn.textContent.includes('→')) { btn.click(); break; }
        }
      `);
      await session.page.waitForFunction(() => window._gs.phase === 'playing');

      state = await session.getGameState();
      expect(state.level).toBe(3);
      expect(state.worldWidth).toBe(1200);
    } finally {
      await session.close();
    }
  });
});
