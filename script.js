// ─── LEVELS ──────────────────────────────────────────────────────────────────
// x / y are fractions (0.0–1.0) of the rendered floorplan image.
// Use ?admin=true to open the builder and click to generate precise coordinates,
// then paste each object in below.
const LEVELS = [
  { image: 'assets/clue1.jpg', x: 0.19, y: 0.19 },  // bird-claw relief art
  { image: 'assets/clue2.jpg', x: 0.12, y: 0.52 },  // green close-up
  { image: 'assets/clue3.jpg', x: 0.33, y: 0.57 },  // Charlie paw on dark floor
  { image: 'assets/clue4.jpg', x: 0.47, y: 0.12 },  // Charlie at front door
];

// Max normalised distance at which score reaches 0 (half the diagonal ≈ 0.5)
const MAX_DIST = 0.5;

// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
  currentLevel: 0,
  totalScore: 0,
  pendingPin: null, // {x, y} fractions
  locked: false,
};

// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin') === 'true') {
    initBuilder();
  } else {
    initGame();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GAME MODE
// ═════════════════════════════════════════════════════════════════════════════
function initGame() {
  $('game-mode').classList.remove('hidden');

  const mapImg    = $('map-img');
  const mapCanvas = $('map-canvas');

  // Sync canvas whenever the image loads or window resizes
  function onMapReady() {
    syncCanvas(mapCanvas, mapImg);
    redrawGame();
  }

  if (mapImg.complete && mapImg.naturalWidth) {
    onMapReady();
  } else {
    mapImg.addEventListener('load', onMapReady, { once: true });
  }

  // Re-sync on resize so pin positions stay accurate
  const ro = new ResizeObserver(() => {
    syncCanvas(mapCanvas, mapImg);
    redrawGame();
  });
  ro.observe(mapImg);

  mapCanvas.addEventListener('click', onMapClick);
  $('lock-btn').addEventListener('click', lockGuess);
  $('next-btn').addEventListener('click', nextLevel);
  $('play-again-btn').addEventListener('click', () => location.reload());

  loadLevel(0);
}

function loadLevel(idx) {
  state.currentLevel = idx;
  state.pendingPin   = null;
  state.locked       = false;

  const level = LEVELS[idx];
  $('clue-img').src = level.image;

  $('round-badge').textContent = `Round ${idx + 1} / ${LEVELS.length}`;
  $('map-hint').textContent    = 'Click the floorplan to place your guess';
  $('lock-btn').disabled       = true;
  $('lock-btn').classList.remove('hidden');
  $('result-bar').classList.add('hidden');
  $('result-text').textContent = '';

  if ($('next-btn')) $('next-btn').textContent = 'Next Round →';

  clearCanvas($('map-canvas'));
}

function onMapClick(e) {
  if (state.locked) return;

  const pin = canvasCoords(e, $('map-canvas'));
  state.pendingPin = pin;

  $('lock-btn').disabled = false;
  $('map-hint').textContent = 'Happy with your guess? Lock it in!';

  redrawGame();
}

function lockGuess() {
  if (!state.pendingPin || state.locked) return;

  state.locked = true;

  const level = LEVELS[state.currentLevel];
  const score = calcScore(state.pendingPin.x, state.pendingPin.y, level.x, level.y);
  state.totalScore += score;

  $('total-score').textContent = state.totalScore;
  $('lock-btn').classList.add('hidden');

  const isLast = state.currentLevel === LEVELS.length - 1;
  $('next-btn').textContent = isLast ? 'See Results →' : 'Next Round →';

  $('result-text').textContent = `+${score.toLocaleString()} pts this round`;
  $('result-bar').classList.remove('hidden');

  redrawGame();

  // Easter eggs
  if (score === 5000) {
    setTimeout(triggerCharlie, 300);
  } else if (score < 1000) {
    setTimeout(() => alert('Even Reese could have guessed closer than that.'), 300);
  }
}

function nextLevel() {
  if (state.currentLevel < LEVELS.length - 1) {
    loadLevel(state.currentLevel + 1);
  } else {
    showEndScreen();
  }
}

function showEndScreen() {
  const maxScore = LEVELS.length * 5000;
  $('final-score').textContent = state.totalScore.toLocaleString();
  $('max-score').textContent   = maxScore.toLocaleString();

  const pct = state.totalScore / maxScore;
  let msg;
  if (pct >= 0.9)      msg = "You know every corner of this home by heart! 🏆";
  else if (pct >= 0.7) msg = "Impressive — you clearly spend quality time in every room! 🌸";
  else if (pct >= 0.5) msg = "Not bad! A few more years and you'll know every nook. 😄";
  else                 msg = "Maybe ask Charlie for tips — he has the whole place mapped. 🐾";

  $('end-message').textContent = msg;
  $('end-screen').classList.remove('hidden');
}

// ─── CANVAS HELPERS ──────────────────────────────────────────────────────────

function syncCanvas(canvas, img) {
  // Match canvas pixel dimensions to the image's rendered size inside the wrapper.
  // The CSS keeps canvas at 100%/100% of the wrapper; we only need to set the
  // pixel buffer so drawing coordinates map 1-to-1 to percentage fractions.
  const rect = img.getBoundingClientRect();
  const dpr  = window.devicePixelRatio || 1;
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function redrawGame() {
  const canvas = $('map-canvas');
  const ctx    = canvas.getContext('2d');
  const w      = canvas.offsetWidth;   // CSS pixels (after scale)
  const h      = canvas.offsetHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!state.pendingPin) return;

  if (state.locked) {
    const level = LEVELS[state.currentLevel];
    drawLine(ctx, w, h, state.pendingPin.x, state.pendingPin.y, level.x, level.y);
    drawPin(ctx, w, h, level.x,          level.y,          '--pin-correct', '✓');
  }

  drawPin(ctx, w, h, state.pendingPin.x, state.pendingPin.y, '--pin-user', state.locked ? '✗' : '?');
}

function drawPin(ctx, w, h, xFrac, yFrac, cssVar, label) {
  const x = xFrac * w;
  const y = yFrac * h;
  const r = 12;

  const color = getComputedStyle(document.documentElement)
    .getPropertyValue(cssVar).trim();

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur  = 8;

  // Circle fill
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.shadowBlur = 0;

  // White border
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  // Label
  ctx.fillStyle    = '#fff';
  ctx.font         = `bold ${r}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);

  // Stem
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.lineTo(x, y + r + 8);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.stroke();

  ctx.restore();
}

function drawLine(ctx, w, h, x1f, y1f, x2f, y2f) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1f * w, y1f * h);
  ctx.lineTo(x2f * w, y2f * h);
  ctx.strokeStyle = 'rgba(255,165,0,0.85)';
  ctx.lineWidth   = 3;
  ctx.setLineDash([9, 5]);
  ctx.stroke();
  ctx.restore();
}

function canvasCoords(mouseEvent, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (mouseEvent.clientX - rect.left)  / rect.width,
    y: (mouseEvent.clientY - rect.top)   / rect.height,
  };
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
function calcScore(ux, uy, tx, ty) {
  const dist = Math.hypot(ux - tx, uy - ty);
  return Math.max(0, Math.round(5000 * (1 - dist / MAX_DIST)));
}

// ─── CHARLIE EASTER EGG ──────────────────────────────────────────────────────
function triggerCharlie() {
  const wrap = $('charlie-wrap');
  // Reset animation by removing and re-adding the element
  wrap.style.animation = 'none';
  void wrap.offsetWidth; // force reflow
  wrap.style.animation = '';
  wrap.classList.remove('hidden');
  // Hide after animation finishes
  setTimeout(() => wrap.classList.add('hidden'), 4000);
}

// ═════════════════════════════════════════════════════════════════════════════
// BUILDER MODE
// ═════════════════════════════════════════════════════════════════════════════
function initBuilder() {
  $('builder-mode').classList.remove('hidden');

  const mapImg    = $('builder-map-img');
  const canvas    = $('builder-canvas');
  let builderPin  = null;

  function onBuilderMapReady() {
    syncCanvas(canvas, mapImg);
  }

  if (mapImg.complete && mapImg.naturalWidth) {
    onBuilderMapReady();
  } else {
    mapImg.addEventListener('load', onBuilderMapReady, { once: true });
  }

  const ro = new ResizeObserver(() => {
    syncCanvas(canvas, mapImg);
    if (builderPin) redrawBuilderPin(canvas, builderPin);
  });
  ro.observe(mapImg);

  canvas.addEventListener('click', (e) => {
    const pin = canvasCoords(e, canvas);
    builderPin = { x: +pin.x.toFixed(4), y: +pin.y.toFixed(4) };

    redrawBuilderPin(canvas, builderPin);

    $('builder-coord-display').textContent = `x: ${builderPin.x}, y: ${builderPin.y}`;
    $('builder-pin-info').classList.remove('hidden');
    $('generate-btn').disabled = false;
  });

  $('generate-btn').addEventListener('click', () => {
    const filename = $('builder-filename').value.trim();
    if (!filename) { alert('Enter an image filename first.'); return; }
    if (!builderPin) { alert('Click the map to place a pin first.'); return; }

    const code = `{ image: 'assets/${filename}', x: ${builderPin.x}, y: ${builderPin.y} },`;
    $('code-text').textContent = code;
    $('code-output').classList.remove('hidden');
    $('copy-confirm').classList.add('hidden');
  });

  $('copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText($('code-text').textContent).then(() => {
      $('copy-confirm').classList.remove('hidden');
    });
  });
}

function redrawBuilderPin(canvas, pin) {
  clearCanvas(canvas);
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  const ctx = canvas.getContext('2d');
  drawPin(ctx, w, h, pin.x, pin.y, '--pin-user', '📍');
}

// ─── GO ──────────────────────────────────────────────────────────────────────
init();
