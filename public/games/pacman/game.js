const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const shell = document.querySelector(".game-shell");
const wrap = document.querySelector(".canvas-wrap");
const overlay = document.getElementById("overlay");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const levelEl = document.getElementById("level");

const TILE_SIZE = 20;
const COLS = 19;
const ROWS = 21;
const BASE_WIDTH = COLS * TILE_SIZE;
const BASE_HEIGHT = ROWS * TILE_SIZE;

canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

const MAP = [
  "###################",
  "#o...............o#",
  "#.###.#####.###.#.#",
  "#.#.....#.....#.#.#",
  "#.#.###.#.###.#.#.#",
  "#.....#...#...#...#",
  "#.###.#.#####.#.###",
  "#.....#...#...#...#",
  "#.###.#.###.#.###.#",
  "#.....#...#...#...#",
  "#####.#.###.#.#####",
  "#.....#.....#.....#",
  "#.###.#.###.#.###.#",
  "#...#...#...#...#.#",
  "#.###.#.#####.#.###",
  "#...#...#...#...#.#",
  "#.###.#.###.#.###.#",
  "#.....#...#...#...#",
  "#.###.#####.###.#.#",
  "#o...............o#",
  "###################"
];

const DIRECTIONS = [
  { x: 0, y: -1, name: "up" },
  { x: 0, y: 1, name: "down" },
  { x: -1, y: 0, name: "left" },
  { x: 1, y: 0, name: "right" }
];

const KEY_TO_DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 }
};

const COLORS = {
  wall: "#1aa4a0",
  pellet: "#a9f3ee",
  power: "#ffe066",
  path: "#071417",
  pacman: "#ffd447",
  frightened: "#3d7cfa",
  ghostEyes: "#0b1b1d"
};

let grid = [];
let pelletCount = 0;
let score = 0;
let lives = 3;
let level = 1;
let best = Number(localStorage.getItem("arcade_pacman_best")) || 0;
let paused = false;
let gameOver = false;
let frightenedTimer = 0;
let levelBannerTimer = 0;
let lastTime = 0;

const home = { col: 9, row: 10 };

const pacman = {
  tileX: 9,
  tileY: 15,
  dir: { x: 0, y: 0 },
  nextDir: { x: 0, y: 0 },
  progress: 0,
  speedTilesPerSec: 6.4
};

let ghosts = [];
let ghostBaseSpeed = 5.2;

function buildGrid() {
  grid = MAP.map((row) => row.split(""));
  pelletCount = 0;
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      if (grid[r][c] === "." || grid[r][c] === "o") {
        pelletCount += 1;
      }
    }
  }
  clearHome();
}

function clearHome() {
  for (let r = 9; r <= 11; r += 1) {
    for (let c = 8; c <= 10; c += 1) {
      if (grid[r][c] === "." || grid[r][c] === "o") {
        pelletCount -= 1;
      }
      grid[r][c] = " ";
    }
  }
}

function resetPositions() {
  pacman.tileX = 9;
  pacman.tileY = 15;
  pacman.dir = { x: 0, y: 0 };
  pacman.nextDir = { x: 0, y: 0 };
  pacman.progress = 0;

  ghosts = [
    { tileX: 9, tileY: 10, color: "#ff6b6b", dir: { x: 1, y: 0 }, mode: "normal" },
    { tileX: 8, tileY: 10, color: "#f4a261", dir: { x: -1, y: 0 }, mode: "normal" },
    { tileX: 10, tileY: 10, color: "#48bfe3", dir: { x: 1, y: 0 }, mode: "normal" },
    { tileX: 9, tileY: 9, color: "#b388ff", dir: { x: 0, y: -1 }, mode: "normal" }
  ].map((ghost) => ({
    ...ghost,
    respawnTimer: 0,
    nextDir: { x: 0, y: 0 },
    progress: 0,
    speedTilesPerSec: ghostBaseSpeed
  }));
}

function resetGame() {
  score = 0;
  lives = 3;
  level = 1;
  ghostBaseSpeed = 5.2;
  frightenedTimer = 0;
  gameOver = false;
  paused = false;
  levelBannerTimer = 0;
  buildGrid();
  resetPositions();
  updateHud();
  setOverlay("");
}

function updateHud() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  livesEl.textContent = lives;
  levelEl.textContent = level;
}

function resizeCanvas() {
  const rect = wrap.getBoundingClientRect();
  const scale = Math.min(rect.width / BASE_WIDTH, rect.height / BASE_HEIGHT);
  canvas.style.width = `${BASE_WIDTH * scale}px`;
  canvas.style.height = `${BASE_HEIGHT * scale}px`;
}

function setOverlay(text) {
  overlay.textContent = text;
  overlay.classList.toggle("show", Boolean(text));
}

function isWall(col, row) {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    return true;
  }
  return grid[row][col] === "#";
}

function canMove(col, row, dir) {
  return !isWall(col + dir.x, row + dir.y);
}

function isCentered(entity) {
  return entity.progress <= 0.001 || (entity.dir.x === 0 && entity.dir.y === 0);
}

function stepEntity(entity, speedTilesPerSec, dt) {
  if (entity.dir.x === 0 && entity.dir.y === 0) {
    entity.progress = 0;
    return false;
  }
  let enteredTile = false;
  entity.progress += speedTilesPerSec * dt;
  while (entity.progress >= 1) {
    const nextCol = entity.tileX + entity.dir.x;
    const nextRow = entity.tileY + entity.dir.y;
    if (isWall(nextCol, nextRow)) {
      entity.dir = { x: 0, y: 0 };
      entity.progress = 0;
      break;
    }
    entity.tileX = nextCol;
    entity.tileY = nextRow;
    entity.progress -= 1;
    enteredTile = true;
  }
  return enteredTile;
}

function chooseChaseDirection(ghost) {
  const col = ghost.tileX;
  const row = ghost.tileY;
  const options = DIRECTIONS.filter((dir) => canMove(col, row, dir));
  const reverse = { x: -ghost.dir.x, y: -ghost.dir.y };
  const filtered =
    options.length > 1
      ? options.filter((dir) => dir.x !== reverse.x || dir.y !== reverse.y)
      : options;

  let bestOptions = [];
  let bestDist = Infinity;
  const pacX = pacman.tileX + pacman.dir.x * pacman.progress;
  const pacY = pacman.tileY + pacman.dir.y * pacman.progress;
  for (const dir of filtered) {
    const nextCol = col + dir.x;
    const nextRow = row + dir.y;
    const dist = Math.abs(nextCol - pacX) + Math.abs(nextRow - pacY);
    if (dist < bestDist) {
      bestDist = dist;
      bestOptions = [dir];
    } else if (dist === bestDist) {
      bestOptions.push(dir);
    }
  }
  return bestOptions[Math.floor(Math.random() * bestOptions.length)] || ghost.dir;
}

function chooseRandomDirection(ghost) {
  const col = ghost.tileX;
  const row = ghost.tileY;
  const options = DIRECTIONS.filter((dir) => canMove(col, row, dir));
  const reverse = { x: -ghost.dir.x, y: -ghost.dir.y };
  const filtered =
    options.length > 1
      ? options.filter((dir) => dir.x !== reverse.x || dir.y !== reverse.y)
      : options;
  return filtered[Math.floor(Math.random() * filtered.length)] || ghost.dir;
}

function chooseHomeDirection(ghost) {
  const col = ghost.tileX;
  const row = ghost.tileY;
  const options = DIRECTIONS.filter((dir) => canMove(col, row, dir));
  let best = options[0] || ghost.dir;
  let bestDist = Infinity;
  for (const dir of options) {
    const dist =
      Math.abs(col + dir.x - home.col) + Math.abs(row + dir.y - home.row);
    if (dist < bestDist) {
      bestDist = dist;
      best = dir;
    }
  }
  return best;
}

function eatPellet() {
  const col = pacman.tileX;
  const row = pacman.tileY;
  const tile = grid[row][col];
  if (tile === "." || tile === "o") {
    grid[row][col] = " ";
    pelletCount -= 1;
    if (tile === ".") {
      score += 10;
    } else {
      score += 50;
      frightenedTimer = 6;
      ghosts.forEach((ghost) => {
        if (ghost.mode !== "eaten" && ghost.mode !== "respawn") {
          ghost.mode = "frightened";
        }
      });
    }
    if (score > best) {
      best = score;
      localStorage.setItem("arcade_pacman_best", String(best));
    }
    updateHud();
  }
}

function checkCollisions() {
  const pacX = pacman.tileX + pacman.dir.x * pacman.progress;
  const pacY = pacman.tileY + pacman.dir.y * pacman.progress;
  for (const ghost of ghosts) {
    const ghostX = ghost.tileX + ghost.dir.x * ghost.progress;
    const ghostY = ghost.tileY + ghost.dir.y * ghost.progress;
    const dx = ghostX - pacX;
    const dy = ghostY - pacY;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.45) {
      if (ghost.mode === "frightened") {
        ghost.mode = "eaten";
        ghost.dir = { x: 0, y: 0 };
        ghost.progress = 0;
        score += 200;
        updateHud();
      } else if (ghost.mode !== "eaten" && ghost.mode !== "respawn") {
        lives -= 1;
        updateHud();
        if (lives <= 0) {
          gameOver = true;
          setOverlay("Game Over");
        } else {
          setOverlay("Ready");
          paused = true;
          setTimeout(() => {
            if (!gameOver) {
              paused = false;
              setOverlay("");
              resetPositions();
            }
          }, 900);
        }
      }
    }
  }
}

function nextLevel() {
  level += 1;
  ghostBaseSpeed += 0.35;
  buildGrid();
  resetPositions();
  updateHud();
  levelBannerTimer = 1.2;
  setOverlay(`Level ${level}`);
}

function updatePacman(dt) {
  const col = pacman.tileX;
  const row = pacman.tileY;
  if (isCentered(pacman) && canMove(col, row, pacman.nextDir)) {
    pacman.dir = { ...pacman.nextDir };
  }
  if (isCentered(pacman) && !canMove(col, row, pacman.dir)) {
    pacman.dir = { x: 0, y: 0 };
  }
  if (stepEntity(pacman, pacman.speedTilesPerSec, dt)) {
    eatPellet();
  }
}

function updateGhost(ghost, dt) {
  if (ghost.mode === "respawn") {
    ghost.respawnTimer -= dt;
    if (ghost.respawnTimer <= 0) {
      ghost.mode = frightenedTimer > 0 ? "frightened" : "normal";
    }
    return;
  }
  const speed =
    ghost.mode === "frightened"
      ? ghostBaseSpeed * 0.6
      : ghost.mode === "eaten"
        ? ghostBaseSpeed * 1.35
        : ghostBaseSpeed;

  const col = ghost.tileX;
  const row = ghost.tileY;
  if (isCentered(ghost) || !canMove(col, row, ghost.dir)) {
    if (ghost.mode === "eaten") {
      ghost.dir = chooseHomeDirection(ghost);
    } else if (ghost.mode === "frightened") {
      ghost.dir = chooseRandomDirection(ghost);
    } else {
      ghost.dir = chooseChaseDirection(ghost);
    }
  }
  stepEntity(ghost, speed, dt);

  if (ghost.mode === "eaten") {
    if (
      ghost.tileX === home.col &&
      ghost.tileY === home.row &&
      isCentered(ghost)
    ) {
      ghost.mode = "respawn";
      ghost.respawnTimer = 1.2;
      ghost.dir = { x: 0, y: 0 };
      ghost.progress = 0;
    }
  }
}

function update(dt) {
  if (gameOver || paused) {
    return;
  }

  if (frightenedTimer > 0) {
    frightenedTimer = Math.max(0, frightenedTimer - dt);
    if (frightenedTimer === 0) {
      ghosts.forEach((ghost) => {
        if (ghost.mode === "frightened") {
          ghost.mode = "normal";
        }
      });
    }
  }

  updatePacman(dt);
  ghosts.forEach((ghost) => updateGhost(ghost, dt));
  checkCollisions();

  if (pelletCount <= 0) {
    nextLevel();
  }
}

function drawMaze() {
  ctx.fillStyle = COLORS.path;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const tile = grid[r][c];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      if (tile === "#") {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (tile === ".") {
        ctx.fillStyle = COLORS.pellet;
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === "o") {
        ctx.fillStyle = COLORS.power;
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPacman(time) {
  const x =
    (pacman.tileX + pacman.dir.x * pacman.progress) * TILE_SIZE +
    TILE_SIZE / 2;
  const y =
    (pacman.tileY + pacman.dir.y * pacman.progress) * TILE_SIZE +
    TILE_SIZE / 2;
  const mouth = 0.35 + Math.abs(Math.sin(time * 0.01)) * 0.25;
  const angle = Math.atan2(pacman.dir.y, pacman.dir.x) || 0;
  ctx.fillStyle = COLORS.pacman;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(
    x,
    y,
    TILE_SIZE * 0.45,
    angle + mouth,
    angle - mouth,
    false
  );
  ctx.closePath();
  ctx.fill();
}

function drawGhost(ghost) {
  const x =
    (ghost.tileX + ghost.dir.x * ghost.progress) * TILE_SIZE +
    TILE_SIZE / 2;
  const y =
    (ghost.tileY + ghost.dir.y * ghost.progress) * TILE_SIZE +
    TILE_SIZE / 2;
  const bodyColor =
    ghost.mode === "frightened" ? COLORS.frightened : ghost.color;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(x, y, TILE_SIZE * 0.42, Math.PI, 0, false);
  ctx.lineTo(x + TILE_SIZE * 0.42, y + TILE_SIZE * 0.42);
  ctx.lineTo(x - TILE_SIZE * 0.42, y + TILE_SIZE * 0.42);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x - 4, y - 2, 3, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.ghostEyes;
  ctx.beginPath();
  ctx.arc(x - 4, y - 2, 1.5, 0, Math.PI * 2);
  ctx.arc(x + 4, y - 2, 1.5, 0, Math.PI * 2);
  ctx.fill();
}

function draw(time) {
  drawMaze();
  drawPacman(time);
  ghosts.forEach(drawGhost);
}

function gameLoop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  if (levelBannerTimer > 0) {
    levelBannerTimer -= dt;
    if (levelBannerTimer <= 0) {
      setOverlay("");
    }
  }

  update(dt);
  draw(timestamp);

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (KEY_TO_DIR[key]) {
    event.preventDefault();
    pacman.nextDir = { ...KEY_TO_DIR[key] };
  }
  if (key === "p") {
    event.preventDefault();
    if (!gameOver) {
      paused = !paused;
      setOverlay(paused ? "Paused" : "");
    }
  }
  if (key === "r") {
    event.preventDefault();
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (KEY_TO_DIR[key]) {
    event.preventDefault();
  }
});

shell.addEventListener("click", () => shell.focus());
window.addEventListener("resize", resizeCanvas);

buildGrid();
resetPositions();
updateHud();
resizeCanvas();
shell.focus();
requestAnimationFrame(gameLoop);
