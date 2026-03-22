/**
 * Playwright GM Session Orchestrator for Level Up.
 *
 * Launches a browser, navigates to the game, and provides methods
 * for the AI to monitor game state and inject content.
 *
 * Optionally starts a WebSocket bridge for real-time chat relay.
 *
 * Usage:
 *   import { GmSession } from './gm-session.js';
 *   const session = new GmSession({
 *     gameUrl: 'http://localhost:3000',
 *     headless: true,
 *     bridgePort: 8765,  // optional: also start bridge
 *   });
 *   await session.launch();
 *   const state = await session.getGameState();
 *   await session.sendChat('Hello!', 'GM');
 *   await session.injectNextLevel({ ... });
 *   await session.close();
 */

import { chromium } from 'playwright';
import { start as startBridge, stop as stopBridge } from './bridge.js';
import { WebSocket } from 'ws';

export class GmSession {
  constructor({ gameUrl = 'http://localhost:3000', headless = true, bridgePort = null } = {}) {
    this.gameUrl = gameUrl;
    this.headless = headless;
    this.bridgePort = bridgePort;
    this.browser = null;
    this.page = null;
    this.bridge = null;
    this.aiWs = null;
    this._eventListeners = new Map();
  }

  async launch() {
    // Start bridge if port specified
    if (this.bridgePort) {
      this.bridge = await startBridge({ port: this.bridgePort });
      // Connect AI WebSocket client to bridge
      this.aiWs = await this._connectAiWs();
    }

    // Launch browser
    this.browser = await chromium.launch({ headless: this.headless });
    const context = await this.browser.newContext({
      viewport: { width: 1024, height: 768 },
    });
    this.page = await context.newPage();

    // Navigate with bridge port if applicable
    const url = this.bridgePort
      ? `${this.gameUrl}?bridge_port=${this.bridgePort}`
      : this.gameUrl;
    await this.page.goto(url);
    await this.page.waitForFunction(() => !!window._gs, { timeout: 5000 });
  }

  async _connectAiWs() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${this.bridgePort}`);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'register', role: 'ai' }));

        // Listen for messages and dispatch to event listeners
        ws.on('message', (data) => {
          let msg;
          try { msg = JSON.parse(data.toString()); } catch { return; }
          const listeners = this._eventListeners.get(msg.type);
          if (listeners) {
            for (const { resolve: res, once } of [...listeners]) {
              res(msg);
              if (once) {
                listeners.splice(listeners.indexOf(listeners.find(l => l.resolve === res)), 1);
              }
            }
          }
        });

        resolve(ws);
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('AI WS connect timeout')), 5000);
    });
  }

  /**
   * Wait for a specific event type from the bridge.
   */
  waitForEvent(type, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for event: ${type}`)), timeout);
      if (!this._eventListeners.has(type)) {
        this._eventListeners.set(type, []);
      }
      this._eventListeners.get(type).push({
        resolve: (msg) => {
          clearTimeout(timer);
          resolve(msg);
        },
        once: true,
      });
    });
  }

  /**
   * Get a serializable snapshot of the game state.
   */
  async getGameState() {
    return this.page.evaluate(() => {
      const gs = window._gs;
      if (!gs) return null;
      return {
        phase: gs.phase,
        level: gs.level,
        subLevel: gs.subLevel,
        worldType: gs.worldType,
        activeRuleIds: [...(gs.activeRuleIds || [])],
        chatLog: (gs.chatLog || []).map(c => ({ text: c.text, sender: c.sender, type: c.type })),
        playerX: gs.player?.x,
        playerY: gs.player?.y,
        moveCount: gs.player?.moveCount,
        dotsReached: gs.ruleData?.dotsReached || 0,
        timerRemaining: gs.ruleData?.timer_remaining,
        timerDuration: gs.ruleData?.timer_duration,
        levelTimerExpired: gs.levelTimerExpired,
        worldWidth: gs.world?.width,
        worldHeight: gs.world?.height,
        hasMaze: !!gs.maze,
        gameMaster: gs.gameMaster ? { id: gs.gameMaster.id, name: gs.gameMaster.name } : null,
      };
    });
  }

  /**
   * Execute arbitrary JS in the browser and return the result.
   * Accepts a string of JS code (expression or statements) or a function.
   */
  async evaluate(expr) {
    if (typeof expr === 'string') {
      // Try as expression first (return value), fall back to statements
      return this.page.evaluate((code) => {
        try {
          return new Function('return (' + code + ')')();
        } catch {
          return new Function(code)();
        }
      }, expr);
    }
    return this.page.evaluate(expr);
  }

  /**
   * Send a chat message via Playwright (direct).
   */
  async sendChat(message, sender) {
    return this.page.evaluate(({ message, sender }) => {
      window._chat(message, sender);
    }, { message, sender });
  }

  /**
   * Send a chat message via the bridge (relayed through WS).
   */
  sendChatViaBridge(message, sender) {
    if (this.aiWs && this.aiWs.readyState === 1) {
      this.aiWs.send(JSON.stringify({ type: 'gm-chat', message, sender }));
    }
  }

  /**
   * Set _nextLevel spec in the browser.
   * The spec is a plain object (no functions). For rules with code,
   * pass them through injectRuleLive separately.
   */
  async injectNextLevel(spec) {
    return this.page.evaluate((spec) => {
      window._nextLevel = spec;
    }, spec);
  }

  /**
   * Inject a rule live into the running game.
   * Rule object can have function code as strings (initCode, onTickCode, etc.)
   * which get deserialized in the browser.
   */
  async injectRuleLive(ruleObj) {
    return this.page.evaluate((raw) => {
      const rule = { ...raw };
      const codeProps = ['init', 'destroy', 'onLevelStart', 'onInput', 'onTick', 'onRender', 'onCollision', 'spawnEntities'];
      for (const prop of codeProps) {
        const codeKey = prop + 'Code';
        if (typeof rule[codeKey] === 'string') {
          try {
            rule[prop] = new Function('return ' + rule[codeKey])();
          } catch (e) {
            console.warn(`Failed to deserialize ${codeKey}:`, e);
          }
          delete rule[codeKey];
        }
      }
      window._injectRuleLive(rule);
    }, ruleObj);
  }

  async close() {
    if (this.aiWs) {
      this.aiWs.close();
      this.aiWs = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    if (this.bridge) {
      await stopBridge(this.bridge);
      this.bridge = null;
    }
  }
}
