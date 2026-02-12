const canvas = document.getElementById("snakeCanvas");
const ctx = canvas.getContext("2d");

const gameShell = document.getElementById("gameShell");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const speedValue = document.getElementById("speedValue");
const statusText = document.getElementById("statusText");
const restartBtn = document.getElementById("restartBtn");
const wrapToggle = document.getElementById("wrapToggle");

const COLS = 30;
const ROWS = 20;
const CELL_SIZE = 20;

const BASE_INTERVAL = 170;
const MIN_INTERVAL = 70;
const SPEED_STEP = 10;
const FOODS_PER_LEVEL = 5;
const STORAGE_KEY = "arcade_snake_best";
const WRAP_KEY = "arcade_snake_wrap";

canvas.width = COLS * CELL_SIZE;
canvas.height = ROWS * CELL_SIZE;

let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let score = 0;
let bestScore = 0;
let speedLevel = 1;
let isPaused = false;
let isGameOver = false;
let timerId = null;
let isWrapEnabled = false;

const controlsHint = "Arrows/WASD to move. Space to pause. R to restart.";

const directionMap = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const gameKeyCodes = new Set([
  ...Object.keys(directionMap),
  "Space",
  "KeyP",
  "KeyR",
]);

function loadBestScore() {
  const stored = Number.parseInt(localStorage.getItem(STORAGE_KEY), 10);
  bestScore = Number.isFinite(stored) ? stored : 0;
  bestValue.textContent = bestScore;
}

function loadWrapSetting() {
  isWrapEnabled = localStorage.getItem(WRAP_KEY) === "true";
  if (wrapToggle) {
    wrapToggle.checked = isWrapEnabled;
  }
}

function saveWrapSetting(value) {
  localStorage.setItem(WRAP_KEY, value ? "true" : "false");
}

function saveBestScore() {
  if (score > bestScore) {
    bestScore = score;
    bestValue.textContent = bestScore;
    localStorage.setItem(STORAGE_KEY, String(bestScore));
  }
}

function getSpeedLevel() {
  return Math.floor(score / FOODS_PER_LEVEL) + 1;
}

function getTickInterval() {
  return Math.max(MIN_INTERVAL, BASE_INTERVAL - (speedLevel - 1) * SPEED_STEP);
}

function resetSnake() {
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  snake = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
}

function randomEmptyCell() {
  const emptyCells = [];
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        emptyCells.push({ x, y });
      }
    }
  }

  if (emptyCells.length === 0) {
    return null;
  }

  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function placeFood() {
  const cell = randomEmptyCell();
  if (cell) {
    food = cell;
  }
}

function updateHud() {
  scoreValue.textContent = score;
  speedValue.textContent = speedLevel;
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

function drawGrid() {
  ctx.fillStyle = "#0e1a1c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(26, 166, 166, 0.18)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x += 1) {
    ctx.beginPath();
    ctx.moveTo(x * CELL_SIZE, 0);
    ctx.lineTo(x * CELL_SIZE, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y += 1) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL_SIZE);
    ctx.lineTo(canvas.width, y * CELL_SIZE);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const color = index === 0 ? "#49d1d1" : "#24b8b8";
    drawCell(segment.x, segment.y, color);
  });
}

function drawFood() {
  drawCell(food.x, food.y, "#ff6b6b");
}

function drawScene() {
  drawGrid();
  drawFood();
  drawSnake();
}

function isOppositeDirection(next, current) {
  return next.x === -current.x && next.y === -current.y;
}

function setDirection(next) {
  if (!isOppositeDirection(next, direction)) {
    nextDirection = next;
  }
}

function handleCollision(nextHead) {
  return snake.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y
  );
}

function isOutOfBounds(nextHead) {
  return (
    nextHead.x < 0 ||
    nextHead.x >= COLS ||
    nextHead.y < 0 ||
    nextHead.y >= ROWS
  );
}

function applyWrap(nextHead) {
  let { x, y } = nextHead;
  if (x < 0) x = COLS - 1;
  if (x >= COLS) x = 0;
  if (y < 0) y = ROWS - 1;
  if (y >= ROWS) y = 0;
  return { x, y };
}

function endGame() {
  isGameOver = true;
  saveBestScore();
  statusText.textContent = "Game over. Press R to restart.";
}

function tick() {
  if (isPaused || isGameOver) {
    return;
  }

  direction = { ...nextDirection };
  const head = snake[0];
  let nextHead = { x: head.x + direction.x, y: head.y + direction.y };

  if (isWrapEnabled) {
    nextHead = applyWrap(nextHead);
  } else if (isOutOfBounds(nextHead)) {
    endGame();
    return;
  }

  if (handleCollision(nextHead)) {
    endGame();
    return;
  }

  snake.unshift(nextHead);

  if (nextHead.x === food.x && nextHead.y === food.y) {
    score += 1;
    speedLevel = getSpeedLevel();
    placeFood();
  } else {
    snake.pop();
  }

  updateHud();
  drawScene();
  scheduleNextTick();
}

function scheduleNextTick() {
  clearTimeout(timerId);
  timerId = setTimeout(tick, getTickInterval());
}

function togglePause() {
  if (isGameOver) {
    return;
  }

  isPaused = !isPaused;
  if (isPaused) {
    statusText.textContent = "Paused. Press Space to resume.";
    clearTimeout(timerId);
  } else {
    statusText.textContent = controlsHint;
    scheduleNextTick();
  }
}

function restartGame() {
  clearTimeout(timerId);
  score = 0;
  speedLevel = 1;
  isPaused = false;
  isGameOver = false;
  statusText.textContent = controlsHint;
  resetSnake();
  placeFood();
  updateHud();
  drawScene();
  scheduleNextTick();
}

function handleKeyDown(event) {
  const code = event.code;
  const mappedDirection = directionMap[code];

  if (gameKeyCodes.has(code)) {
    event.preventDefault();
  }

  if (mappedDirection) {
    setDirection(mappedDirection);
    return;
  }

  if (code === "Space" || code === "KeyP") {
    togglePause();
  }

  if (code === "KeyR") {
    restartGame();
  }
}

restartBtn.addEventListener("click", restartGame);
window.addEventListener("keydown", handleKeyDown);

wrapToggle?.addEventListener("change", (event) => {
  isWrapEnabled = event.target.checked;
  saveWrapSetting(isWrapEnabled);
});

const focusTarget = gameShell || canvas;
const focusGame = () => {
  if (focusTarget && typeof focusTarget.focus === "function") {
    focusTarget.focus();
  }
};

focusTarget?.addEventListener("click", focusGame);

window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "arcade:focus") {
    focusGame();
  }
});

loadBestScore();
loadWrapSetting();
restartGame();
