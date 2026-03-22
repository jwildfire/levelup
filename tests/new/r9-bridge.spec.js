// Tests for R9: WebSocket Bridge (NEW — RED until implemented)
import { test, expect } from '@playwright/test';
import { startPlaying, getState } from '../helpers.js';

// Helper: connect a WS client to the bridge
async function connectWS(port = 8765) {
  const { WebSocket } = await import('ws');
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${port}`);
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('WS connect timeout')), 3000);
  });
}

// Helper: wait for a specific message type from WS
function waitForMessage(ws, type, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === type) {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });
}

test.describe('R9: WebSocket Bridge', () => {

  test('R9.1 — Bridge server starts on configurable port', async () => {
    // Import and start the bridge server
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8765 });
    expect(server).toBeTruthy();
    await bridge.stop(server);
  });

  test('R9.2 — Bridge accepts WebSocket connections', async () => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8766 });
    try {
      const ws = await connectWS(8766);
      expect(ws.readyState).toBe(1); // OPEN
      ws.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R9.3 — Browser client auto-connects on page load', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8767 });
    try {
      await page.goto('/?bridge_port=8767');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      const connected = await page.evaluate(() => window._bridgeConnected);
      expect(connected).toBe(true);
    } finally {
      await bridge.stop(server);
    }
  });

  test('R9.4 — Browser sends player-chat when player sends sidebar message', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8768 });
    try {
      // Connect AI client
      const aiWs = await connectWS(8768);
      aiWs.send(JSON.stringify({ type: 'register', role: 'ai' }));

      await page.goto('/?bridge_port=8768');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });

      // Start playing and send a chat message
      await page.waitForFunction(() => window._gs && window._gs.phase === 'menu', { timeout: 5000 });
      await page.evaluate(() => {
        const options = document.getElementById('overlay').querySelectorAll('.gm-choice');
        options[0].click();
      });
      await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
      await page.evaluate(() => document.getElementById('intro-start').click());
      await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });

      // Send sidebar message
      const msgPromise = waitForMessage(aiWs, 'player-chat');
      await page.locator('#sidebar-input').fill('Hello from test');
      await page.locator('#sidebar-send').click();

      const msg = await msgPromise;
      expect(msg.type).toBe('player-chat');
      expect(msg.message).toBe('Hello from test');

      aiWs.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R9.5 — Browser sends phase-change on game phase transitions', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8769 });
    try {
      const aiWs = await connectWS(8769);
      aiWs.send(JSON.stringify({ type: 'register', role: 'ai' }));

      await page.goto('/?bridge_port=8769');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      await page.waitForFunction(() => window._gs && window._gs.phase === 'menu', { timeout: 5000 });

      const msgPromise = waitForMessage(aiWs, 'phase-change');
      // Select GM → triggers phase change to intro-chat
      await page.evaluate(() => {
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      });

      const msg = await msgPromise;
      expect(msg.type).toBe('phase-change');
      expect(msg.phase).toBe('intro-chat');

      aiWs.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R9.6 — Browser sends dot-reached when dot is reached', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8770 });
    try {
      const aiWs = await connectWS(8770);
      aiWs.send(JSON.stringify({ type: 'register', role: 'ai' }));

      await page.goto('/?bridge_port=8770');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      await page.waitForFunction(() => window._gs && window._gs.phase === 'menu', { timeout: 5000 });
      await page.evaluate(() => {
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      });
      await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
      await page.evaluate(() => document.getElementById('intro-start').click());
      await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });

      const msgPromise = waitForMessage(aiWs, 'dot-reached');
      // Teleport player to goal
      await page.evaluate(() => {
        const gs = window._gs;
        gs.player.x = gs.world.goalPos.x;
        gs.player.y = gs.world.goalPos.y;
      });

      const msg = await msgPromise;
      expect(msg.type).toBe('dot-reached');
      expect(msg.count).toBeGreaterThanOrEqual(1);

      aiWs.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R9.7 — AI sends gm-chat, browser calls _chat()', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8771 });
    try {
      const aiWs = await connectWS(8771);
      aiWs.send(JSON.stringify({ type: 'register', role: 'ai' }));

      await page.goto('/?bridge_port=8771');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      await page.waitForFunction(() => window._gs && window._gs.phase === 'menu', { timeout: 5000 });
      await page.evaluate(() => {
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      });
      await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
      await page.evaluate(() => document.getElementById('intro-start').click());
      await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });

      // AI sends a chat message
      aiWs.send(JSON.stringify({ type: 'gm-chat', message: 'Hello from AI', sender: 'Test GM' }));
      await page.waitForTimeout(500);

      const chatLog = await page.evaluate(() =>
        window._gs.chatLog.map(c => ({ text: c.text, sender: c.sender }))
      );
      expect(chatLog.some(c => c.text === 'Hello from AI')).toBe(true);

      aiWs.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R9.8 — AI sends inject-rule, browser calls _injectRuleLive()', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8772 });
    try {
      const aiWs = await connectWS(8772);
      aiWs.send(JSON.stringify({ type: 'register', role: 'ai' }));

      await page.goto('/?bridge_port=8772');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      await page.waitForFunction(() => window._gs && window._gs.phase === 'menu', { timeout: 5000 });
      await page.evaluate(() => {
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      });
      await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
      await page.evaluate(() => document.getElementById('intro-start').click());
      await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });

      // AI sends rule injection — rule code as a string that gets eval'd in browser
      aiWs.send(JSON.stringify({
        type: 'inject-rule',
        rule: {
          id: 'bridge-test-rule',
          name: 'Bridge Test',
          description: 'Injected via bridge.',
          category: 'modifier',
          difficulty: 1,
          // Functions sent as strings for eval
          initCode: 'function(gs) { gs.ruleData.bridgeTestActive = true; }',
          onTickCode: 'function(dt, gs) {}',
        }
      }));
      await page.waitForTimeout(500);

      const active = await page.evaluate(() => window._gs.activeRuleIds);
      expect(active).toContain('bridge-test-rule');

      aiWs.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R9.9 — AI sends set-next-level, browser sets _nextLevel', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8773 });
    try {
      const aiWs = await connectWS(8773);
      aiWs.send(JSON.stringify({ type: 'register', role: 'ai' }));

      await page.goto('/?bridge_port=8773');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      await page.waitForFunction(() => window._gs && window._gs.phase === 'menu', { timeout: 5000 });
      await page.evaluate(() => {
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      });
      await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
      await page.evaluate(() => document.getElementById('intro-start').click());
      await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });

      aiWs.send(JSON.stringify({
        type: 'set-next-level',
        spec: {
          world: 'open',
          width: 500,
          height: 300,
          playerPos: { x: 250, y: 150 },
          goalPos: { x: 400, y: 250 },
          playerSpeed: 150,
        }
      }));
      await page.waitForTimeout(500);

      const nextLevel = await page.evaluate(() => window._nextLevel);
      expect(nextLevel).toBeTruthy();
      expect(nextLevel.width).toBe(500);

      aiWs.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R9.10 — Browser client reconnects on connection drop', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    let server = await bridge.start({ port: 8774 });
    try {
      await page.goto('/?bridge_port=8774');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });

      // Kill server
      await bridge.stop(server);
      await page.waitForTimeout(500);

      // Restart server
      server = await bridge.start({ port: 8774 });
      // Wait for reconnect
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 10000 });
      const connected = await page.evaluate(() => window._bridgeConnected);
      expect(connected).toBe(true);
    } finally {
      await bridge.stop(server);
    }
  });
});
