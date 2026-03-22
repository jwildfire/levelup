const overlay = document.getElementById('overlay');

// ── Helpers ──────────────────────────────────────────────────────────────────

export function show(html) {
  overlay.innerHTML = html;
  overlay.classList.remove('hidden');
}

export function hide() {
  overlay.classList.add('hidden');
  overlay.innerHTML = '';
}

export function isVisible() {
  return !overlay.classList.contains('hidden');
}

// ── Game Master Personalities ─────────────────────────────────────────────────

const gameMasters = [
  {
    id: 'monkeys-paw',
    name: "The Monkey's Paw",
    emoji: '🐒',
    tagline: 'Grants your wishes... technically.',
    style: 'Interprets every wish in the worst, most literal, most chaotic way possible. Maliciously compliant. Finds loopholes in everything.',
    color: '#aa88ff',
    welcome: "Ah. A visitor. I sense a wish forming. Speak carefully — I have a talent for granting exactly what you ask for, and nothing more.",
    followUp: ["I see. I'll grant that. In my own way.", "Interesting choice of words. I'll remember that.", "Noted. The paw curls."],
  },
  {
    id: 'chaotic-fairy',
    name: 'Chaotic Fairy Godmother',
    emoji: '🧚',
    tagline: 'Bibbidi-bobbidi-whoops.',
    style: 'Enthusiastically tries to help but is wildly incompetent. Everything is sparkly and over-the-top.',
    color: '#ff88dd',
    welcome: "OH MY GOSH YOU'RE HERE!! I've been waiting SO LONG!! I'm ready!! Are you ready?! Tell me what you want and I'll make it happen!! (probably!!)",
    followUp: ["YES! PERFECT! Let's GO!", "Oooh I love it!! I'll add some extra glitter too!", "Amazing!! Bibbidi-bobbidi-LET'S DO THIS!!"],
  },
  {
    id: 'passive-aggressive',
    name: 'Passive Aggressive Assistant',
    emoji: '🙂',
    tagline: "No, it's fine. Really.",
    style: "Technically does what you ask but makes it clear they think it's a bad idea. Adds helpful features nobody asked for.",
    color: '#88ccff',
    welcome: "Oh. You're here. That's... great. I prepared everything. Not that you asked. What do you want. I'll do it. It's fine.",
    followUp: ["Sure. I'll incorporate that. Somehow.", "Per your request. Not my first choice but okay.", "Great. Very helpful. I'll figure it out."],
  },
  {
    id: 'evil-dm',
    name: 'Evil Dungeon Master',
    emoji: '🐉',
    tagline: "Roll for initiative. You won't survive.",
    style: 'Everything is dramatic and dire. Narrates in fantasy prose. Treats the game like a deadly dungeon.',
    color: '#ff4444',
    welcome: "Adventurer. You dare enter my domain? Many have tried. None have survived. Tell me — what foolish wish brings you to this place of certain doom?",
    followUp: ["Your fate is sealed. The dungeon awaits.", "So be it. I have prepared... appropriately.", "Brave words. Foolish, but brave."],
  },
  {
    id: 'game-show-host',
    name: 'Unhinged Game Show Host',
    emoji: '🎤',
    tagline: 'COME ON DOWN!',
    style: 'Treats everything like a fever-dream game show. Overly excited. Adds timers, scores, bonus rounds.',
    color: '#ffdd00',
    welcome: "WELCOME CONTESTANT!! Are you ready for the GREATEST GAME OF YOUR LIFE?! What's your strategy?! What do you WANT?! Tell me EVERYTHING!!",
    followUp: ["FANTASTIC! The audience goes WILD!", "YES!! THAT'S WHAT WE LIKE TO HEAR!!", "INCREDIBLE!! SPIN THE WHEEL!!"],
  },
  {
    id: 'game-dev',
    name: 'Game Developer',
    emoji: '🛠️',
    tagline: 'Your wish is my spec.',
    style: "Implements the player's wish as faithfully and literally as possible. No tricks. Just solid game development.",
    color: '#44ff88',
    welcome: "Hey. Welcome. Tell me what kind of game you want and I'll build it. Or just hit Start and I'll figure something out based on defaults.",
    followUp: ["Got it. Logging the request.", "Understood. I'll implement that.", "Makes sense. I'll spec it out."],
  },
];

export function getGameMasters() {
  return gameMasters;
}

// ── Menu ──────────────────────────────────────────────────────────────────────

export function showMenu(gameState, onGmSelected) {
  const gmOptions = gameMasters.map((gm, i) => `
    <div class="gm-choice" data-idx="${i}" style="border-color: ${gm.color}40;">
      <div class="gm-header">
        <span class="gm-emoji">${gm.emoji}</span>
        <span class="gm-name" style="color: ${gm.color};">${gm.name}</span>
      </div>
      <div class="gm-tagline">${gm.tagline}</div>
    </div>
  `).join('');

  show(`
    <div class="overlay-title">Level Up</div>
    <div class="overlay-subtitle">A game that changes every time you play</div>
    <div class="overlay-text" style="color: #888; margin-bottom: 0.5rem;">Choose your Game Master</div>
    <div class="gm-list">${gmOptions}</div>
  `);

  const gmEls = overlay.querySelectorAll('.gm-choice');
  gmEls.forEach((el) => {
    el.addEventListener('click', () => {
      const gm = gameMasters[parseInt(el.dataset.idx)];
      onGmSelected(gm);
    });
  });
}

// ── Intro Chat ────────────────────────────────────────────────────────────────
// GM speaks first. Player can respond. Start Level 1 button always available.

export function showIntroChat(gm, onStart) {
  show(`
    <div class="overlay-title" style="font-size: 1rem; letter-spacing: 0.25em; margin-bottom: 1.2rem;">LEVEL UP</div>
    <div class="chat-panel">
      <div class="chat-panel-gm-header" style="color: ${gm.color};">
        <span>${gm.emoji}</span> <span>${gm.name}</span>
      </div>
      <div class="chat-log" id="intro-log">
        <div class="chat-msg gm-msg">
          <span class="msg-sender">${gm.name}</span>
          <span class="msg-text">${gm.welcome}</span>
        </div>
      </div>
      <div class="chat-input-row" style="margin-top: 0.6rem;">
        <input type="text" id="intro-input" placeholder="Say something (optional)..." autocomplete="off" />
        <button id="intro-send">→</button>
      </div>
    </div>
    <button id="intro-start" class="overlay-start-btn" style="margin-top: 1.2rem;">
      Start Level 1 →
    </button>
    <div class="overlay-text" style="color: #333; font-size: 0.7rem; margin-top: 0.6rem;">Arrow keys or WASD to move &nbsp;·&nbsp; L to skip to chat between levels</div>
  `);

  const log = document.getElementById('intro-log');
  const inputEl = document.getElementById('intro-input');
  let responding = false;

  function addMsg(text, cls, sender) {
    const d = document.createElement('div');
    d.className = `chat-msg ${cls}`;
    d.innerHTML = `<span class="msg-sender">${sender}</span><span class="msg-text">${text}</span>`;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function sendPlayerMsg() {
    const msg = inputEl.value.trim();
    if (!msg || responding) return;
    responding = true;
    inputEl.value = '';
    addMsg(msg, 'player-msg', 'You');

    // Store for AI to read
    window._introMessage = msg;

    // GM follow-up (canned, or overridden by AI via window._respondToPlayer)
    setTimeout(() => {
      if (typeof window._respondToPlayer === 'function') {
        window._respondToPlayer(msg, (response) => {
          addMsg(response, 'gm-msg', gm.name);
          responding = false;
        });
      } else {
        const replies = gm.followUp || ["Got it."];
        addMsg(replies[Math.floor(Math.random() * replies.length)], 'gm-msg', gm.name);
        responding = false;
      }
    }, 700 + Math.random() * 400);
  }

  document.getElementById('intro-send').addEventListener('click', sendPlayerMsg);
  inputEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') sendPlayerMsg();
  });

  document.getElementById('intro-start').addEventListener('click', () => {
    const msg = inputEl.value.trim() || window._introMessage || '';
    window._introMessage = msg;
    onStart(msg);
  });
}

// ── Between Levels ────────────────────────────────────────────────────────────
// Shown when timer fires. Chat + wish input + next level button.
// onWish(text) — player makes a wish (triggers AI injection flow)
// onNext()     — start next level

export function showBetweenLevels(gs, gm, onWish, onNext) {
  const dots = gs.ruleData.dotsReached || 0;
  const moves = gs.player ? gs.player.moveCount : 0;

  // Show recent GM messages from this level
  const levelStart = gs.levelStartTime || 0;
  const recentMsgs = (gs.chatLog || [])
    .filter(m => m.ts >= levelStart)
    .slice(-6);

  const msgHtml = recentMsgs.map(m => `
    <div class="chat-msg ${m.type === 'player' ? 'player-msg' : 'gm-msg'}">
      <span class="msg-sender">${m.sender}</span>
      <span class="msg-text">${m.text}</span>
    </div>
  `).join('');

  const levelLabel = gs.subLevel > 0
    ? `${gs.level}.${gs.subLevel}`
    : `${gs.level}`;

  show(`
    <div class="between-header">
      <div class="between-level-num">LEVEL ${levelLabel} COMPLETE</div>
      <div class="between-stats">
        <span class="stat-chip">⬤ ${dots} dot${dots !== 1 ? 's' : ''}</span>
        <span class="stat-chip">↔ ${moves} moves</span>
      </div>
    </div>
    <div class="chat-panel" style="margin-top: 1rem;">
      <div class="chat-panel-gm-header" style="color: ${gm ? gm.color : '#00ff88'};">
        <span>${gm ? gm.emoji : '🎮'}</span>
        <span>${gm ? gm.name : 'Game Master'}</span>
      </div>
      <div class="chat-log" id="between-log">
        ${msgHtml || `<div class="chat-msg gm-msg"><span class="msg-sender">${gm ? gm.name : 'Game'}</span><span class="msg-text" style="color:#555;">Building next level...</span></div>`}
      </div>
      <div class="chat-input-row" style="margin-top: 0.6rem;">
        <input type="text" id="between-input" placeholder="Make a wish for next level..." autocomplete="off" />
        <button id="between-send">Wish</button>
      </div>
    </div>
    <button id="between-next" class="overlay-start-btn" style="margin-top: 1.2rem;">
      Level ${gs.level + 1} → &nbsp;<span style="font-size:0.75em; opacity:0.6;">(or press L)</span>
    </button>
  `);

  const log = document.getElementById('between-log');
  log.scrollTop = log.scrollHeight;

  const inputEl = document.getElementById('between-input');
  setTimeout(() => inputEl.focus(), 100);

  function submitWish() {
    const msg = inputEl.value.trim();
    if (!msg) return;
    inputEl.value = '';
    // Add player message to log
    const d = document.createElement('div');
    d.className = 'chat-msg player-msg';
    d.innerHTML = `<span class="msg-sender">You</span><span class="msg-text">${msg}</span>`;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    onWish(msg);
  }

  document.getElementById('between-send').addEventListener('click', submitWish);
  inputEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') submitWish();
  });

  function goNext() {
    window.removeEventListener('keydown', lKey);
    onNext();
  }

  document.getElementById('between-next').addEventListener('click', goNext);

  function lKey(e) {
    if ((e.key === 'l' || e.key === 'L') && document.activeElement !== inputEl) {
      goNext();
    }
  }
  window.addEventListener('keydown', lKey);

  // Expose so GM can add messages during this screen
  window._addBetweenMsg = function(text, sender, type = 'gm') {
    const d = document.createElement('div');
    d.className = `chat-msg ${type === 'player' ? 'player-msg' : 'gm-msg'}`;
    d.innerHTML = `<span class="msg-sender">${sender}</span><span class="msg-text">${text}</span>`;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  };
}

// ── Generating ────────────────────────────────────────────────────────────────

const gmGeneratingText = {
  'monkeys-paw': "The monkey's paw curls...",
  'chaotic-fairy': "Bibbidi-bobbidi-let's see what happens...",
  'passive-aggressive': "Fine. I'll do it. Not like I had anything else going on.",
  'evil-dm': "The ancient runes begin to glow with terrible purpose...",
  'game-show-host': "THE WISH-O-METER IS SPINNING, FOLKS!",
  'game-dev': "Parsing feature request... writing spec...",
};

export function showGenerating(prompt, gameMaster) {
  const gmId = gameMaster ? gameMaster.id : 'monkeys-paw';
  const gmColor = gameMaster ? gameMaster.color : '#aa88ff';
  const text = gmGeneratingText[gmId] || gmGeneratingText['monkeys-paw'];

  show(`
    <div class="overlay-title">Granting Your Wish...</div>
    <div class="overlay-subtitle" style="color: ${gmColor};">"${prompt}"</div>
    <div class="overlay-text generating-dots" style="color: ${gmColor};">${text}</div>
    <div class="overlay-text" style="color: #555; font-size: 0.75rem; margin-top: 1rem;">
      (Generating rule with AI... this may take a moment)
    </div>
  `);
}

export function showGenerateError(message, onRetry, onFallback) {
  show(`
    <div class="overlay-title" style="color: #ff4444;">Wish Failed</div>
    <div class="overlay-text">${message}</div>
    <div class="btn-row">
      <button class="save-trash-btn save" id="btn-retry">Try Again</button>
      <button class="save-trash-btn skip" id="btn-fallback">Skip to Next Level</button>
    </div>
  `);

  document.getElementById('btn-retry').addEventListener('click', onRetry);
  document.getElementById('btn-fallback').addEventListener('click', onFallback);
}

export function showSaveTrash(ruleId, ruleName, onSave, onTrash, onSkip) {
  show(`
    <div class="overlay-title">Rule Mastered!</div>
    <div class="overlay-subtitle">You've figured out "${ruleName}"</div>
    <div class="overlay-text">You've beaten this rule 3 times. What do you want to do?</div>
    <div class="btn-row">
      <button class="save-trash-btn save" id="btn-save">Save (Always On)</button>
      <button class="save-trash-btn trash" id="btn-trash">Trash (Never Again)</button>
      <button class="save-trash-btn skip" id="btn-skip">Keep Playing</button>
    </div>
  `);

  document.getElementById('btn-save').addEventListener('click', () => onSave(ruleId));
  document.getElementById('btn-trash').addEventListener('click', () => onTrash(ruleId));
  document.getElementById('btn-skip').addEventListener('click', () => onSkip(ruleId));
}
