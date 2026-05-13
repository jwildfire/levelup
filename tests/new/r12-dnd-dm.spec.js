// Tests for R12: D&D Dungeon Master Mode (RED until implemented)
import { test, expect } from '@playwright/test';
import { startPlaying, getState, loadGame, selectGM } from '../helpers.js';

// Helper: connect a WS client to the bridge
async function connectWS(port) {
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

test.describe('R12: D&D Dungeon Master Mode', () => {

  // ── Session History & Progressive Complexity ────────────────────────────────

  test('R12.1 — gs.sessionHistory exists and is empty at game start', async ({ page }) => {
    await startPlaying(page);
    const history = await page.evaluate(() => window._gs.sessionHistory);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });

  test('R12.2 — gs.knownMechanics starts with [move, collect]', async ({ page }) => {
    await startPlaying(page);
    const mechanics = await page.evaluate(() => window._gs.knownMechanics);
    expect(Array.isArray(mechanics)).toBe(true);
    expect(mechanics).toContain('move');
    expect(mechanics).toContain('collect');
    expect(mechanics.length).toBe(2);
  });

  test('R12.3 — Level end pushes summary to sessionHistory', async ({ page }) => {
    await startPlaying(page);
    // End level
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });

    const history = await page.evaluate(() => window._gs.sessionHistory);
    expect(history.length).toBe(1);
    expect(history[0].level).toBe(1);
    expect(typeof history[0].dotsReached).toBe('number');
    expect(typeof history[0].moves).toBe('number');
    expect(Array.isArray(history[0].activeRuleIds)).toBe(true);
  });

  test('R12.4 — newMechanics from _nextLevel merge into knownMechanics', async ({ page }) => {
    await startPlaying(page);

    // Set next level with new mechanics
    await page.evaluate(() => {
      window._nextLevel = {
        world: 'open',
        width: 640, height: 380,
        playerPos: { x: 80, y: 190 },
        goalPos: { x: 560, y: 190 },
        playerSpeed: 180,
        newMechanics: ['dodge', 'shoot'],
      };
    });

    // End level and advance
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });
    await page.evaluate(() => {
      const btns = document.getElementById('overlay').querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.includes('Level') || btn.textContent.includes('→')) {
          btn.click();
          break;
        }
      }
    });
    await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });

    const mechanics = await page.evaluate(() => window._gs.knownMechanics);
    expect(mechanics).toContain('move');
    expect(mechanics).toContain('collect');
    expect(mechanics).toContain('dodge');
    expect(mechanics).toContain('shoot');
  });

  // ── DM Questions ────────────────────────────────────────────────────────────

  test('R12.5 — _setDmQuestion renders choice buttons in between-levels', async ({ page }) => {
    await startPlaying(page);
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });

    // Set a DM question
    await page.evaluate(() => {
      window._setDmQuestion('Which path do you choose?', ['The dark forest', 'The crystal caves', 'The sky bridge']);
    });

    // Verify question text and choice buttons rendered
    const questionText = await page.locator('.dm-question-text').textContent();
    expect(questionText).toContain('Which path do you choose?');

    const choices = await page.locator('.dm-choice-btn').count();
    expect(choices).toBe(3);

    const firstChoice = await page.locator('.dm-choice-btn').first().textContent();
    expect(firstChoice).toContain('The dark forest');
  });

  test('R12.6 — Clicking a DM choice stores selection and calls _onPlayerChoice', async ({ page }) => {
    await startPlaying(page);
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });

    // Set up choice handler
    await page.evaluate(() => {
      window._testChoiceReceived = null;
      window._onPlayerChoice = (choice) => {
        window._testChoiceReceived = choice;
      };
      window._setDmQuestion('Pick one:', ['Option A', 'Option B']);
    });

    // Click first choice
    await page.locator('.dm-choice-btn').first().click();

    const stored = await page.evaluate(() => window._gs.lastPlayerChoice);
    expect(stored).toBe('Option A');

    const received = await page.evaluate(() => window._testChoiceReceived);
    expect(received).toBe('Option A');
  });

  test('R12.7 — DM question area is cleared on level advance', async ({ page }) => {
    await startPlaying(page);
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });

    await page.evaluate(() => {
      window._setDmQuestion('Choose:', ['A', 'B']);
    });

    // Verify question exists
    let questionCount = await page.locator('.dm-question-text').count();
    expect(questionCount).toBe(1);

    // Advance to next level
    await page.evaluate(() => {
      const btns = document.getElementById('overlay').querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.includes('Level') || btn.textContent.includes('→')) {
          btn.click();
          break;
        }
      }
    });
    await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });

    // End level again — question should not persist
    await page.keyboard.press('l');
    await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });

    questionCount = await page.locator('.dm-question-text').count();
    expect(questionCount).toBe(0);
  });

  // ── GM Personality Metadata ─────────────────────────────────────────────────

  test('R12.8 — GM personalities include worldTheme and escalationStyle', async ({ page }) => {
    await loadGame(page);

    const gms = await page.evaluate(() => {
      // Access via the screens module — the GM list is exposed through the menu
      const overlay = document.getElementById('overlay');
      const choices = overlay.querySelectorAll('.gm-choice');
      return choices.length;
    });
    expect(gms).toBe(6);

    // Select first GM and check metadata
    await selectGM(page, 0);
    const gm = await page.evaluate(() => window._gs.gameMaster);
    expect(gm.worldTheme).toBeTruthy();
    expect(typeof gm.worldTheme).toBe('string');
    expect(gm.escalationStyle).toBeTruthy();
    expect(typeof gm.escalationStyle).toBe('string');
  });

  test('R12.9 — GM personalities include levelOneNarrative', async ({ page }) => {
    await loadGame(page);
    await selectGM(page, 0);
    const gm = await page.evaluate(() => window._gs.gameMaster);
    expect(gm.levelOneNarrative).toBeTruthy();
    expect(typeof gm.levelOneNarrative).toBe('string');
  });

  // ── Bridge & GmSession Integration ──────────────────────────────────────────

  test('R12.10 — Bridge dm-question command renders choices in browser', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8790 });
    try {
      const aiWs = await connectWS(8790);
      aiWs.send(JSON.stringify({ type: 'register', role: 'ai' }));

      await page.goto('/?bridge_port=8790');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      await page.waitForFunction(() => window._gs && window._gs.phase === 'menu', { timeout: 5000 });

      // Get to between-levels
      await page.evaluate(() => {
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      });
      await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
      await page.evaluate(() => document.getElementById('intro-start').click());
      await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });
      await page.keyboard.press('l');
      await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });

      // AI sends dm-question via bridge
      aiWs.send(JSON.stringify({
        type: 'dm-question',
        question: 'What awaits you next?',
        choices: ['A dragon', 'A puzzle', 'A race'],
      }));
      await page.waitForTimeout(500);

      const questionText = await page.locator('.dm-question-text').textContent();
      expect(questionText).toContain('What awaits you next?');

      const choiceCount = await page.locator('.dm-choice-btn').count();
      expect(choiceCount).toBe(3);

      aiWs.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R12.11 — Bridge sends player-choice when player clicks DM choice', async ({ page }) => {
    const bridge = await import('../../tools/bridge.js');
    const server = await bridge.start({ port: 8791 });
    try {
      const aiWs = await connectWS(8791);
      aiWs.send(JSON.stringify({ type: 'register', role: 'ai' }));

      await page.goto('/?bridge_port=8791');
      await page.waitForFunction(() => window._bridgeConnected === true, { timeout: 5000 });
      await page.waitForFunction(() => window._gs && window._gs.phase === 'menu', { timeout: 5000 });

      // Get to between-levels
      await page.evaluate(() => {
        document.getElementById('overlay').querySelectorAll('.gm-choice')[0].click();
      });
      await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
      await page.evaluate(() => document.getElementById('intro-start').click());
      await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });
      await page.keyboard.press('l');
      await page.waitForFunction(() => window._gs.phase === 'between-levels', { timeout: 3000 });

      // Set DM question
      await page.evaluate(() => {
        window._setDmQuestion('Choose your fate:', ['Fire realm', 'Ice realm']);
      });

      // Listen for player-choice event
      const choicePromise = waitForMessage(aiWs, 'player-choice');

      // Click the first choice
      await page.locator('.dm-choice-btn').first().click();

      const msg = await choicePromise;
      expect(msg.type).toBe('player-choice');
      expect(msg.choice).toBe('Fire realm');

      aiWs.close();
    } finally {
      await bridge.stop(server);
    }
  });

  test('R12.12 — getGameState includes sessionHistory and knownMechanics', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8792,
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

      const state = await session.getGameState();
      expect(state.sessionHistory).toBeDefined();
      expect(Array.isArray(state.sessionHistory)).toBe(true);
      expect(state.knownMechanics).toBeDefined();
      expect(state.knownMechanics).toContain('move');
      expect(state.knownMechanics).toContain('collect');
    } finally {
      await session.close();
    }
  });

  test('R12.13 — GmSession.getSessionHistory() returns session history', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8793,
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

      const history = await session.getSessionHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);

      // End level
      await session.evaluate('window._completeLevel()');
      await session.page.waitForFunction(() => window._gs.phase === 'between-levels');

      const historyAfter = await session.getSessionHistory();
      expect(historyAfter.length).toBe(1);
      expect(historyAfter[0].level).toBe(1);
    } finally {
      await session.close();
    }
  });

  test('R12.14 — GmSession.getKnownMechanics() returns known mechanics', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8794,
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

      const mechanics = await session.getKnownMechanics();
      expect(mechanics).toContain('move');
      expect(mechanics).toContain('collect');
    } finally {
      await session.close();
    }
  });

  test('R12.15 — GmSession.setDmQuestion() sends via bridge', async () => {
    const { GmSession } = await import('../../tools/gm-session.js');
    const session = new GmSession({
      gameUrl: 'http://localhost:3001',
      headless: true,
      bridgePort: 8795,
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

      // End level to get to between-levels
      await session.evaluate('window._completeLevel()');
      await session.page.waitForFunction(() => window._gs.phase === 'between-levels');

      // Send DM question via GmSession
      session.setDmQuestion('What do you seek?', ['Glory', 'Treasure', 'Knowledge']);
      await session.page.waitForTimeout(500);

      // Verify it rendered in browser
      const questionText = await session.evaluate(
        'document.querySelector(".dm-question-text")?.textContent'
      );
      expect(questionText).toContain('What do you seek?');

      const choiceCount = await session.evaluate(
        'document.querySelectorAll(".dm-choice-btn").length'
      );
      expect(choiceCount).toBe(3);
    } finally {
      await session.close();
    }
  });
});
