#!/usr/bin/env node
/**
 * DM Play Session Launcher
 * Starts bridge, opens visible browser, connects AI client.
 * The AI (Claude Code) interacts via stdin/stdout JSON messages.
 */
import { start as startBridge, stop as stopBridge } from './tools/bridge.js';
import { WebSocket } from 'ws';
import { chromium } from 'playwright';

const BRIDGE_PORT = 8765;
const GAME_URL = 'http://localhost:3000';

async function main() {
  // 1. Start bridge
  const bridge = await startBridge({ port: BRIDGE_PORT });
  console.log(JSON.stringify({ event: 'bridge-started', port: BRIDGE_PORT }));

  // 2. Connect AI WebSocket
  const aiWs = await new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${BRIDGE_PORT}`);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'register', role: 'ai' }));
      resolve(ws);
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('AI WS timeout')), 5000);
  });
  console.log(JSON.stringify({ event: 'ai-connected' }));

  // 3. Launch visible browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(`${GAME_URL}?bridge_port=${BRIDGE_PORT}`);
  console.log(JSON.stringify({ event: 'browser-launched', url: `${GAME_URL}?bridge_port=${BRIDGE_PORT}` }));

  // 4. Forward all bridge messages to stdout as JSON
  aiWs.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log(JSON.stringify({ event: 'bridge-msg', ...msg }));
    } catch {}
  });

  // 5. Read commands from stdin
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const cmd = JSON.parse(line);
        aiWs.send(JSON.stringify(cmd));
      } catch (e) {
        console.log(JSON.stringify({ event: 'error', message: 'Invalid JSON: ' + e.message }));
      }
    }
  });

  // 6. Handle shutdown
  async function shutdown() {
    aiWs.close();
    await browser.close();
    await stopBridge(bridge);
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep alive
  setInterval(() => {}, 60000);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
