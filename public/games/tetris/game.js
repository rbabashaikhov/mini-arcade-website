const canvas = document.getElementById("tetrisCanvas");
const ctx = canvas.getContext("2d");
const gameShell = document.getElementById("gameShell");
const nextCanvases = Array.from(document.querySelectorAll(".nextCanvas"));
const nextContexts = nextCanvases.map((node) => node.getContext("2d"));

const scoreValue = document.getElementById("scoreValue");
const levelValue = document.getElementById("levelValue");
const linesValue = document.getElementById("linesValue");
const bestValue = document.getElementById("bestValue");
const statusText = document.getElementById("statusText");
const restartBtn = document.getElementById("restartBtn");

const COLS = 10;
const ROWS = 20;
const BEST_KEY = "arcade_tetris_best";
const layout = document.querySelector(".layout");
const sidePanel = document.querySelector(".side-panel");
const scrollKeys = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  " ",
]);

let blockSize = 0;
let canvasWidth = 0;
let canvasHeight = 0;

const COLORS = {
  I: "#38bdf8",
  J: "#2563eb",
  L: "#f97316",
  O: "#facc15",
  S: "#22c55e",
  T: "#a855f7",
  Z: "#ef4444",
  GHOST: "rgba(148, 163, 184, 0.35)",
  EMPTY: "#0b1326",
};

const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
};

const KICK_TESTS = [0, 1, -1, 2, -2];

let board = createBoard();
let current = null;
let nextQueue = [];
let bag = [];
let score = 0;
let level = 1;
let lines = 0;
let bestScore = Number(localStorage.getItem(BEST_KEY)) || 0;

const DAS_DELAY = 140;
const ARR_INTERVAL = 35;
const SOFT_DROP_INTERVAL = 45;
const LOCK_DELAY = 450;

let dropCounter = 0;
let dropInterval = 800;
let lastTime = 0;
let isPaused = false;
let isGameOver = false;
let lockTimer = 0;
let softDropActive = false;
let moveLeftHeld = false;
let moveRightHeld = false;
let lastMoveDir = 0;
let activeMoveDir = 0;
let dasTimer = 0;
let arrTimer = 0;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function refillBag() {
  bag = shuffle(Object.keys(SHAPES).slice());
}

function pullFromBag() {
  if (bag.length === 0) {
    refillBag();
  }
  return bag.pop();
}

function ensureQueue() {
  while (nextQueue.length < 3) {
    nextQueue.push(pullFromBag());
  }
}

function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

function rotateMatrix(matrix, direction) {
  const size = matrix.length;
  const rotated = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (direction === 1) {
        rotated[x][size - 1 - y] = matrix[y][x];
      } else {
        rotated[size - 1 - x][y] = matrix[y][x];
      }
    }
  }
  return rotated;
}

function spawnPiece() {
  ensureQueue();
  const type = nextQueue.shift();
  const shape = cloneMatrix(SHAPES[type]);
  current = {
    type,
    matrix: shape,
    x: Math.floor((COLS - shape.length) / 2),
    y: -1,
  };
  if (collides(current.matrix, current.x, current.y)) {
    isGameOver = true;
    statusText.textContent = "Game over. Press R to restart.";
  }
  lockTimer = 0;
  dropCounter = 0;
  ensureQueue();
}

function collides(matrix, offsetX, offsetY) {
  for (let y = 0; y < matrix.length; y += 1) {
    for (let x = 0; x < matrix[y].length; x += 1) {
      if (!matrix[y][x]) continue;
      const newX = offsetX + x;
      const newY = offsetY + y;
      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }
      if (newY >= 0 && board[newY][newX]) {
        return true;
      }
    }
  }
  return false;
}

function mergePiece() {
  current.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      const boardY = current.y + y;
      if (boardY < 0) {
        isGameOver = true;
        return;
      }
      board[boardY][current.x + x] = current.type;
    });
  });
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board[y].every((cell) => cell !== null)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared += 1;
      y += 1;
    }
  }
  if (cleared > 0) {
    const lineScores = [0, 100, 300, 500, 800];
    score += lineScores[cleared] * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 800 - (level - 1) * 60);
    updateScoreboard();
  }
}

function updateScoreboard() {
  scoreValue.textContent = String(score);
  levelValue.textContent = String(level);
  linesValue.textContent = String(lines);
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem(BEST_KEY, String(bestScore));
  }
  bestValue.textContent = String(bestScore);
}

function drawCell(context, x, y, color, size) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);
  context.strokeStyle = "rgba(15, 23, 42, 0.35)";
  context.strokeRect(x * size, y * size, size, size);
}

function drawBoard() {
  ctx.fillStyle = COLORS.EMPTY;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const cell = board[y][x];
      if (cell) {
        drawCell(ctx, x, y, COLORS[cell], blockSize);
      }
    }
  }
}

function drawPiece(matrix, offsetX, offsetY, color, context, size) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (!value) return;
      drawCell(context, offsetX + x, offsetY + y, color, size);
    });
  });
}

function getGhostPosition() {
  let ghostY = current.y;
  while (!collides(current.matrix, current.x, ghostY + 1)) {
    ghostY += 1;
  }
  return ghostY;
}

function drawGhost() {
  const ghostY = getGhostPosition();
  drawPiece(current.matrix, current.x, ghostY, COLORS.GHOST, ctx, blockSize);
}

function drawCurrent() {
  drawPiece(
    current.matrix,
    current.x,
    current.y,
    COLORS[current.type],
    ctx,
    blockSize
  );
}

function drawNext() {
  const nextCtx = nextContexts[0];
  if (!nextCtx) return;
  nextCtx.clearRect(0, 0, nextCtx.canvas.width, nextCtx.canvas.height);
  nextCtx.fillStyle = COLORS.EMPTY;
  nextCtx.fillRect(0, 0, nextCtx.canvas.width, nextCtx.canvas.height);
  const type = nextQueue[0];
  if (!type) return;
  const size = nextCtx.canvas.width / 4;
  const matrix = SHAPES[type];
  const offset = Math.floor((4 - matrix.length) / 2);
  drawPiece(matrix, offset, offset, COLORS[type], nextCtx, size);
}

function draw() {
  drawBoard();
  drawGhost();
  drawCurrent();
  drawNext();
}

function movePiece(dir) {
  if (isPaused || isGameOver) return;
  if (!collides(current.matrix, current.x + dir, current.y)) {
    current.x += dir;
  }
}

function softDrop() {
  if (isPaused || isGameOver) return;
  if (!collides(current.matrix, current.x, current.y + 1)) {
    current.y += 1;
  } else {
    lockPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  if (isPaused || isGameOver) return;
  const ghostY = getGhostPosition();
  const distance = ghostY - current.y;
  current.y = ghostY;
  score += distance * 2;
  lockPiece();
}

function rotatePiece(direction) {
  if (isPaused || isGameOver) return;
  const rotated = rotateMatrix(current.matrix, direction);
  for (const offset of KICK_TESTS) {
    if (!collides(rotated, current.x + offset, current.y)) {
      current.matrix = rotated;
      current.x += offset;
      resetLockDelay();
      return;
    }
  }
}

function resetLockDelay() {
  if (collides(current.matrix, current.x, current.y + 1)) {
    lockTimer = 0;
  }
}

function isGrounded() {
  return collides(current.matrix, current.x, current.y + 1);
}

function stepDown() {
  if (!isGrounded()) {
    current.y += 1;
    return true;
  }
  return false;
}

function updateHorizontalMovement(delta) {
  let nextDir = 0;
  if (moveLeftHeld && moveRightHeld) {
    nextDir = lastMoveDir;
  } else if (moveLeftHeld) {
    nextDir = -1;
  } else if (moveRightHeld) {
    nextDir = 1;
  }

  if (nextDir === 0) {
    activeMoveDir = 0;
    dasTimer = 0;
    arrTimer = 0;
    return;
  }

  if (activeMoveDir !== nextDir) {
    activeMoveDir = nextDir;
    dasTimer = 0;
    arrTimer = 0;
    movePiece(activeMoveDir);
    resetLockDelay();
    return;
  }

  dasTimer += delta;
  if (dasTimer < DAS_DELAY) return;
  arrTimer += delta;
  while (arrTimer >= ARR_INTERVAL) {
    movePiece(activeMoveDir);
    resetLockDelay();
    arrTimer -= ARR_INTERVAL;
  }
}

function lockPiece() {
  mergePiece();
  if (isGameOver) return;
  clearLines();
  lockTimer = 0;
  dropCounter = 0;
  spawnPiece();
}

function resetGame() {
  board = createBoard();
  nextQueue = [];
  bag = [];
  score = 0;
  level = 1;
  lines = 0;
  dropInterval = 800;
  dropCounter = 0;
  lastTime = 0;
  isPaused = false;
  isGameOver = false;
  lockTimer = 0;
  softDropActive = false;
  moveLeftHeld = false;
  moveRightHeld = false;
  lastMoveDir = 0;
  activeMoveDir = 0;
  dasTimer = 0;
  arrTimer = 0;
  statusText.textContent =
    "Arrows move. Z/X rotate. Space hard drop. P pause. R restart.";
  updateScoreboard();
  spawnPiece();
}

function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  statusText.textContent = isPaused
    ? "Paused. Press P to resume."
    : "Arrows move. Z/X rotate. Space hard drop. P pause. R restart.";
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  if (!isPaused && !isGameOver) {
    updateHorizontalMovement(delta);
    dropCounter += delta;
    const currentDropInterval = softDropActive
      ? SOFT_DROP_INTERVAL
      : dropInterval;
    if (dropCounter > currentDropInterval) {
      dropCounter = 0;
      if (!stepDown()) {
        lockTimer = Math.max(lockTimer, 0);
      }
    }
    if (isGrounded()) {
      lockTimer += delta;
      if (lockTimer >= LOCK_DELAY) {
        lockPiece();
      }
    } else {
      lockTimer = 0;
    }
  }
  draw();
  requestAnimationFrame(update);
}

function handleKeyDown(event, fromMessage = false) {
  const { key, code } = event;
  const safeKey = key || "";
  const lowered = safeKey.toLowerCase();

  // Safety: if ever typing into an input/textarea/contenteditable, don't hijack
  const ae = document.activeElement;
  const tag = ae?.tagName || "";
  const isTyping =
    tag === "INPUT" || tag === "TEXTAREA" || (ae && ae.isContentEditable);

  if (!fromMessage && isTyping) return;

  const isSpace = safeKey === " " || code === "Space";

  // Always prevent scroll for gameplay keys (even in fullscreen)
  if (!fromMessage && (scrollKeys.has(safeKey) || isSpace || ["z", "x", "p", "r"].includes(lowered))) {
    event.preventDefault();
  }

  // Prefer code to be stable across layouts
  if (code === "ArrowLeft") {
    if (!moveLeftHeld) {
      moveLeftHeld = true;
      lastMoveDir = -1;
      activeMoveDir = 0;
      dasTimer = 0;
      arrTimer = 0;
      movePiece(-1);
      resetLockDelay();
    }
  }
  if (code === "ArrowRight") {
    if (!moveRightHeld) {
      moveRightHeld = true;
      lastMoveDir = 1;
      activeMoveDir = 0;
      dasTimer = 0;
      arrTimer = 0;
      movePiece(1);
      resetLockDelay();
    }
  }
  if (code === "ArrowDown") {
    softDropActive = true;
  }
  if (code === "Space") hardDrop();
  if (code === "ArrowUp" || code === "KeyX") rotatePiece(1);
  if (code === "KeyZ") rotatePiece(-1);
  if (code === "KeyP") togglePause();
  if (code === "KeyR") resetGame();
}


function handleKeyUp(event, fromMessage = false) {
  // keep for future (DAS/ARR), but prevent scroll if needed
  if (!fromMessage) {
    const { key, code } = event;
    const safeKey = key || "";
    const isSpace = safeKey === " " || code === "Space";
    const lowered = safeKey.toLowerCase();
    if (scrollKeys.has(safeKey) || isSpace || ["z", "x", "p", "r"].includes(lowered)) {
      event.preventDefault();
    }
  }
  if (event.code === "ArrowLeft") {
    moveLeftHeld = false;
  }
  if (event.code === "ArrowRight") {
    moveRightHeld = false;
  }
  if (event.code === "ArrowDown") {
    softDropActive = false;
  }
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "arcade:key") return;
  const synthetic = {
    key: data.key || "",
    code: data.code || "",
    preventDefault() {},
  };
  if (data.down) {
    handleKeyDown(synthetic, true);
  } else {
    handleKeyUp(synthetic, true);
  }
});

function resizeCanvas() {
  if (!layout) return;
  const layoutRect = layout.getBoundingClientRect();
  let availableWidth = layoutRect.width;
  const availableHeight = layoutRect.height;
  if (sidePanel) {
    const panelRect = sidePanel.getBoundingClientRect();
    const panelBelow = panelRect.top - layoutRect.top > 1;
    if (!panelBelow) {
      const gap = Number.parseFloat(getComputedStyle(layout).columnGap) || 0;
      availableWidth = Math.max(0, availableWidth - panelRect.width - gap);
    }
  }

  const maxBlockByHeight = Math.floor(availableHeight / ROWS);
  const maxBlockByWidth = Math.floor(availableWidth / COLS);
  const nextBlockSize = Math.max(1, Math.min(maxBlockByHeight, maxBlockByWidth));
  const displayWidth = nextBlockSize * COLS;
  const displayHeight = nextBlockSize * ROWS;
  const deviceScale = window.devicePixelRatio || 1;

  blockSize = nextBlockSize;
  canvasWidth = displayWidth;
  canvasHeight = displayHeight;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  canvas.width = Math.max(1, Math.floor(displayWidth * deviceScale));
  canvas.height = Math.max(1, Math.floor(displayHeight * deviceScale));
  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
}

function focusGame() {
  if (gameShell && document.activeElement !== gameShell) {
    gameShell.focus();
  }
}

function updateLayoutMode() {
  const isFullscreen = Boolean(document.fullscreenElement);
  const compact =
    !isFullscreen && (window.innerWidth < 700 || window.innerHeight < 700);
  document.body.classList.toggle("is-fullscreen", isFullscreen);
  document.body.classList.toggle("compact", compact);
  resizeCanvas();
}

function handleFullscreenChange() {
  updateLayoutMode();
  focusGame();
}

canvas.addEventListener("pointerdown", focusGame);
layout?.addEventListener("pointerdown", focusGame);
window.addEventListener("load", focusGame);
window.addEventListener("resize", updateLayoutMode);
document.addEventListener("fullscreenchange", handleFullscreenChange);

restartBtn.addEventListener("click", resetGame);

bestValue.textContent = String(bestScore);
updateLayoutMode();
resetGame();
requestAnimationFrame(update);
