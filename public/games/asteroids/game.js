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
const KEY_THRUST = new Set(["ArrowUp", "KeyW"]);
const KEY_SHOOT = "Space";
const KEY_PAUSE = "KeyP";
const KEY_RESTART = "KeyR";

const BEST_KEY = "arcade_asteroids_best";

const ASTEROID_SIZES = {
  large: { radius: 44, score: 20 },
  medium: { radius: 28, score: 50 },
  small: { radius: 16, score: 100 }
};

const state = {
  keys: new Set(),
  score: 0,
  best: 0,
  lives: 3,
  level: 1,
  paused: false,
  gameOver: false,
  lastTime: 0,
  lastShotAt: 0,
  bullets: [],
  asteroids: [],
  stars: [],
  ship: null
};

const SHIP_TURN_SPEED = 3.6;
const SHIP_THRUST = 220;
const SHIP_DAMPING = 0.985;
const BULLET_SPEED = 520;
const BULLET_LIFE = 1.1;
const SHOT_COOLDOWN = 200;
const INVULNERABLE_MS = 1400;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function wrapPosition(entity) {
  if (entity.x < -entity.radius) entity.x = canvas.width + entity.radius;
  if (entity.x > canvas.width + entity.radius) entity.x = -entity.radius;
  if (entity.y < -entity.radius) entity.y = canvas.height + entity.radius;
  if (entity.y > canvas.height + entity.radius) entity.y = -entity.radius;
}

function initStars() {
  state.stars = Array.from({ length: 40 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.6 + 0.4
  }));
}

function createShip() {
  return {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: 16,
    invulnerableUntil: 0
  };
}

function randomVelocity(level) {
  const base = 42 + level * 6;
  const speed = base + Math.random() * 60;
  const angle = Math.random() * Math.PI * 2;
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

function createAsteroid(size, level, positionOverride) {
  const { radius } = ASTEROID_SIZES[size];
  const velocity = randomVelocity(level);
  return {
    x: positionOverride ? positionOverride.x : Math.random() * canvas.width,
    y: positionOverride ? positionOverride.y : Math.random() * canvas.height,
    vx: velocity.vx,
    vy: velocity.vy,
    radius,
    size
  };
}

function spawnAsteroids(level) {
  const count = clamp(4 + level, 4, 9);
  const asteroids = [];
  let attempts = 0;
  while (asteroids.length < count && attempts < 80) {
    attempts += 1;
    const candidate = createAsteroid("large", level);
    if (distance(candidate, state.ship) > 150) {
      asteroids.push(candidate);
    }
  }
  return asteroids;
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

function resetGame() {
  state.score = 0;
  state.lives = 3;
  state.level = 1;
  state.paused = false;
  state.gameOver = false;
  state.lastTime = 0;
  state.lastShotAt = 0;
  state.bullets = [];
  state.ship = createShip();
  state.asteroids = spawnAsteroids(state.level);
  statusText.textContent = "Space shoots. P pauses. R restarts.";
  pauseBtn.textContent = "Pause";
  syncHud();
}

function nextLevel() {
  state.level += 1;
  state.bullets = [];
  state.asteroids = spawnAsteroids(state.level);
  statusText.textContent = `Level ${state.level} - asteroids accelerate.`;
  syncHud();
}

function shootBullet(now) {
  if (now - state.lastShotAt < SHOT_COOLDOWN) return;
  if (state.paused || state.gameOver) return;

  const noseX = state.ship.x + Math.cos(state.ship.angle) * (state.ship.radius + 6);
  const noseY = state.ship.y + Math.sin(state.ship.angle) * (state.ship.radius + 6);
  state.bullets.push({
    x: noseX,
    y: noseY,
    vx: Math.cos(state.ship.angle) * BULLET_SPEED + state.ship.vx,
    vy: Math.sin(state.ship.angle) * BULLET_SPEED + state.ship.vy,
    life: BULLET_LIFE
  });
  state.lastShotAt = now;
}

function splitAsteroid(asteroid) {
  if (asteroid.size === "small") {
    return [];
  }
  const nextSize = asteroid.size === "large" ? "medium" : "small";
  const splitOffset = asteroid.radius * 0.6;
  const a = createAsteroid(nextSize, state.level, {
    x: asteroid.x + splitOffset,
    y: asteroid.y - splitOffset
  });
  const b = createAsteroid(nextSize, state.level, {
    x: asteroid.x - splitOffset,
    y: asteroid.y + splitOffset
  });
  return [a, b];
}

function updateShip(dt, now) {
  let turn = 0;
  if ([...KEY_LEFT].some((key) => state.keys.has(key))) {
    turn -= 1;
  }
  if ([...KEY_RIGHT].some((key) => state.keys.has(key))) {
    turn += 1;
  }
  state.ship.angle += turn * SHIP_TURN_SPEED * dt;

  if ([...KEY_THRUST].some((key) => state.keys.has(key))) {
    state.ship.vx += Math.cos(state.ship.angle) * SHIP_THRUST * dt;
    state.ship.vy += Math.sin(state.ship.angle) * SHIP_THRUST * dt;
  }

  const damping = Math.pow(SHIP_DAMPING, dt * 60);
  state.ship.vx *= damping;
  state.ship.vy *= damping;

  state.ship.x += state.ship.vx * dt;
  state.ship.y += state.ship.vy * dt;
  wrapPosition(state.ship);

  if (state.keys.has(KEY_SHOOT)) {
    shootBullet(now);
  }
}

function updateBullets(dt) {
  state.bullets.forEach((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
  });
  state.bullets = state.bullets.filter(
    (bullet) =>
      bullet.life > 0 &&
      bullet.x > -20 &&
      bullet.x < canvas.width + 20 &&
      bullet.y > -20 &&
      bullet.y < canvas.height + 20
  );
}

function updateAsteroids(dt) {
  state.asteroids.forEach((asteroid) => {
    asteroid.x += asteroid.vx * dt;
    asteroid.y += asteroid.vy * dt;
    wrapPosition(asteroid);
  });
}

function resolveBulletHits() {
  const newAsteroids = [];
  state.bullets.forEach((bullet) => {
    state.asteroids.forEach((asteroid) => {
      if (bullet.hit || asteroid.hit) return;
      if (distance(bullet, asteroid) <= asteroid.radius) {
        bullet.hit = true;
        asteroid.hit = true;
        state.score += ASTEROID_SIZES[asteroid.size].score;
        saveBestScore();
        newAsteroids.push(...splitAsteroid(asteroid));
      }
    });
  });
  state.bullets = state.bullets.filter((bullet) => !bullet.hit);
  state.asteroids = state.asteroids.filter((asteroid) => !asteroid.hit);
  if (newAsteroids.length > 0) {
    state.asteroids.push(...newAsteroids);
  }
}

function resolveShipHits(now) {
  if (now < state.ship.invulnerableUntil) return;

  const hit = state.asteroids.some(
    (asteroid) => distance(asteroid, state.ship) <= asteroid.radius + state.ship.radius
  );
  if (!hit) return;

  state.lives -= 1;
  state.ship.invulnerableUntil = now + INVULNERABLE_MS;
  state.ship.x = canvas.width / 2;
  state.ship.y = canvas.height / 2;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.ship.angle = -Math.PI / 2;
  state.keys.delete(KEY_SHOOT);
  syncHud();

  if (state.lives <= 0) {
    state.gameOver = true;
    statusText.textContent = "Game over. Press R to restart.";
  }
}

function renderShip() {
  const invulnerable = performance.now() < state.ship.invulnerableUntil;
  ctx.save();
  ctx.translate(state.ship.x, state.ship.y);
  ctx.rotate(state.ship.angle + Math.PI / 2);
  ctx.strokeStyle = invulnerable ? "rgba(35, 180, 176, 0.4)" : "#43f3e3";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(12, 12);
  ctx.lineTo(0, 6);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  if ([...KEY_THRUST].some((key) => state.keys.has(key)) && !state.paused) {
    ctx.save();
    ctx.translate(state.ship.x, state.ship.y);
    ctx.rotate(state.ship.angle + Math.PI / 2);
    ctx.strokeStyle = "rgba(35, 180, 176, 0.55)";
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(0, 20 + Math.random() * 6);
    ctx.lineTo(6, 12);
    ctx.stroke();
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#061416";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(120, 248, 230, 0.6)";
  state.stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.strokeStyle = "rgba(35, 180, 176, 0.8)";
  ctx.lineWidth = 2;
  state.asteroids.forEach((asteroid) => {
    ctx.beginPath();
    ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  ctx.fillStyle = "#8af9ec";
  state.bullets.forEach((bullet) => {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  renderShip();

  if (state.paused && !state.gameOver) {
    ctx.fillStyle = "rgba(6, 20, 22, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e1fffb";
    ctx.font = "24px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Paused", canvas.width / 2, canvas.height / 2);
  }

  if (state.gameOver) {
    ctx.fillStyle = "rgba(6, 20, 22, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e1fffb";
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
    updateShip(dt, timestamp);
    updateBullets(dt);
    updateAsteroids(dt);
    resolveBulletHits();
    resolveShipHits(timestamp);
    if (state.asteroids.length === 0) {
      nextLevel();
    }
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
  const actionKey =
    event.code === "ArrowLeft" ||
    event.code === "ArrowRight" ||
    event.code === "ArrowUp" ||
    event.code === "Space" ||
    event.code === "KeyW";
  if (actionKey) {
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

wrapper.addEventListener("blur", () => state.keys.clear());
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", resetGame);

syncBestScore();
initStars();
resetGame();
focusGame();
requestAnimationFrame(gameLoop);
