/**
 * Browser-side WebSocket bridge client for Level Up GM Loop.
 *
 * Auto-connects to the bridge server and:
 * - Sends game events to AI (player-chat, phase-change, dot-reached)
 * - Receives AI commands (gm-chat, inject-rule, set-next-level) and executes them
 *
 * Loaded by index.html. Reads bridge port from URL param ?bridge_port=8765
 * or defaults to 8765.
 */

(function () {
  const params = new URLSearchParams(window.location.search);
  const port = params.get('bridge_port') || '8765';
  const url = `ws://localhost:${port}`;

  let ws = null;
  let reconnectTimer = null;
  const RECONNECT_DELAY = 2000;

  window._bridgeConnected = false;

  function connect() {
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      window._bridgeConnected = true;
      ws.send(JSON.stringify({ type: 'register', role: 'browser' }));
    };

    ws.onclose = () => {
      window._bridgeConnected = false;
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after this
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      handleAICommand(msg);
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY);
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  // ── Handle AI commands ──────────────────────────────────────────────────────

  function handleAICommand(msg) {
    switch (msg.type) {
      case 'gm-chat':
        if (typeof window._chat === 'function') {
          window._chat(msg.message, msg.sender);
        }
        break;

      case 'inject-rule':
        if (msg.rule && typeof window._injectRuleLive === 'function') {
          const rule = deserializeRule(msg.rule);
          window._injectRuleLive(rule);
        }
        break;

      case 'set-next-level':
        if (msg.spec) {
          // Deserialize any rule objects in injectRules
          if (msg.spec.injectRules) {
            msg.spec.injectRules = msg.spec.injectRules.map(deserializeRule);
          }
          window._nextLevel = msg.spec;
        }
        break;
    }
  }

  /**
   * Deserialize a rule object that may have function code as strings.
   * Properties ending in 'Code' (e.g. initCode, onTickCode) are eval'd
   * and mapped to their hook names (init, onTick).
   */
  function deserializeRule(raw) {
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
    return rule;
  }

  // ── Send game events ──────────────────────────────────────────────────────

  // Watch for phase changes
  let lastPhase = null;
  setInterval(() => {
    const gs = window._gs;
    if (!gs) return;
    if (gs.phase !== lastPhase) {
      lastPhase = gs.phase;
      send({ type: 'phase-change', phase: gs.phase, level: gs.level || 0 });
    }
  }, 100);

  // Watch for dot reached
  let lastDotCount = 0;
  setInterval(() => {
    const gs = window._gs;
    if (!gs || !gs.ruleData) return;
    const count = gs.ruleData.dotsReached || 0;
    if (count > lastDotCount) {
      lastDotCount = count;
      send({ type: 'dot-reached', count });
    }
  }, 100);

  // Watch for player messages by polling window._playerMessages
  let lastPlayerMsgCount = 0;
  setInterval(() => {
    const msgs = window._playerMessages;
    if (!msgs || msgs.length <= lastPlayerMsgCount) return;
    // Send any new messages
    for (let i = lastPlayerMsgCount; i < msgs.length; i++) {
      send({ type: 'player-chat', message: msgs[i].text });
    }
    lastPlayerMsgCount = msgs.length;
  }, 100);

  // Start connection
  connect();
})();
