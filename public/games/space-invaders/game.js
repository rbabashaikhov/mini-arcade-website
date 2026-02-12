const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const wrapper = document.getElementById("gameWrapper");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const livesValue = document.getElementById("livesValue");
const levelValue = document.getElementById("levelValue");
const statusText = document.getElementById("statusText");

const KEY_LEFT = new Set(["ArrowLeft", "KeyA"]);
const KEY_RIGHT = new Set(["ArrowRight", "KeyD"]);
const KEY_SHOOT = "Space";
const KEY_PAUSE = "KeyP";
const KEY_RESTART = "KeyR";

const BEST_KEY = "arcade_invaders_best";

const state = {
  keys: new Set(),
  score: 0,
  best: 0,
  lives: 3,
  level: 1,
  paused: false,
  gameOver: false,
  lastTime: 0,
  invaders: [],
  invaderDir: 1,
  invaderSpeed: 32,
  invaderDrop: 18,
  playerBullets: [],
  enemyBullets: [],
  player: null,
  shotCooldownMs: 220,
  lastShotAt: 0,
  enemyShotRate: 0.45,
  stars: []
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function initStars() {
  state.stars = Array.from({ length: 36 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.6 + 0.4
  }));
}

function createPlayer() {
  return {
    width: 46,
    height: 18,
    x: canvas.width / 2 - 23,
    y: canvas.height - 52,
    speed: 320,
    invulnerableUntil: 0
  };
}

function createInvaders(level) {
  const rows = 5;
  const cols = 10;
  const width = 32;
  const height = 22;
  const gapX = 14;
  const gapY = 12;
  const totalWidth = cols * width + (cols - 1) * gapX;
  const startX = (canvas.width - totalWidth) / 2;
  const startY = 60;
  const invaders = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      invaders.push({
        x: startX + col * (width + gapX),
        y: startY + row * (height + gapY),
        width,
        height,
        alive: true,
        col
      });
    }
  }

  state.invaderDir = 1;
  state.invaderSpeed = 30 + level * 8;
  state.enemyShotRate = 0.45 + level * 0.12;
  return invaders;
}

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.paused = false;
  state.gameOver = false;
  state.lastTime = 0;
  state.playerBullets = [];
  state.enemyBullets = [];
  state.player = createPlayer();
  state.invaders = createInvaders(state.level);
  state.lastShotAt = 0;
  statusText.textContent = "Space shoots. P pauses. R restarts.";
  pauseBtn.textContent = "Pause";
  syncHud();
}

function nextLevel() {
  state.level += 1;
  state.invaders = createInvaders(state.level);
  state.playerBullets = [];
  state.enemyBullets = [];
  state.lastShotAt = 0;
  statusText.textContent = `Level ${state.level} - stay sharp.`;
  syncHud();
}

function syncHud() {
  scoreValue.textContent = state.score;
  bestValue.textContent = state.best;
  livesValue.textContent = state.lives;
  levelValue.textContent = state.level;
}

function saveBestScore() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(BEST_KEY, String(state.best));
  }
}

function shootPlayer(now) {
  if (now - state.lastShotAt < state.shotCooldownMs) {
    return;
  }
  if (state.playerBullets.length > 0) {
    return;
  }

  const bullet = {
    x: state.player.x + state.player.width / 2 - 2,
    y: state.player.y - 10,
    width: 4,
    height: 10,
    speed: 520
  };
  state.playerBullets.push(bullet);
  state.lastShotAt = now;
}

function getBottomInvaders() {
  const byColumn = new Map();
  state.invaders.forEach((invader) => {
    if (!invader.alive) return;
    if (!byColumn.has(invader.col) || byColumn.get(invader.col).y < invader.y) {
      byColumn.set(invader.col, invader);
    }
  });
  return Array.from(byColumn.values());
}

function shootEnemy() {
  const shooters = getBottomInvaders();
  if (shooters.length === 0) return;
  const pick = shooters[Math.floor(Math.random() * shooters.length)];
  state.enemyBullets.push({
    x: pick.x + pick.width / 2 - 2,
    y: pick.y + pick.height + 2,
    width: 4,
    height: 10,
    speed: 240 + state.level * 14
  });
}

function updateInvaders(dt) {
  const aliveInvaders = state.invaders.filter((invader) => invader.alive);
  if (aliveInvaders.length === 0) {
    nextLevel();
    return;
  }

  const dx = state.invaderDir * state.invaderSpeed * dt;
  aliveInvaders.forEach((invader) => {
    invader.x += dx;
  });

  let minX = Infinity;
  let maxX = -Infinity;
  aliveInvaders.forEach((invader) => {
    minX = Math.min(minX, invader.x);
    maxX = Math.max(maxX, invader.x + invader.width);
  });

  const margin = 24;
  if (minX <= margin || maxX >= canvas.width - margin) {
    state.invaderDir *= -1;
    aliveInvaders.forEach((invader) => {
      invader.y += state.invaderDrop;
    });
    state.invaderSpeed += 4 + state.level * 0.8;
  }

  const playerLine = state.player.y + state.player.height;
  if (aliveInvaders.some((invader) => invader.y + invader.height >= playerLine)) {
    state.gameOver = true;
    statusText.textContent = "Game over. Press R to restart.";
  }
}

function updateBullets(dt, now) {
  state.playerBullets.forEach((bullet) => {
    bullet.y -= bullet.speed * dt;
  });
  state.playerBullets = state.playerBullets.filter((bullet) => bullet.y + bullet.height > 0);

  state.enemyBullets.forEach((bullet) => {
    bullet.y += bullet.speed * dt;
  });
  state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.y < canvas.height + 20);

  state.playerBullets.forEach((bullet) => {
    state.invaders.forEach((invader) => {
      if (!invader.alive) return;
      if (rectsOverlap(bullet, invader)) {
        invader.alive = false;
        bullet.hit = true;
        state.score += 10;
        saveBestScore();
      }
    });
  });
  state.playerBullets = state.playerBullets.filter((bullet) => !bullet.hit);

  if (now < state.player.invulnerableUntil) {
    return;
  }

  state.enemyBullets.forEach((bullet) => {
    if (rectsOverlap(bullet, state.player)) {
      bullet.hit = true;
      state.lives -= 1;
      state.player.invulnerableUntil = now + 800;
      syncHud();
      if (state.lives <= 0) {
        state.gameOver = true;
        statusText.textContent = "Game over. Press R to restart.";
      }
    }
  });
  state.enemyBullets = state.enemyBullets.filter((bullet) => !bullet.hit);
}

function updatePlayer(dt, now) {
  let direction = 0;
  if ([...KEY_LEFT].some((key) => state.keys.has(key))) {
    direction -= 1;
  }
  if ([...KEY_RIGHT].some((key) => state.keys.has(key))) {
    direction += 1;
  }
  if (direction !== 0) {
    state.player.x += direction * state.player.speed * dt;
    state.player.x = clamp(
      state.player.x,
      16,
      canvas.width - state.player.width - 16
    );
  }

  if (state.keys.has(KEY_SHOOT)) {
    shootPlayer(now);
  }
}

function updateEnemyFire(dt) {
  if (Math.random() < state.enemyShotRate * dt) {
    shootEnemy();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#071214";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(120, 248, 230, 0.6)";
  state.stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(26, 166, 166, 0.6)";
  ctx.beginPath();
  ctx.moveTo(20, state.player.y + state.player.height + 10);
  ctx.lineTo(canvas.width - 20, state.player.y + state.player.height + 10);
  ctx.stroke();

  state.invaders.forEach((invader) => {
    if (!invader.alive) return;
    ctx.fillStyle = "#63f2d0";
    ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
    ctx.fillStyle = "#0b2224";
    ctx.fillRect(invader.x + 7, invader.y + 6, 5, 5);
    ctx.fillRect(invader.x + 20, invader.y + 6, 5, 5);
  });

  const invuln = performance.now() < state.player.invulnerableUntil;
  ctx.fillStyle = invuln ? "rgba(26, 166, 166, 0.4)" : "#1aa6a6";
  ctx.fillRect(
    state.player.x,
    state.player.y,
    state.player.width,
    state.player.height
  );
  ctx.fillStyle = "#8ff7e1";
  ctx.fillRect(state.player.x + 18, state.player.y - 6, 10, 6);

  ctx.fillStyle = "#8ff7e1";
  state.playerBullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  ctx.fillStyle = "#fbbf24";
  state.enemyBullets.forEach((bullet) => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  if (state.paused && !state.gameOver) {
    ctx.fillStyle = "rgba(8, 18, 20, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e2fdf7";
    ctx.font = "24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
  }

  if (state.gameOver) {
    ctx.fillStyle = "rgba(8, 18, 20, 0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e2fdf7";
    ctx.font = "26px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px system-ui";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 20);
  }
}

function gameLoop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }
  const rawDt = (timestamp - state.lastTime) / 1000;
  const dt = Math.min(rawDt, 0.05);
  state.lastTime = timestamp;

  if (!state.paused && !state.gameOver) {
    updatePlayer(dt, timestamp);
    updateInvaders(dt);
    updateEnemyFire(dt);
    updateBullets(dt, timestamp);
    syncHud();
  }

  render();
  requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (state.gameOver) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "Resume" : "Pause";
  statusText.textContent = state.paused
    ? "Paused. Press P to resume."
    : "Space shoots. P pauses. R restarts.";
}

function handleKeyDown(event) {
  const isActionKey =
    event.code === "ArrowLeft" ||
    event.code === "ArrowRight" ||
    event.code === "Space";
  if (!state.gameOver && isActionKey) {
    event.preventDefault();
  }

  if (event.code === KEY_PAUSE) {
    togglePause();
    return;
  }

  if (event.code === KEY_RESTART) {
    resetGame();
    return;
  }

  state.keys.add(event.code);
}

function handleKeyUp(event) {
  state.keys.delete(event.code);
}

function syncBestScore() {
  const stored = Number(localStorage.getItem(BEST_KEY));
  state.best = Number.isFinite(stored) ? stored : 0;
}

function focusGame() {
  wrapper.focus({ preventScroll: true });
}

wrapper.addEventListener("pointerdown", () => {
  focusGame();
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
wrapper.addEventListener("blur", () => state.keys.clear());

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", resetGame);

syncBestScore();
initStars();
resetGame();
focusGame();
requestAnimationFrame(gameLoop);
