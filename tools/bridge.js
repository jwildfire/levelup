/**
 * WebSocket Bridge Server for Level Up GM Loop.
 *
 * Relays messages between browser game clients and AI clients.
 * Browser clients send game events (player-chat, phase-change, dot-reached).
 * AI clients send commands (gm-chat, inject-rule, set-next-level).
 *
 * Usage:
 *   import { start, stop } from './bridge.js';
 *   const server = await start({ port: 8765 });
 *   // ... later ...
 *   await stop(server);
 */

import { WebSocketServer } from 'ws';

export function start({ port = 8765 } = {}) {
  return new Promise((resolve, reject) => {
    const wss = new WebSocketServer({ port }, () => {
      resolve(wss);
    });

    wss.on('error', reject);

    const clients = { browser: new Set(), ai: new Set() };

    wss.on('connection', (ws) => {
      let role = null;

      ws.on('message', (data) => {
        let msg;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }

        // Registration
        if (msg.type === 'register') {
          role = msg.role; // 'browser' or 'ai'
          if (role === 'browser') clients.browser.add(ws);
          if (role === 'ai') clients.ai.add(ws);
          return;
        }

        // Route messages based on source role
        if (role === 'browser') {
          // Forward browser events to all AI clients
          for (const ai of clients.ai) {
            if (ai.readyState === 1) ai.send(JSON.stringify(msg));
          }
        } else if (role === 'ai') {
          // Forward AI commands to all browser clients
          for (const browser of clients.browser) {
            if (browser.readyState === 1) browser.send(JSON.stringify(msg));
          }
        }
      });

      ws.on('close', () => {
        if (role === 'browser') clients.browser.delete(ws);
        if (role === 'ai') clients.ai.delete(ws);
      });
    });
  });
}

export function stop(wss) {
  return new Promise((resolve) => {
    if (!wss) { resolve(); return; }
    // Close all connections
    for (const client of wss.clients) {
      client.close();
    }
    wss.close(() => resolve());
  });
}
