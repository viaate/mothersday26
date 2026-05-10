// ALL LEVELS (pool to draw from)
const ALL_LEVELS = [
  { image: 'assets/clue1.jpg',  x: 0.687,  y: 0.4226 },
  { image: 'assets/clue2.jpg',  x: 0.8193, y: 0.3469 },
  { image: 'assets/clue3.jpg',  x: 0.669,  y: 0.0651 },
  { image: 'assets/clue4.jpg',  x: 0.2891, y: 0.1238 },
  { image: 'assets/clue5.jpg',  x: 0.1934, y: 0.3233 },
  { image: 'assets/clue6.jpg',  x: 0.1594, y: 0.2972 },
  { image: 'assets/clue7.jpg',  x: 0.3688, y: 0.7003 },
  { image: 'assets/clue8.jpg',  x: 0.2051, y: 0.0904 },
  { image: 'assets/clue9.jpg',  x: 0.3549, y: 0.1156 },
  { image: 'assets/clue10.jpg', x: 0.1831, y: 0.0305 },
  { image: 'assets/clue11.jpg', x: 0.1369, y: 0.4457 },
  { image: 'assets/clue12.jpg', x: 0.2341, y: 0.6089 },
  { image: 'assets/clue13.jpg', x: 0.2468, y: 0.6945 },
  { image: 'assets/clue14.jpg', x: 0.4628, y: 0.6695 },
  { image: 'assets/clue15.jpg', x: 0.6019, y: 0.3633 },
  { image: 'assets/clue16.jpg', x: 0.5223, y: 0.3868 },
  { image: 'assets/clue17.jpg', x: 0.5303, y: 0.5039 },
  { image: 'assets/clue18.jpg', x: 0.4246, y: 0.1582 },
  { image: 'assets/clue19.jpg', x: 0.4177, y: 0.3682 },
  { image: 'assets/clue20.jpg', x: 0.6486, y: 0.104  },
  { image: 'assets/clue21.jpg', x: 0.63,   y: 0.0588 },
  { image: 'assets/clue22.jpg', x: 0.7803, y: 0.3456 },
  { image: 'assets/clue23.jpg', x: 0.7532, y: 0.4675 },
  { image: 'assets/clue24.jpg', x: 0.7389, y: 0.5863 },
  { image: 'assets/clue25.jpg', x: 0.6815, y: 0.9538 },
  { image: 'assets/clue26.jpg', x: 0.7643, y: 0.9562 },
  { image: 'assets/clue27.jpg', x: 0.8572, y: 0.8714 },
  { image: 'assets/clue28.jpg', x: 0.7394, y: 0.8617 },
  { image: 'assets/clue29.jpg', x: 0.7877, y: 0.7422 },
  { image: 'assets/clue30.jpg', x: 0.672,  y: 0.6154 },
  { image: 'assets/clue31.jpg', x: 0.7527, y: 0.222  },
  { image: 'assets/clue32.jpg', x: 0.4894, y: 0.3141 },
  { image: 'assets/clue33.jpg', x: 0.3875, y: 0.4005 },
  { image: 'assets/clue34.jpg', x: 0.2415, y: 0.5225 },
  { image: 'assets/clue35.jpg', x: 0.3248, y: 0.4692 },
  { image: 'assets/clue36.jpg', x: 0.3296, y: 0.3811 },
  { image: 'assets/clue37.jpg', x: 0.4103, y: 0.6622 },
  { image: 'assets/clue38.jpg', x: 0.4538, y: 0.3633 },
  { image: 'assets/clue39.jpg', x: 0.2845, y: 0.2826 },
];

const ROUNDS_PER_GAME = 5;

function pickLevels() {
  const shuffled = [...ALL_LEVELS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, ROUNDS_PER_GAME);
}

// Active levels for this session (set on init)
let LEVELS = [];

// Zoom controller reference set in initGame, read in onMapClick
let mapZoom        = null;
let currentMapScale = 1;   // mirrors the live zoom level so drawPin can compensate
let isPinHovered   = false; // true when cursor is within hover radius of the pending pin

// Normalised distance at which score reaches 0
const MAX_DIST = 0.5;

// STATE
const state = {
  currentLevel: 0,
  totalScore: 0,
  pendingPin: null,
  locked: false,
};

// DOM helper
const $ = id => document.getElementById(id);


// ENTRY
function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin') === 'true') {
    initBuilder();
  } else {
    initGame();
  }
}


// GAME MODE

function initGame() {
  LEVELS = pickLevels();
  $('game-mode').classList.remove('hidden');

  const mapImg    = $('map-img');
  const mapCanvas = $('map-canvas');

  function onMapReady() {
    syncCanvas(mapCanvas, mapImg, currentMapScale);
  }

  if (mapImg.complete && mapImg.naturalWidth) {
    onMapReady();
  } else {
    mapImg.addEventListener('load', onMapReady, { once: true });
  }

  new ResizeObserver(() => {
    syncCanvas(mapCanvas, mapImg, currentMapScale);
    drawGamePins();
  }).observe(mapImg);

  mapZoom = initMapZoom($('map-wrapper'), $('map-inner'), mapCanvas, (scale) => {
    syncCanvas(mapCanvas, $('map-img'), scale);
    drawGamePins();
  });
  mapCanvas.addEventListener('click', onMapClick);
  mapCanvas.addEventListener('mousemove', onMapMouseMove);
  mapCanvas.addEventListener('mouseleave', () => {
    if (isPinHovered) { isPinHovered = false; drawGamePins(); }
  });
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

  $('round-num').textContent   = `${idx + 1} / ${LEVELS.length}`;
  $('map-hint').textContent    = 'Click to place your guess';
  $('lock-btn').disabled       = true;
  $('result-overlay').classList.add('hidden');

  clearCanvas($('map-canvas'));
}

function onMapMouseMove(e) {
  if (!state.pendingPin || state.locked) {
    if (isPinHovered) { isPinHovered = false; drawGamePins(); }
    return;
  }
  const rect  = $('map-canvas').getBoundingClientRect();
  const pinSx = state.pendingPin.x * rect.width;
  const pinSy = state.pendingPin.y * rect.height;
  const dist  = Math.hypot(e.clientX - rect.left - pinSx, e.clientY - rect.top - pinSy);
  const next  = dist < 22;
  if (next !== isPinHovered) { isPinHovered = next; drawGamePins(); }
}

function onMapClick(e) {
  if (state.locked) return;
  if (mapZoom && mapZoom.wasDrag()) return;
  state.pendingPin = canvasCoords(e, $('map-canvas'));
  $('lock-btn').disabled = false;
  $('map-hint').textContent = 'Happy with your guess? Lock it in!';
  drawGamePins();
}

function lockGuess() {
  if (!state.pendingPin || state.locked) return;
  state.locked = true;

  const level = LEVELS[state.currentLevel];
  const score = calcScore(state.pendingPin.x, state.pendingPin.y, level.x, level.y);
  state.totalScore += score;

  $('total-score').textContent = state.totalScore.toLocaleString();

  // Populate result overlay
  $('result-score').textContent = score.toLocaleString();
  $('result-fill').style.width  = `${(score / 5000) * 100}%`;

  const msgs = roundMessages(score);
  $('result-msg').textContent = msgs;

  const isLast = state.currentLevel === LEVELS.length - 1;
  $('next-btn').textContent = isLast ? 'See Final Score' : 'Next Round';

  // Draw result map
  const resultImg    = $('result-map-img');
  const resultCanvas = $('result-canvas');

  function showResult() {
    syncCanvas(resultCanvas, resultImg);
    drawResultPins(resultCanvas, level.x, level.y, state.pendingPin.x, state.pendingPin.y);
    $('result-overlay').classList.remove('hidden');
  }

  if (resultImg.complete && resultImg.naturalWidth) {
    showResult();
  } else {
    resultImg.addEventListener('load', showResult, { once: true });
  }

  new ResizeObserver(() => {
    syncCanvas(resultCanvas, resultImg);
    drawResultPins(resultCanvas, level.x, level.y, state.pendingPin.x, state.pendingPin.y);
  }).observe(resultImg);

  // Easter eggs
  if (score === 5000) {
    setTimeout(triggerCharlie, 400);
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
  $('result-overlay').classList.add('hidden');

  const maxScore = LEVELS.length * 5000;
  $('final-score').textContent = state.totalScore.toLocaleString();
  $('max-score').textContent   = maxScore.toLocaleString();

  const pct = state.totalScore / maxScore;
  let msg;
  if (pct >= 0.9)      msg = "You know every corner of this home by heart! Trophy earned.";
  else if (pct >= 0.7) msg = "Impressive. You clearly spend quality time in every room.";
  else if (pct >= 0.5) msg = "Not bad! A few more years and you will know every nook.";
  else                 msg = "Maybe ask Charlie for tips. She has the whole place mapped.";

  $('end-message').textContent = msg;
  $('end-screen').classList.remove('hidden');
}

function roundMessages(score) {
  if (score === 5000) return "Incredible! A perfect score!";
  if (score >= 4000)  return "So close! Outstanding guess.";
  if (score >= 2500)  return "Solid guess! You know this house well.";
  if (score >= 1000)  return "Not bad. Keep exploring!";
  return "A tough one. Better luck next round!";
}


// CANVAS UTILITIES

function syncCanvas(canvas, img, scale = 1) {
  const dpr = window.devicePixelRatio || 1;
  // Buffer = CSS pixels x dpr x zoom so it maps 1:1 with physical screen
  // pixels at every zoom level. The CSS transform on map-inner handles the
  // visual scaling; we just make sure the canvas has enough pixels to stay
  // crisp. clientWidth/clientHeight give the unscaled layout size, which is
  // the right coordinate space for pin drawing.
  canvas.width  = img.clientWidth  * dpr * scale;
  canvas.height = img.clientHeight * dpr * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr * scale, dpr * scale);
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function canvasCoords(mouseEvent, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (mouseEvent.clientX - rect.left) / rect.width,
    y: (mouseEvent.clientY - rect.top)  / rect.height,
  };
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// scale: current CSS zoom level -- dividing by it keeps the pin a constant screen size.
// hovered: draw the pin slightly larger when the cursor is near it.
function drawPin(ctx, w, h, xFrac, yFrac, color, label, { scale = 1, hovered = false } = {}) {
  const x      = xFrac * w;
  const y      = yFrac * h;
  const baseR  = hovered ? 14 : 11;
  const r      = baseR   / scale;
  const stem   = 8       / scale;
  const lw     = 2.5     / scale;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur  = 10 / scale;

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.shadowBlur  = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = lw;
  ctx.stroke();

  ctx.fillStyle    = '#fff';
  ctx.font         = `bold ${Math.round(r * 0.9)}px sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);

  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.lineTo(x, y + r + stem);
  ctx.strokeStyle = color;
  ctx.lineWidth   = lw;
  ctx.stroke();

  ctx.restore();
}

function drawLine(ctx, w, h, x1f, y1f, x2f, y2f) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1f * w, y1f * h);
  ctx.lineTo(x2f * w, y2f * h);
  ctx.strokeStyle = 'rgba(255, 200, 0, 0.9)';
  ctx.lineWidth   = 3;
  ctx.setLineDash([9, 5]);
  ctx.stroke();
  ctx.restore();
}

// Redraws just the user's pending pin on the mini-map
function drawGamePins() {
  const canvas = $('map-canvas');
  const ctx    = canvas.getContext('2d');
  const w      = canvas.offsetWidth;
  const h      = canvas.offsetHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state.pendingPin) {
    drawPin(ctx, w, h, state.pendingPin.x, state.pendingPin.y, cssVar('--red'), '?',
      { scale: currentMapScale, hovered: isPinHovered });
  }
}

// Draws both pins + line on the result map
function drawResultPins(canvas, tx, ty, ux, uy) {
  const ctx = canvas.getContext('2d');
  const w   = canvas.offsetWidth;
  const h   = canvas.offsetHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawLine(ctx, w, h, ux, uy, tx, ty);
  drawPin(ctx, w, h, tx, ty, cssVar('--correct'), '✓', { scale: 1 });
  drawPin(ctx, w, h, ux, uy, cssVar('--red'),     '✗', { scale: 1 });
}


// SCORING
function calcScore(ux, uy, tx, ty) {
  const dist = Math.hypot(ux - tx, uy - ty);
  return Math.max(0, Math.round(5000 * (1 - dist / MAX_DIST)));
}


// CHARLIE EASTER EGG
function triggerCharlie() {
  const wrap = $('charlie-wrap');
  wrap.style.animation = 'none';
  void wrap.offsetWidth;
  wrap.style.animation = '';
  wrap.classList.remove('hidden');
  setTimeout(() => wrap.classList.add('hidden'), 4200);
}


// MAP ZOOM / PAN

function initMapZoom(wrapper, inner, canvas, onZoomChange) {
  let scale = 1, offX = 0, offY = 0;
  let pointerDown = false, dragMoved = false, lastX = 0, lastY = 0;
  const MIN = 1, MAX = 5;

  function apply() {
    if (scale <= 1) {
      inner.style.transform = '';
    } else {
      inner.style.transform = `translate(${offX}px, ${offY}px) scale(${scale})`;
    }
    canvas.style.cursor = scale > 1
      ? (pointerDown ? 'grabbing' : 'grab')
      : 'crosshair';
    currentMapScale = scale;
    if (onZoomChange) onZoomChange(scale);
  }

  function clamp() {
    if (scale <= 1) { offX = 0; offY = 0; return; }
    offX = Math.min(0, Math.max(wrapper.clientWidth  * (1 - scale), offX));
    offY = Math.min(0, Math.max(wrapper.clientHeight * (1 - scale), offY));
  }

  // Scroll-wheel zoom, centered on the cursor position inside the wrapper
  wrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect  = wrapper.getBoundingClientRect();
    const mx    = (e.clientX - rect.left)  / (rect.width  / wrapper.clientWidth);
    const my    = (e.clientY - rect.top)   / (rect.height / wrapper.clientHeight);
    const delta = e.deltaY < 0 ? 1.25 : 0.8;
    const next  = Math.min(MAX, Math.max(MIN, scale * delta));
    if (next === scale) return;
    offX   = mx - (mx - offX) * (next / scale);
    offY   = my - (my - offY) * (next / scale);
    scale  = next;
    clamp();
    apply();
  }, { passive: false });

  // Pointer drag to pan (works for mouse and touch)
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pointerDown = true;
    dragMoved   = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    apply();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true;
    if (dragMoved && scale > 1) {
      offX += dx;
      offY += dy;
      lastX = e.clientX;
      lastY = e.clientY;
      clamp();
      apply();
    }
  });

  canvas.addEventListener('pointerup', () => {
    pointerDown = false;
    apply();
  });

  // Double-click to reset zoom
  canvas.addEventListener('dblclick', () => {
    scale = 1; offX = 0; offY = 0;
    inner.style.transition = 'transform 0.3s ease';
    apply();
    setTimeout(() => { inner.style.transition = ''; }, 320);
  });

  return {
    // Returns true if the last pointerdown ended as a drag, not a tap/click
    wasDrag: () => dragMoved,
  };
}


// BUILDER MODE

function initBuilder() {
  $('builder-mode').classList.remove('hidden');

  const mapImg   = $('builder-map-img');
  const canvas   = $('builder-canvas');
  let builderPin = null;

  function onReady() { syncCanvas(canvas, mapImg); }
  if (mapImg.complete && mapImg.naturalWidth) onReady();
  else mapImg.addEventListener('load', onReady, { once: true });

  new ResizeObserver(() => {
    syncCanvas(canvas, mapImg);
    if (builderPin) redrawBuilderPin(canvas, builderPin);
  }).observe(mapImg);

  canvas.addEventListener('click', (e) => {
    const p = canvasCoords(e, canvas);
    builderPin = { x: +p.x.toFixed(4), y: +p.y.toFixed(4) };

    redrawBuilderPin(canvas, builderPin);

    $('builder-coord-display').textContent = `x: ${builderPin.x}, y: ${builderPin.y}`;
    $('builder-pin-info').classList.remove('hidden');
    $('generate-btn').disabled = false;
  });

  $('generate-btn').addEventListener('click', () => {
    const filename = $('builder-filename').value.trim();
    if (!filename)   { alert('Enter an image filename first.'); return; }
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
  drawPin(canvas.getContext('2d'), w, h, pin.x, pin.y, cssVar('--red'), '📍');
}


init();
