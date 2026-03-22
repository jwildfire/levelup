const overlay = document.getElementById('overlay');

// Mystery hints - vague, cryptic clues by category
const mysteryHints = {
  hazard: [
    'Something dangerous lurks in the maze...',
    'Not everything in the maze is friendly...',
    'Watch your step. Seriously.',
    'The maze has teeth now.',
  ],
  modifier: [
    'The rules of reality shift...',
    'Nothing stays the same for long...',
    'What was true may not remain so.',
    'The maze has a mind of its own.',
  ],
  collectible: [
    'There are new things to find...',
    'The maze is full of treasures... or are they traps?',
    'Something shiny catches your eye.',
    'Finders keepers.',
  ],
  visual: [
    'Your perception is altered...',
    'Can you trust your eyes?',
    'The darkness holds secrets.',
    'Seeing is no longer believing.',
  ],
  movement: [
    'Your body feels... different.',
    'The way you move has changed.',
    'Left might not be left anymore.',
    'Your muscles have a mind of their own.',
  ],
};

function getHint(category) {
  const hints = mysteryHints[category] || mysteryHints.modifier;
  return hints[Math.floor(Math.random() * hints.length)];
}

const mysterySymbols = ['?', '??', '???'];

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

// Game master personalities
const gameMasters = [
  {
    id: 'monkeys-paw',
    name: "The Monkey's Paw",
    emoji: '🐒',
    tagline: 'Grants your wishes... technically.',
    style: 'Interprets every wish in the worst, most literal, most chaotic way possible. Maliciously compliant. Finds loopholes in everything.',
    color: '#aa88ff',
  },
  {
    id: 'chaotic-fairy',
    name: 'Chaotic Fairy Godmother',
    emoji: '🧚',
    tagline: 'Bibbidi-bobbidi-whoops.',
    style: 'Enthusiastically tries to help but is wildly incompetent. Everything is sparkly and over-the-top. Adds way too much. Thinks everything needs more glitter and more explosions.',
    color: '#ff88dd',
  },
  {
    id: 'passive-aggressive',
    name: 'Passive Aggressive Assistant',
    emoji: '🙂',
    tagline: 'No, it\'s fine. Really.',
    style: 'Technically does what you ask but makes it clear they think it\'s a bad idea. Adds "helpful" features nobody asked for. Leaves passive aggressive notes in the game. Says "per my previous rule" a lot.',
    color: '#88ccff',
  },
  {
    id: 'evil-dm',
    name: 'Evil Dungeon Master',
    emoji: '🐉',
    tagline: 'Roll for initiative. You won\'t survive.',
    style: 'Everything is dramatic and dire. Narrates in fantasy prose. Treats the maze like a deadly dungeon. Adds traps, curses, and doom. Every rule is described like an ancient prophecy. Loves TPKs.',
    color: '#ff4444',
  },
  {
    id: 'game-show-host',
    name: 'Unhinged Game Show Host',
    emoji: '🎤',
    tagline: 'COME ON DOWN!',
    style: 'Treats everything like a fever-dream game show. Overly excited about everything. Adds timers, scores, bonus rounds, and catchphrases. Narrates like a sports commentator having a breakdown. Uses lots of exclamation marks.',
    color: '#ffdd00',
  },
  {
    id: 'game-dev',
    name: 'Game Developer',
    emoji: '🛠️',
    tagline: 'Your wish is my spec.',
    style: 'Implements the player\'s wish as faithfully and literally as possible. No tricks, no twists - just solid game development. Treats each wish like a feature request and builds it clean.',
    color: '#44ff88',
  },
];

export function getGameMasters() {
  return gameMasters;
}

export function showMenu(gameState, onStart) {
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
    <div class="gm-list">
      ${gmOptions}
    </div>

    <div id="gm-prompt-section" class="hidden" style="width: 80%; max-width: 400px; margin-top: 1rem;">
      <div class="overlay-text" id="gm-prompt-label" style="color: #888;">Set the stage for your game:</div>
      <div class="prompt-input-row" style="margin-top: 0.5rem;">
        <input type="text" id="initial-prompt-input" class="rule-prompt-input"
          placeholder="e.g. &quot;make it spooky&quot;, &quot;underwater theme&quot;..."
          autocomplete="off" />
      </div>
      <div style="margin-top: 1rem; text-align: center;">
        <button id="start-game-btn" class="prompt-submit-btn" style="padding: 0.8rem 2rem; font-size: 1rem;">Begin</button>
      </div>
      <div class="overlay-text" style="color: #444; font-size: 0.7rem; margin-top: 0.5rem;">Arrow keys or WASD to move</div>
    </div>
  `);

  let selectedGM = null;

  // GM selection
  const gmEls = overlay.querySelectorAll('.gm-choice');
  gmEls.forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx);
      selectedGM = gameMasters[idx];

      // Highlight selected
      gmEls.forEach(g => g.classList.remove('selected'));
      el.classList.add('selected');
      el.style.borderColor = selectedGM.color;

      // Show prompt section
      const promptSection = document.getElementById('gm-prompt-section');
      promptSection.classList.remove('hidden');
      document.getElementById('gm-prompt-label').textContent =
        `${selectedGM.emoji} ${selectedGM.name} awaits your opening command:`;
      document.getElementById('gm-prompt-label').style.color = selectedGM.color;

      const input = document.getElementById('initial-prompt-input');
      setTimeout(() => input.focus(), 100);
    });
  });

  // Start game
  function doStart() {
    if (!selectedGM) return;
    const input = document.getElementById('initial-prompt-input');
    const initialPrompt = input ? input.value.trim() : '';
    onStart(selectedGM, initialPrompt);
  }

  // Delegate to avoid timing issues
  overlay.addEventListener('click', (e) => {
    if (e.target.id === 'start-game-btn') doStart();
  });
  overlay.addEventListener('keydown', (e) => {
    if (e.target.id === 'initial-prompt-input') {
      e.stopPropagation();
      if (e.key === 'Enter') doStart();
    }
  });
}

export function showLevelComplete(gameState, revealedRules) {
  let revealHtml = '';
  if (revealedRules && revealedRules.length > 0) {
    const revealItems = revealedRules.map(r =>
      `<div class="overlay-text" style="color: #ffaa00;">&#x2726; ${r.name}: ${r.description}</div>`
    ).join('');
    revealHtml = `
      <div class="overlay-text" style="color: #888; margin-top: 1rem;">Active rules this level:</div>
      ${revealItems}
    `;
  }

  show(`
    <div class="overlay-title">Level ${gameState.level} Complete!</div>
    <div class="overlay-subtitle">Moves: ${gameState.player.moveCount}</div>
    ${revealHtml}
    <div class="overlay-text" style="margin-top: 1rem; color: #00ff88;">Press ENTER to continue</div>
  `);
}

export function showRulePicker(choices, onPickPreset, onPromptSubmit) {
  const choiceHtml = choices.map((rule, i) => `
    <div class="rule-choice mystery" data-idx="${i}">
      <span class="choice-key">${i + 1}</span>
      <span class="choice-name">Mystery Rule ${mysterySymbols[i] || '?'}</span>
      <div class="choice-desc">${getHint(rule.category)}</div>
      <span class="choice-category">difficulty ${rule.difficulty}</span>
    </div>
  `).join('');

  show(`
    <div class="overlay-title">What Happens Next?</div>

    <div class="prompt-section">
      <div class="overlay-subtitle">Describe a new rule (be careful what you wish for...)</div>
      <div class="prompt-input-row">
        <input type="text" id="rule-prompt-input" class="rule-prompt-input"
          placeholder="e.g. &quot;add a dog&quot;, &quot;make it rain&quot;, &quot;gravity&quot;..."
          autocomplete="off" />
        <button id="rule-prompt-submit" class="prompt-submit-btn">Wish</button>
      </div>
      <div class="overlay-text" style="color: #555; font-size: 0.7rem; margin-top: 0.3rem;">
        The game will interpret your wish in the weirdest way possible
      </div>
    </div>

    <div class="divider-row">
      <span class="divider-line"></span>
      <span class="divider-text">or pick a mystery</span>
      <span class="divider-line"></span>
    </div>

    ${choiceHtml}
  `);

  // Focus the input
  const input = document.getElementById('rule-prompt-input');
  setTimeout(() => input.focus(), 100);

  // Prompt submit
  const submitBtn = document.getElementById('rule-prompt-submit');
  function submitPrompt() {
    const value = input.value.trim();
    if (value.length > 0) {
      window.removeEventListener('keydown', onKey);
      onPromptSubmit(value);
    }
  }
  submitBtn.addEventListener('click', submitPrompt);
  input.addEventListener('keydown', (e) => {
    e.stopPropagation(); // Don't let game input handler steal keys
    if (e.key === 'Enter') submitPrompt();
  });

  // Click handlers for mystery choices
  const choiceEls = overlay.querySelectorAll('.rule-choice');
  choiceEls.forEach((el) => {
    el.addEventListener('click', () => {
      window.removeEventListener('keydown', onKey);
      const idx = parseInt(el.dataset.idx);
      onPickPreset(choices[idx]);
    });
  });

  // Keyboard handler for mystery choices (only when input not focused)
  function onKey(e) {
    if (document.activeElement === input) return;
    const num = parseInt(e.key);
    if (num >= 1 && num <= choices.length) {
      window.removeEventListener('keydown', onKey);
      onPickPreset(choices[num - 1]);
    }
  }
  window.addEventListener('keydown', onKey);
}

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
      <button class="save-trash-btn skip" id="btn-fallback">Pick a Mystery Instead</button>
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
