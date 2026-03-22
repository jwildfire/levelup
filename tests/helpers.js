/**
 * Shared test helpers for Level Up Playwright tests.
 */

/**
 * Navigate to the game and wait for it to be ready.
 */
export async function loadGame(page) {
  await page.goto('/');
  // Wait for the overlay (menu) to be visible
  await page.waitForFunction(() => {
    const gs = window._gs;
    return gs && gs.phase === 'menu';
  }, { timeout: 5000 });
}

/**
 * Select a GM by index (0-5) and get past the menu.
 */
export async function selectGM(page, index = 0) {
  // Click the GM option
  await page.evaluate((i) => {
    const overlay = document.getElementById('overlay');
    const options = overlay.querySelectorAll('.gm-choice');
    if (options[i]) options[i].click();
  }, index);

  // Wait for intro-chat phase
  await page.waitForFunction(() => window._gs.phase === 'intro-chat', { timeout: 3000 });
}

/**
 * Start level 1 from intro chat (click the start button).
 */
export async function startLevel1(page) {
  await page.evaluate(() => {
    const btn = document.getElementById('intro-start');
    if (btn) { btn.click(); return; }
    // Fallback: find by text
    const overlay = document.getElementById('overlay');
    const btns = overlay.querySelectorAll('button');
    for (const b of btns) {
      if (b.textContent.includes('Start') || b.textContent.includes('Level 1') || b.textContent.includes('LEVEL 1')) {
        b.click();
        return;
      }
    }
  });

  await page.waitForFunction(() => window._gs.phase === 'playing', { timeout: 3000 });
}

/**
 * Full setup: load game → select GM → start level 1.
 */
export async function startPlaying(page, gmIndex = 0) {
  await loadGame(page);
  await selectGM(page, gmIndex);
  await startLevel1(page);
}

/**
 * Get serializable game state snapshot.
 */
export async function getState(page) {
  return page.evaluate(() => {
    const gs = window._gs;
    return {
      phase: gs.phase,
      level: gs.level,
      subLevel: gs.subLevel,
      worldType: gs.worldType,
      activeRuleIds: [...gs.activeRuleIds],
      chatLog: gs.chatLog.map(c => ({ text: c.text, sender: c.sender, type: c.type })),
      playerX: gs.player?.x,
      playerY: gs.player?.y,
      moveCount: gs.player?.moveCount,
      dotsReached: gs.ruleData?.dotsReached || 0,
      timerRemaining: gs.ruleData?.timer_remaining,
      timerDuration: gs.ruleData?.timer_duration,
      levelTimerExpired: gs.levelTimerExpired,
      hudHeight: gs.hudHeight,
      worldWidth: gs.world?.width,
      worldHeight: gs.world?.height,
      hasMaze: !!gs.maze,
      gameMaster: gs.gameMaster ? { id: gs.gameMaster.id, name: gs.gameMaster.name } : null,
    };
  });
}
