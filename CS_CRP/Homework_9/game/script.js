// ============================================================
//  CATCH GAME — Core Logic (ES6+) + Rich Visuals
// ============================================================

(() => {
  'use strict';

  // ---- DOM refs ----
  const canvas      = document.getElementById('game-canvas');
  const ctx         = canvas.getContext('2d');
  const gameWrapper = document.getElementById('game-wrapper');

  const hudScore    = document.getElementById('hud-score');
  const hudHigh     = document.getElementById('hud-high');
  const hudLives    = document.getElementById('hud-lives');
  const hudNewHs    = document.getElementById('hud-new-hs');

  const btnPause    = document.getElementById('btn-pause');
  const btnRestart  = document.getElementById('btn-restart');
  const btnResume   = document.getElementById('btn-resume');
  const btnGoRestart = document.getElementById('btn-go-restart');
  const btnMute     = document.getElementById('btn-mute');

  const btnResetHsStart = document.getElementById('btn-reset-hs-start');
  const btnResetHs      = document.getElementById('btn-reset-hs');
  const btnStartGame    = document.getElementById('btn-start-game');
  const startHsVal      = document.getElementById('start-hs-val');

  const btnTouchLeft    = document.getElementById('btn-touch-left');
  const btnTouchRight   = document.getElementById('btn-touch-right');

  const pauseOverlay    = document.getElementById('pause-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const startOverlay    = document.getElementById('start-overlay');

  const goScore = document.getElementById('go-score');
  const goHigh  = document.getElementById('go-high');

  // ===========================================================
  //  ★★★  AUDIO MANAGER  (Web Audio API — no external files) ★★★
  // ===========================================================
  const AudioManager = (() => {
    let audioCtx  = null;
    let isMuted   = false;

    // ---- Persistence ----
    function loadMuted() {
      try { return localStorage.getItem('catchGameMuted') === '1'; }
      catch { return false; }
    }
    function saveMuted(val) {
      try { localStorage.setItem('catchGameMuted', val ? '1' : '0'); } catch { /* noop */ }
    }
    isMuted = loadMuted();
    btnMute.textContent = isMuted ? '🔇' : '🔊';

    // ---- Lazy AudioContext init (browser autoplay policy) ----
    function ensureContext() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }

    // ---- Sound Synthesizers ----

    /** Quick bright "ting" — fruit collected */
    function playFruitCollect() {
      const ctx = ensureContext();
      const now = ctx.currentTime;

      // Two overlapping tones for a sparkly chime
      [880, 1318.5].forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + 0.06);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 + i * 0.04);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.03);
        osc.stop(now + 0.2 + i * 0.04);
      });
    }

    /** Descending retro "wah-wah" — game over */
    function playGameOver() {
      const ctx = ensureContext();
      const now = ctx.currentTime;

      // Three descending tones
      const freqs = [440, 370, 294];
      freqs.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.22);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.75, now + i * 0.22 + 0.2);
        gain.gain.setValueAtTime(0.12, now + i * 0.22);
        gain.gain.linearRampToValueAtTime(0.0, now + i * 0.22 + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.22);
        osc.stop(now + i * 0.22 + 0.25);
      });

      // Final low rumble
      const bass = ctx.createOscillator();
      const bGain = ctx.createGain();
      bass.type = 'sawtooth';
      bass.frequency.setValueAtTime(110, now + 0.66);
      bass.frequency.exponentialRampToValueAtTime(55, now + 1.2);
      bGain.gain.setValueAtTime(0.08, now + 0.66);
      bGain.gain.linearRampToValueAtTime(0.0, now + 1.3);
      bass.connect(bGain).connect(ctx.destination);
      bass.start(now + 0.66);
      bass.stop(now + 1.35);
    }

    /** Quick pop/crackle — firecracker celebration */
    function playFirecracker() {
      const ctx = ensureContext();
      const now = ctx.currentTime;

      // Noise burst via oscillator cluster
      for (let i = 0; i < 3; i++) {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        const freq = 600 + Math.random() * 2400;
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + i * 0.04 + 0.08);
        gain.gain.setValueAtTime(0.10, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.1);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.12);
      }
    }

    /** Soft "miss" — lost a life */
    function playMiss() {
      const ctx = ensureContext();
      const now = ctx.currentTime;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(165, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.0, now + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.32);
    }

    /** Crisp button click feedback */
    function playBtnClick() {
      const ctx = ensureContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    }

    /** Celebratory high-score fanfare chimes */
    function playHighScore() {
      const ctx = ensureContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.2);
      });
    }

    /** Reset action feedback */
    function playReset() {
      const ctx = ensureContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    // ---- Lookup ----
    const sounds = {
      fruit_collect: playFruitCollect,
      game_over:     playGameOver,
      firecracker:   playFirecracker,
      miss:          playMiss,
      btn_click:     playBtnClick,
      high_score:    playHighScore,
      reset:         playReset,
    };

    // ---- Public API ----
    return {
      play(name) {
        if (isMuted) return;
        const fn = sounds[name];
        if (fn) fn();
      },
      toggleMute() {
        isMuted = !isMuted;
        saveMuted(isMuted);
        btnMute.textContent = isMuted ? '🔇' : '🔊';
        return isMuted;
      },
      get muted() { return isMuted; },
      /** Call once on first user gesture to unlock audio */
      warmUp() { ensureContext(); },
    };
  })();

  // ===========================================================
  //  CORE CONSTANTS  (unchanged)
  // ===========================================================
  const PLAYER_WIDTH  = 80;
  const PLAYER_HEIGHT = 18;
  const PLAYER_SPEED  = 7;
  const PLAYER_Y_PAD  = 30;

  const OBJ_SIZE       = 22;
  const OBJ_BASE_SPEED = 1.0;
  const OBJ_SPEED_VAR  = 0.3;
  const SPAWN_BASE_INTERVAL = 120;
  const SPAWN_MIN_INTERVAL  = 50;
  const GOOD_CHANCE    = 0.65;

  const SCORE_PER_CATCH = 5;
  const STARTING_LIVES  = 3;

  const DIFFICULTY_STEP  = 25;
  const SPEED_INCREMENT  = 0.15;
  const SPAWN_DECREMENT  = 8;

  // ===========================================================
  //  VISUAL PALETTE & FRUIT TYPES  (new)
  // ===========================================================
  const PAL = {
    apricot:   '#fcd0a1',
    blue:      '#2b59c3',
    emerald:   '#06d6a0',
    oxblood:   '#960200',
    turf:      '#137547',
  };

  const FRESH_FRUITS = [
    { body: '#e74c3c', shine: '#ff7979', leaf: '#27ae60' },   // apple
    { body: '#f39c12', shine: '#f8c471', leaf: '#27ae60' },   // orange
    { body: '#82c91e', shine: '#a9e34b', leaf: '#2ecc71' },   // pear
    { body: '#8e44ad', shine: '#af7ac5', leaf: '#27ae60' },   // plum
  ];

  const GROUND_Y = 435;   // where the grass strip starts

  // ===========================================================
  //  GAME STATE  (core + visual additions)
  // ===========================================================
  let score, highScore, lives;
  let paused, gameOver;
  let waitingToStart;
  let animFrameId;
  let spawnTimer;
  let objects;
  let keys;

  // Visual‑only state
  let frameCount       = 0;
  let particles        = [];
  let gameOverAnimId   = null;
  let gameOverTimer    = 0;
  let isNewHighScore   = false;
  let previousHighScore = 0;
  let hasCelebratedNewHighScore = false;
  let gameOverTimeoutId = null;

  // ---- Player ----
  const player = { x: 0, y: 0, w: PLAYER_WIDTH, h: PLAYER_HEIGHT };

  // ---- Helpers ----
  const rand  = (min, max) => Math.random() * (max - min) + min;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ===========================================================
  //  STORAGE MANAGEMENT (State & Persistent Storage)
  // ===========================================================
  const STORAGE_KEY = 'game_high_score';

  function loadHighScore() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val === null || val === undefined) {
        return 0;
      }
      const parsed = parseInt(val, 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore(val) {
    try {
      const num = Math.max(0, parseInt(val, 10) || 0);
      localStorage.setItem(STORAGE_KEY, String(num));
    } catch { /* noop */ }
  }

  function clearHighScoreStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('catchGameHighScore');
    } catch { /* noop */ }
  }

  // ---- Sensory Polish: Micro-animations ----
  function triggerScorePop() {
    if (!hudScore) return;
    hudScore.classList.remove('score-pop');
    void hudScore.offsetWidth; // re-flow trigger
    hudScore.classList.add('score-pop');
  }

  function triggerScreenShake() {
    if (!gameWrapper) return;
    gameWrapper.classList.remove('shake');
    void gameWrapper.offsetWidth; // re-flow trigger
    gameWrapper.classList.add('shake');
  }

  // ---- Difficulty helpers ----
  function currentDifficultyLevel() {
    return Math.floor(score / DIFFICULTY_STEP);
  }
  function currentFallSpeed() {
    return OBJ_BASE_SPEED + currentDifficultyLevel() * SPEED_INCREMENT;
  }
  function currentSpawnInterval() {
    const interval = SPAWN_BASE_INTERVAL - currentDifficultyLevel() * SPAWN_DECREMENT;
    return Math.max(interval, SPAWN_MIN_INTERVAL);
  }

  // ---- HUD update ----
  function updateHUD() {
    hudScore.textContent = score;
    hudHigh.textContent  = highScore;
    hudLives.textContent = '❤️'.repeat(lives) || '💀';
    if (startHsVal) startHsVal.textContent = highScore;
  }

  // ===========================================================
  //  OBJECT FACTORY — ensures new objects never overlap existing
  //  ones on the X-axis so the player can always dodge BAD items
  // ===========================================================
  const MIN_X_GAP = OBJ_SIZE * 4;  // minimum horizontal gap between objects

  function findSafeX(attempts = 30) {
    const margin = OBJ_SIZE + 10;
    // Only worry about objects still near the top of the screen
    const nearby = objects.filter(o => o.y < canvas.height * 0.35);

    for (let i = 0; i < attempts; i++) {
      const candidate = rand(margin, canvas.width - margin);
      const tooClose = nearby.some(o => Math.abs(o.x - candidate) < MIN_X_GAP);
      if (!tooClose) return candidate;
    }
    // Fallback: pick the midpoint of the widest gap
    if (nearby.length === 0) return canvas.width / 2;

    const sorted = nearby.map(o => o.x).sort((a, b) => a - b);
    // Add virtual walls at edges
    sorted.unshift(margin);
    sorted.push(canvas.width - margin);

    let bestMid = canvas.width / 2, bestGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > bestGap) {
        bestGap = gap;
        bestMid = (sorted[i] + sorted[i - 1]) / 2;
      }
    }
    return bestMid;
  }

  function spawnObject() {
    const isGood    = Math.random() < GOOD_CHANCE;
    const baseSpeed = currentFallSpeed();
    objects.push({
      x:     findSafeX(),
      y:     -OBJ_SIZE,
      speed: baseSpeed + rand(-OBJ_SPEED_VAR, OBJ_SPEED_VAR),
      type:  isGood ? 'GOOD' : 'BAD',
      // visual metadata (does not affect any game logic)
      fruitIdx: Math.floor(rand(0, FRESH_FRUITS.length)),
    });
  }

  // ===========================================================
  //  COLLISION  (unchanged)
  // ===========================================================
  function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
    const nearestX = clamp(cx, rx, rx + rw);
    const nearestY = clamp(cy, ry, ry + rh);
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy <= r * r;
  }

  // ===========================================================
  //  ★★★  VISUAL DRAWING FUNCTIONS  ★★★
  // ===========================================================

  // ---------- sky ----------
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0,   '#1e3a78');   // deep laser‑blue top
    g.addColorStop(0.4, '#4a7cd4');
    g.addColorStop(0.75,'#8fbcf5');
    g.addColorStop(1,   '#c8e2fa');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, GROUND_Y);
  }

  // ---------- sun ----------
  function drawSun() {
    const sx = 520, sy = 65;
    const pulse = Math.sin(frameCount * 0.018) * 0.08 + 1;

    // outer glow
    const g = ctx.createRadialGradient(sx, sy, 12, sx, sy, 95 * pulse);
    g.addColorStop(0,   'rgba(252,208,161,0.55)');
    g.addColorStop(0.45,'rgba(252,208,161,0.18)');
    g.addColorStop(1,   'rgba(252,208,161,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, 95 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // rays
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(frameCount * 0.002);
    ctx.strokeStyle = 'rgba(252,208,161,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 30, Math.sin(a) * 30);
      ctx.lineTo(Math.cos(a) * 52 * pulse, Math.sin(a) * 52 * pulse);
      ctx.stroke();
    }
    ctx.restore();

    // body
    ctx.fillStyle = '#fcd0a1';
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, Math.PI * 2);
    ctx.fill();

    // bright centre
    ctx.fillStyle = '#fde8c8';
    ctx.beginPath();
    ctx.arc(sx - 5, sy - 5, 13, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---------- clouds ----------
  function drawCloudShape(x, y, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.arc(22, -4, 22, 0, Math.PI * 2);
    ctx.arc(46, 0, 18, 0, Math.PI * 2);
    ctx.arc(18, 8, 16, 0, Math.PI * 2);
    ctx.arc(32, 8, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function drawClouds() {
    const drift = frameCount * 0.018;              // very slow crawl
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    drawCloudShape((70  + drift)       % (canvas.width + 120) - 60, 72,  1.0);
    drawCloudShape((310 + drift * 0.6) % (canvas.width + 120) - 60, 42,  0.7);
    drawCloudShape((490 + drift * 0.4) % (canvas.width + 120) - 60, 100, 0.55);
  }

  // ---------- ground ----------
  function drawGround() {
    // solid ground
    const g = ctx.createLinearGradient(0, GROUND_Y, 0, canvas.height);
    g.addColorStop(0,   '#1a9f55');
    g.addColorStop(0.25,'#137547');
    g.addColorStop(1,   '#0d5e38');
    ctx.fillStyle = g;
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

    // grass blades at top edge
    ctx.fillStyle = PAL.emerald;
    for (let i = 0; i < canvas.width; i += 7) {
      const h = 4 + Math.sin(i * 0.6 + frameCount * 0.04) * 2;
      ctx.beginPath();
      ctx.moveTo(i,     GROUND_Y);
      ctx.lineTo(i + 3, GROUND_Y - h);
      ctx.lineTo(i + 6, GROUND_Y);
      ctx.fill();
    }
  }

  // ---------- trees ----------
  function drawTree(tx, trunkH, foliageR, showFruits) {
    const trunkW = Math.max(foliageR * 0.32, 8);

    // trunk
    ctx.fillStyle = '#6d4c2a';
    ctx.fillRect(tx - trunkW / 2, GROUND_Y - trunkH, trunkW, trunkH);
    // bark lines
    ctx.strokeStyle = '#5a3d1f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx - 2, GROUND_Y - trunkH + 6);
    ctx.lineTo(tx - 2, GROUND_Y - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx + 3, GROUND_Y - trunkH + 12);
    ctx.lineTo(tx + 3, GROUND_Y - 5);
    ctx.stroke();

    // foliage layers
    const fCY = GROUND_Y - trunkH - foliageR * 0.55;
    ctx.fillStyle = '#0f6b3a';
    ctx.beginPath(); ctx.arc(tx - foliageR * 0.38, fCY + 8, foliageR * 0.68, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tx + foliageR * 0.38, fCY + 8, foliageR * 0.68, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.emerald;
    ctx.beginPath(); ctx.arc(tx, fCY - 4, foliageR * 0.72, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1bb864';
    ctx.beginPath(); ctx.arc(tx, fCY + 4, foliageR * 0.58, 0, Math.PI * 2); ctx.fill();

    // hanging fruits
    if (showFruits) {
      const spots = [
        { dx: -foliageR * 0.28, dy: fCY + 4,  c: '#e74c3c' },
        { dx:  foliageR * 0.24, dy: fCY - 1,  c: '#f39c12' },
        { dx: -foliageR * 0.05, dy: fCY + 14, c: '#e74c3c' },
        { dx:  foliageR * 0.34, dy: fCY + 10, c: '#f39c12' },
      ];
      for (const s of spots) {
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(tx + s.dx, s.dy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawBackgroundTrees() {
    drawTree(75,  105, 42, true);    // big tree (left — Newton sits here)
    drawTree(548, 68,  28, true);    // medium tree (right)
    drawTree(475, 38,  18, false);   // small bush
  }

  // ---------- Sir Isaac Newton ----------
  function drawNewton() {
    const nx = 40, ny = GROUND_Y;  // seated at tree base

    // legs stretched out
    ctx.fillStyle = '#34495e';
    ctx.fillRect(nx - 1, ny - 5, 20, 6);
    // shoes
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(nx + 17, ny - 6, 7, 7);

    // torso (seated triangle)
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(nx - 10, ny);
    ctx.lineTo(nx + 10, ny);
    ctx.lineTo(nx, ny - 24);
    ctx.closePath();
    ctx.fill();

    // head
    ctx.fillStyle = '#deb887';
    ctx.beginPath();
    ctx.arc(nx, ny - 30, 8, 0, Math.PI * 2);
    ctx.fill();

    // white wig / hair
    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.arc(nx, ny - 32, 8, Math.PI, 0);
    ctx.fill();
    // side curls
    ctx.beginPath(); ctx.arc(nx - 8, ny - 28, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(nx + 8, ny - 28, 4, 0, Math.PI * 2); ctx.fill();

    // eyes (looking up)
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(nx - 3, ny - 31, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(nx + 3, ny - 31, 1.2, 0, Math.PI * 2); ctx.fill();

    // ----- floating apple above his head -----
    const appleY = ny - 55 + Math.sin(frameCount * 0.025) * 5;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(nx + 2, appleY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // stem
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(nx + 2, appleY - 5.5);
    ctx.lineTo(nx + 3, appleY - 9);
    ctx.stroke();
    // leaf
    ctx.fillStyle = '#27ae60';
    ctx.save();
    ctx.translate(nx + 6, appleY - 8);
    ctx.rotate(0.45);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- player character with basket ----------
  function drawPlayerCharacter() {
    const px = player.x, py = player.y, pw = player.w, ph = player.h;
    const cx = px + pw / 2;

    // ─── character face (behind basket, peeking over the rim) ───
    // hair
    ctx.fillStyle = '#4a3520';
    ctx.beginPath();
    ctx.arc(cx, py - 1, 10, Math.PI, 0);
    ctx.fill();
    // face
    ctx.fillStyle = '#deb887';
    ctx.beginPath();
    ctx.arc(cx, py, 9, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.arc(cx - 3, py - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 3, py - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    // smile
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(cx, py + 2, 3, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // ─── basket (collision rect area) ───
    // body (trapezoid)
    ctx.fillStyle = '#c47f17';
    ctx.beginPath();
    ctx.moveTo(px + 7, py + ph);
    ctx.lineTo(px,      py);
    ctx.lineTo(px + pw, py);
    ctx.lineTo(px + pw - 7, py + ph);
    ctx.closePath();
    ctx.fill();

    // weave horizontal lines
    ctx.strokeStyle = '#a0651a';
    ctx.lineWidth = 0.8;
    for (let i = 1; i <= 3; i++) {
      const yy = py + (ph * i / 4);
      const inset = 7 * (i / 4);
      ctx.beginPath();
      ctx.moveTo(px + inset + 1, yy);
      ctx.lineTo(px + pw - inset - 1, yy);
      ctx.stroke();
    }
    // weave vertical hints
    for (let i = 1; i < 7; i++) {
      const xx = px + (pw * i / 7);
      ctx.beginPath();
      ctx.moveTo(xx, py + 2);
      ctx.lineTo(xx, py + ph - 1);
      ctx.stroke();
    }

    // rim (thick top edge)
    ctx.fillStyle = '#8B5E14';
    roundRect(ctx, px - 2, py - 2, pw + 4, 4, 2);
    ctx.fill();

    // ─── hands on sides ───
    ctx.fillStyle = '#deb887';
    ctx.beginPath(); ctx.arc(px - 4,      py + ph * 0.45, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + pw + 4, py + ph * 0.45, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  // ---------- falling fruit sprites ----------
  function drawFreshFruit(x, y, r, idx) {
    const ft = FRESH_FRUITS[idx % FRESH_FRUITS.length];

    // glow
    ctx.shadowColor = PAL.emerald;
    ctx.shadowBlur  = 12;

    // body
    ctx.fillStyle = ft.body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // highlight
    ctx.fillStyle = ft.shine;
    ctx.beginPath();
    ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // stem
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + 1, y - r - 6);
    ctx.stroke();

    // leaf
    ctx.fillStyle = ft.leaf;
    ctx.save();
    ctx.translate(x + 4, y - r - 4);
    ctx.rotate(0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawRottenFruit(x, y, r) {
    // glow
    ctx.shadowColor = PAL.oxblood;
    ctx.shadowBlur  = 10;

    // body
    ctx.fillStyle = '#5c3a21';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // dark spots
    ctx.fillStyle = '#3e2723';
    ctx.beginPath(); ctx.arc(x - 5, y + 4, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y - 3, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 2, y - 6, r * 0.16, 0, Math.PI * 2); ctx.fill();

    // mold patch
    ctx.fillStyle = 'rgba(100,120,80,0.35)';
    ctx.beginPath(); ctx.arc(x + 3, y + 6, r * 0.28, 0, Math.PI * 2); ctx.fill();

    // broken stem
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x - 2, y - r - 3);
    ctx.stroke();

    // animated flies
    ctx.fillStyle = '#111';
    for (let i = 0; i < 3; i++) {
      const a  = frameCount * 0.09 + i * (Math.PI * 2 / 3);
      const fr = r + 5 + Math.sin(frameCount * 0.12 + i) * 3;
      const fx = x + Math.cos(a) * fr;
      const fy = y + Math.sin(a) * fr * 0.55 - 4;
      ctx.beginPath(); ctx.arc(fx, fy, 1.5, 0, Math.PI * 2); ctx.fill();
      // tiny wings
      ctx.strokeStyle = 'rgba(120,120,120,0.5)';
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(fx - 1, fy); ctx.lineTo(fx - 3, fy - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx + 1, fy); ctx.lineTo(fx + 3, fy - 2); ctx.stroke();
    }
  }

  function drawFallingFruit(obj) {
    if (obj.type === 'GOOD') {
      drawFreshFruit(obj.x, obj.y, OBJ_SIZE, obj.fruitIdx);
    } else {
      drawRottenFruit(obj.x, obj.y, OBJ_SIZE);
    }
  }

  // ---------- rounded rectangle helper ----------
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ===========================================================
  //  ★★★  PARTICLE SYSTEM  ★★★
  // ===========================================================
  function spawnFireworkBurst() {
    const cx = rand(80, canvas.width - 80);
    const cy = rand(50, canvas.height * 0.45);
    const palette = [PAL.apricot, PAL.emerald, PAL.blue, '#e74c3c', '#f39c12', '#fff', '#ff6b6b', '#ffd700'];
    const n = 35 + Math.floor(rand(0, 20));
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(1.5, 7);
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1,
        decay: rand(0.008, 0.022),
        color: palette[Math.floor(rand(0, palette.length))],
        size: rand(2, 5.5),
        kind: 'fw',
      });
    }
  }

  function spawnSparkleParticles() {
    for (let i = 0; i < 4; i++) {
      particles.push({
        x: rand(0, canvas.width),
        y: rand(-10, -1),
        vx: rand(-0.3, 0.3),
        vy: rand(0.4, 1.4),
        life: 1,
        decay: rand(0.004, 0.012),
        color: Math.random() > 0.5 ? PAL.apricot : PAL.emerald,
        size: rand(1.5, 4),
        kind: 'sp',
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.kind === 'fw') { p.vy += 0.055; p.vx *= 0.992; }
      p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle   = p.color;
      const r = p.size * p.life;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();

      if (p.kind === 'fw') {
        // motion trail
        ctx.beginPath();
        ctx.arc(p.x - p.vx * 0.6, p.y - p.vy * 0.6, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // twinkle
        const tw = Math.sin(frameCount * 0.22 + p.x) * 0.4 + 0.6;
        ctx.globalAlpha = Math.max(0, p.life * tw);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ===========================================================
  //  TRIGGER GAME OVER  (core logic kept — visuals added)
  // ===========================================================
  function triggerGameOver() {
    gameOver = true;
    cancelAnimationFrame(animFrameId);
    if (gameOverTimeoutId) {
      clearTimeout(gameOverTimeoutId);
      gameOverTimeoutId = null;
    }

    // Detect whether the player beat the INCOMING high score
    isNewHighScore = score > previousHighScore;

    if (score > highScore) {
      highScore = score;
      saveHighScore(highScore);
    }

    // ---- audio feedback ----
    AudioManager.play('game_over');
    if (isNewHighScore) {
      // Stagger a firecracker pop slightly after the game-over tone
      gameOverTimeoutId = setTimeout(() => AudioManager.play('firecracker'), 700);
    }

    goScore.textContent = score;
    goHigh.textContent  = highScore;
    updateHUD();
    gameoverOverlay.classList.remove('hidden');

    // ---- visual: kick off particle celebration ----
    particles = [];
    gameOverTimer = 0;
    if (isNewHighScore) {
      for (let i = 0; i < 4; i++) spawnFireworkBurst();
    }
    gameOverAnimId = requestAnimationFrame(gameOverLoop);
  }

  // ===========================================================
  //  UPDATE  (core logic preserved with live score updates)
  // ===========================================================
  function update() {
    // Player movement
    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
      player.x -= PLAYER_SPEED;
    }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
      player.x += PLAYER_SPEED;
    }
    player.x = clamp(player.x, 0, canvas.width - player.w);

    // Spawn timer — only spawn if there aren't too many objects already
    spawnTimer--;
    if (spawnTimer <= 0) {
      // Cap max objects on screen so it stays fair
      if (objects.length < 4) {
        spawnObject();
      }
      spawnTimer = currentSpawnInterval();
    }

    // Move objects & check collisions
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      obj.y += obj.speed;

      // Collision with player
      if (circleRectCollision(obj.x, obj.y, OBJ_SIZE, player.x, player.y, player.w, player.h)) {
        if (obj.type === 'GOOD') {
          score += SCORE_PER_CATCH;
          triggerScorePop();

          // Live High Score Updates (Stage 4, Step 2)
          if (score > highScore) {
            highScore = score;
            saveHighScore(highScore);
          }

          // Live visual cues for breaking the high score
          if (score > previousHighScore && previousHighScore > 0) {
            if (hudNewHs) hudNewHs.classList.remove('hidden');
            if (!hasCelebratedNewHighScore) {
              hasCelebratedNewHighScore = true;
              AudioManager.play('high_score');
              for (let b = 0; b < 2; b++) spawnFireworkBurst();
            }
          }

          objects.splice(i, 1);
          updateHUD();
          AudioManager.play('fruit_collect');
          // Milestone celebration every 50 points
          if (score % 50 === 0 && score > 0) {
            AudioManager.play('firecracker');
          }
        } else {
          // BAD item caught → instant game over
          triggerScreenShake();
          objects.splice(i, 1);
          triggerGameOver();
          return;
        }
        continue;
      }

      // Hits ground
      if (obj.y - OBJ_SIZE > canvas.height) {
        if (obj.type === 'GOOD') {
          lives--;
          triggerScreenShake();
          updateHUD();
          AudioManager.play('miss');
          if (lives <= 0) {
            objects.splice(i, 1);
            triggerGameOver();
            return;
          }
        }
        // BAD items just disappear (no penalty)
        objects.splice(i, 1);
      }
    }
  }

  // ===========================================================
  //  DRAW  (rewritten for rich scene — no logic changes)
  // ===========================================================
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ---- Background scene ----
    drawSky();
    drawSun();
    drawClouds();
    drawBackgroundTrees();
    drawNewton();
    drawGround();

    // ---- Falling fruits ----
    for (const obj of objects) drawFallingFruit(obj);

    // ---- Player ----
    drawPlayerCharacter();
  }

  // ===========================================================
  //  GAME‑OVER ANIMATION LOOP  (visual only)
  // ===========================================================
  function gameOverLoop() {
    if (!gameOver) return;

    frameCount++;
    gameOverTimer++;

    // spawn particles over time
    if (isNewHighScore) {
      if (gameOverTimer % 30 === 0) spawnFireworkBurst();
    } else {
      if (gameOverTimer % 8 === 0) spawnSparkleParticles();
    }

    updateParticles();

    // redraw frozen scene + particles
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSky();
    drawSun();
    drawClouds();
    drawBackgroundTrees();
    drawNewton();
    drawGround();
    for (const obj of objects) drawFallingFruit(obj);
    drawPlayerCharacter();
    drawParticles();

    gameOverAnimId = requestAnimationFrame(gameOverLoop);
  }

  // ===========================================================
  //  GAME LOOP  (adds frameCount++ — no logic change)
  // ===========================================================
  function loop() {
    if (paused || gameOver) return;
    frameCount++;
    update();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // ===========================================================
  //  PAUSE / RESUME  (unchanged)
  // ===========================================================
  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    if (paused) {
      cancelAnimationFrame(animFrameId);
      pauseOverlay.classList.remove('hidden');
      btnPause.textContent = '▶ Resume';
    } else {
      pauseOverlay.classList.add('hidden');
      btnPause.textContent = '⏸ Pause';
      animFrameId = requestAnimationFrame(loop);
    }
  }

  // ===========================================================
  //  INIT / RESTART  (adds visual resets)
  // ===========================================================
  function init(startImmediately = false) {
    if (gameOverTimeoutId) {
      clearTimeout(gameOverTimeoutId);
      gameOverTimeoutId = null;
    }
    score = 0;
    lives = STARTING_LIVES;
    highScore = loadHighScore();
    previousHighScore = highScore;      // track for new‑high‑score detection
    hasCelebratedNewHighScore = false;
    paused = false;
    gameOver = false;
    waitingToStart = !startImmediately;
    objects = [];
    if (keys) keys.clear();
    else keys = new Set();
    spawnTimer = SPAWN_BASE_INTERVAL;

    if (hudNewHs) hudNewHs.classList.add('hidden');

    // visual resets
    particles    = [];
    frameCount   = 0;
    gameOverTimer = 0;
    if (gameOverAnimId) { cancelAnimationFrame(gameOverAnimId); gameOverAnimId = null; }

    player.x = (canvas.width - PLAYER_WIDTH) / 2;
    player.y = canvas.height - PLAYER_Y_PAD;

    pauseOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    btnPause.textContent = '⏸ Pause';

    updateHUD();
    cancelAnimationFrame(animFrameId);

    if (waitingToStart) {
      // Show start overlay, draw the idle canvas once
      startOverlay.classList.remove('hidden');
      draw();
    } else {
      startOverlay.classList.add('hidden');
      animFrameId = requestAnimationFrame(loop);
    }
  }

  function beginGame() {
    if (!waitingToStart) return;
    waitingToStart = false;
    startOverlay.classList.add('hidden');
    animFrameId = requestAnimationFrame(loop);
  }

  // ===========================================================
  //  RESET / RESTART FUNCTIONALITY (Step 3)
  // ===========================================================
  function resetGameAndStorage() {
    if (gameOverTimeoutId) {
      clearTimeout(gameOverTimeoutId);
      gameOverTimeoutId = null;
    }
    // 1. Reset High Score: Set state highScore to 0 & update/clear localStorage
    highScore = 0;
    clearHighScoreStorage();

    // 2. Reset Active Game Session: Reset state currentScore to 0
    score = 0;
    previousHighScore = 0;
    isNewHighScore = false;
    hasCelebratedNewHighScore = false;
    if (hudNewHs) hudNewHs.classList.add('hidden');

    // 3. Clear active game timers, event loops, speed modifiers, or entity states
    // and transition the game state back to the Starting Display Screen with game rules
    init(false);
    AudioManager.play('reset');
  }

  // ===========================================================
  //  INPUT & CONTROLS: KEYBOARD, MOUSE & MOBILE TOUCH
  // ===========================================================
  const START_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', ' ']);

  window.addEventListener('keydown', (e) => {
    keys.add(e.key);
    AudioManager.warmUp();   // unlock AudioContext on first gesture

    // Prevent arrow keys & space from scrolling page
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
    }

    // If waiting to start, begin the game on a movement or space key
    if (waitingToStart && START_KEYS.has(e.key)) {
      beginGame();
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      AudioManager.play('btn_click');
      togglePause();
    }
    if (e.key === 'm' || e.key === 'M') AudioManager.toggleMute();
  });

  window.addEventListener('keyup', (e) => keys.delete(e.key));

  function setupControls() {
    let isPointerDown = false;

    // Helper: translate screen clientX to internal canvas coordinate and center the basket
    function setPlayerToPointer(clientX) {
      if (paused || gameOver || waitingToStart) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const scaleX = canvas.width / rect.width;
      const canvasX = (clientX - rect.left) * scaleX;
      player.x = clamp(canvasX - player.w / 2, 0, canvas.width - player.w);
    }

    // ---- Canvas Mouse & Direct Touch Tracking ----
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      AudioManager.warmUp();
      if (waitingToStart) {
        beginGame();
      }
      isPointerDown = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
      setPlayerToPointer(e.clientX);
    });

    canvas.addEventListener('pointermove', (e) => {
      // Mouse moves basket on hover or drag; touch/pen moves while active
      if (e.pointerType === 'mouse' || isPointerDown) {
        setPlayerToPointer(e.clientX);
      }
    });

    const handlePointerUp = (e) => {
      isPointerDown = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
    };

    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointercancel', handlePointerUp);

    // Touch fallback for older mobile browsers
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        AudioManager.warmUp();
        if (waitingToStart) {
          beginGame();
        }
        setPlayerToPointer(e.touches[0].clientX);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        e.preventDefault();
        setPlayerToPointer(e.touches[0].clientX);
      }
    }, { passive: false });

    // ---- On-Screen Mobile Buttons (◀ / ▶) ----
    const bindTouch = (btn, keyName) => {
      if (!btn) return;
      const handleStart = (e) => {
        e.preventDefault();
        AudioManager.warmUp();
        if (waitingToStart) {
          beginGame();
        }
        keys.add(keyName);
      };
      const handleEnd = (e) => {
        e.preventDefault();
        keys.delete(keyName);
      };

      btn.addEventListener('pointerdown', handleStart);
      btn.addEventListener('pointerup', handleEnd);
      btn.addEventListener('pointerleave', handleEnd);
      btn.addEventListener('pointercancel', handleEnd);
    };

    bindTouch(btnTouchLeft, 'ArrowLeft');
    bindTouch(btnTouchRight, 'ArrowRight');

    // Tap canvas or start screen prompt to begin
    if (startOverlay) {
      startOverlay.addEventListener('click', (e) => {
        // Do not trigger game start if clicking the reset button inside the overlay
        if (e.target && (e.target.id === 'btn-reset-hs-start' || e.target.closest('#btn-reset-hs-start'))) {
          return;
        }
        AudioManager.warmUp();
        if (waitingToStart) beginGame();
      });
    }
  }

  // ===========================================================
  //  BUTTON BINDINGS
  // ===========================================================
  btnPause.addEventListener('click', () => {
    AudioManager.warmUp();
    AudioManager.play('btn_click');
    togglePause();
  });

  btnRestart.addEventListener('click', () => {
    AudioManager.warmUp();
    resetGameAndStorage();
  });

  if (btnStartGame) {
    btnStartGame.addEventListener('click', () => {
      AudioManager.warmUp();
      beginGame();
    });
  }

  btnResume.addEventListener('click', () => {
    AudioManager.warmUp();
    AudioManager.play('btn_click');
    togglePause();
  });

  btnGoRestart.addEventListener('click', () => {
    AudioManager.warmUp();
    AudioManager.play('btn_click');
    init(true);
  });

  btnMute.addEventListener('click', () => {
    AudioManager.warmUp();
    AudioManager.toggleMute();
  });

  if (btnResetHsStart) {
    btnResetHsStart.addEventListener('click', (e) => {
      e.stopPropagation();
      AudioManager.warmUp();
      resetGameAndStorage();
    });
  }

  if (btnResetHs) {
    btnResetHs.addEventListener('click', (e) => {
      e.stopPropagation();
      AudioManager.warmUp();
      resetGameAndStorage();
    });
  }

  setupControls();

  // ===========================================================
  //  START — show How to Play screen first
  // ===========================================================
  init(false);
})();
