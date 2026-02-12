const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");
const playerScoreEl = document.getElementById("playerScore");
const aiScoreEl = document.getElementById("aiScore");
const bestScoreEl = document.getElementById("bestScore");
const statusText = document.getElementById("statusText");
const restartBtn = document.getElementById("restartBtn");

const STORAGE_KEY = "arcade_pong_best";
let bestScore = Number(localStorage.getItem(STORAGE_KEY)) || 0;
bestScoreEl.textContent = bestScore;

const state = {
  width: 800,
  height: 500,
  player: { x: 30, y: 200, w: 12, h: 90, speed: 6 },
  ai: { x: 758, y: 200, w: 12, h: 90, speed: 5, targetY: 250, reactionCounter: 0 },
  ball: { x: 400, y: 250, r: 7, vx: 0, vy: 0 },
  running: false,
  waitingToServe: true,
  playerScore: 0,
  aiScore: 0,
};

const keys = { up: false, down: false };

const resizeCanvas = () => {
  const containerWidth = canvas.parentElement.clientWidth;
  const nextWidth = Math.min(900, containerWidth);
  const nextHeight = Math.round(nextWidth * 0.6);
  canvas.width = nextWidth;
  canvas.height = nextHeight;
  state.width = nextWidth;
  state.height = nextHeight;
  state.player.x = 30;
  state.ai.x = state.width - state.ai.w - 30;
};

const resetBall = () => {
  state.ball.x = state.width / 2;
  state.ball.y = state.height / 2;
  state.ball.vx = 0;
  state.ball.vy = 0;
};

const resetPositions = () => {
  state.player.y = state.height / 2 - state.player.h / 2;
  state.ai.y = state.height / 2 - state.ai.h / 2;
  state.ai.targetY = state.height / 2 - state.ai.h / 2;
  state.ai.reactionCounter = 0;
  resetBall();
};

const serveBall = () => {
  const baseSpeed = Math.max(4, state.width / 160);
  const direction = Math.random() > 0.5 ? 1 : -1;
  state.ball.vx = direction * baseSpeed;
  state.ball.vy = (Math.random() * 2 - 1) * (baseSpeed * 0.6);
};

const updateScores = () => {
  playerScoreEl.textContent = state.playerScore;
  aiScoreEl.textContent = state.aiScore;
};

const updateBest = () => {
  if (state.playerScore > bestScore) {
    bestScore = state.playerScore;
    bestScoreEl.textContent = bestScore;
    localStorage.setItem(STORAGE_KEY, bestScore);
  }
};

const serve = () => {
  if (state.running || !state.waitingToServe) return;
  state.running = true;
  state.waitingToServe = false;
  statusText.textContent = "Game on!";
  resetPositions();
  serveBall();
};

const restartGame = () => {
  state.running = false;
  state.waitingToServe = true;
  state.playerScore = 0;
  state.aiScore = 0;
  updateScores();
  statusText.textContent = "Use W/S or Up/Down. Press Space to serve.";
  resetPositions();
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const update = () => {
  const speedScale = state.width / 800;
  state.player.speed = 6 * speedScale;
  state.ai.speed = 5 * speedScale;

  // Player movement
  if (keys.up) {
    state.player.y -= state.player.speed;
  }
  if (keys.down) {
    state.player.y += state.player.speed;
  }
  state.player.y = clamp(state.player.y, 0, state.height - state.player.h);

  // AI movement with reaction delay and deadzone
  state.ai.reactionCounter++;
  if (state.ai.reactionCounter >= 6) {
    state.ai.reactionCounter = 0;
    state.ai.targetY = state.ball.y - state.ai.h / 2;
  }

  const aiDelta = state.ai.targetY - state.ai.y;
  if (Math.abs(aiDelta) > 8) {
    state.ai.y += clamp(aiDelta, -state.ai.speed, state.ai.speed);
  }
  state.ai.y = clamp(state.ai.y, 0, state.height - state.ai.h);

  if (state.running) {
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    if (state.ball.y - state.ball.r < 0 || state.ball.y + state.ball.r > state.height) {
      state.ball.vy *= -1;
      state.ball.y = clamp(state.ball.y, state.ball.r, state.height - state.ball.r);
    }

    const playerHit =
      state.ball.x - state.ball.r <= state.player.x + state.player.w &&
      state.ball.x + state.ball.r >= state.player.x &&
      state.ball.y + state.ball.r >= state.player.y &&
      state.ball.y - state.ball.r <= state.player.y + state.player.h;
    if (playerHit) {
      state.ball.vx = Math.abs(state.ball.vx);
      state.ball.x = state.player.x + state.player.w + state.ball.r;
    }

    const aiHit =
      state.ball.x + state.ball.r >= state.ai.x &&
      state.ball.x - state.ball.r <= state.ai.x + state.ai.w &&
      state.ball.y + state.ball.r >= state.ai.y &&
      state.ball.y - state.ball.r <= state.ai.y + state.ai.h;
    if (aiHit) {
      state.ball.vx = -Math.abs(state.ball.vx);
      state.ball.x = state.ai.x - state.ball.r;
    }

    if (state.ball.x + state.ball.r < 0) {
      state.aiScore += 1;
      updateScores();
      state.running = false;
      state.waitingToServe = true;
      resetBall();
      statusText.textContent = "AI scores. Press Space to serve.";
    }

    if (state.ball.x - state.ball.r > state.width) {
      state.playerScore += 1;
      updateScores();
      updateBest();
      state.running = false;
      state.waitingToServe = true;
      resetBall();
      statusText.textContent = "You score! Press Space to serve.";
    }

    if (state.playerScore >= 10 || state.aiScore >= 10) {
      state.running = false;
      state.waitingToServe = false;
      const winner = state.playerScore > state.aiScore ? "You win!" : "AI wins!";
      statusText.textContent = `${winner} Press Restart to play again.`;
    }
  }
};

const draw = () => {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = "#0e1a1c";
  ctx.fillRect(0, 0, state.width, state.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.setLineDash([8, 12]);
  ctx.beginPath();
  ctx.moveTo(state.width / 2, 0);
  ctx.lineTo(state.width / 2, state.height);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
  ctx.fillRect(state.ai.x, state.ai.y, state.ai.w, state.ai.h);

  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
  ctx.fill();
};

const loop = () => {
  update();
  draw();
  requestAnimationFrame(loop);
};

window.addEventListener("resize", resizeCanvas);

document.addEventListener("keydown", (event) => {
  if (event.code === "KeyW" || event.code === "ArrowUp") {
    keys.up = true;
  }
  if (event.code === "KeyS" || event.code === "ArrowDown") {
    keys.down = true;
  }
  if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat) {
      serve();
    }
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "KeyW" || event.code === "ArrowUp") {
    keys.up = false;
  }
  if (event.code === "KeyS" || event.code === "ArrowDown") {
    keys.down = false;
  }
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;
  state.player.y = clamp(relativeY - state.player.h / 2, 0, state.height - state.player.h);
});

restartBtn.addEventListener("click", restartGame);

resizeCanvas();
resetPositions();
updateScores();
loop();
