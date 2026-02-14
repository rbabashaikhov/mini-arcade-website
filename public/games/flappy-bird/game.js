(() => {
  const wrapper = document.getElementById("game-wrapper");
  const canvas = document.getElementById("game-canvas");
  const overlay = document.getElementById("ui-overlay");
  const ctx = canvas.getContext("2d");

  const BASE_SPEED = 160;
  const PIPE_INTERVAL = 1400;
  const GRAVITY = 1200;
  const JUMP = -360;
  const GAP_SIZE = 150;
  const PIPE_WIDTH = 64;

  let width = 0;
  let height = 0;
  let lastFrame = 0;
  let lastPipeTime = 0;
  let rafId = 0;

  let pipes = [];
  let score = 0;
  let bestScore = 0;
  let started = false;
  let paused = false;
  let gameOver = false;

  const bird = {
    x: 0,
    y: 0,
    radius: 14,
    velocity: 0
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const loadBest = () => {
    try {
      const stored = localStorage.getItem("arcade_flappy_best");
      bestScore = stored ? Number.parseInt(stored, 10) || 0 : 0;
    } catch (error) {
      bestScore = 0;
    }
  };

  const saveBest = () => {
    try {
      localStorage.setItem("arcade_flappy_best", String(bestScore));
    } catch (error) {
      // Ignore storage errors (private mode, etc.)
    }
  };

  const resize = () => {
    const rect = wrapper.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    resetPositions();
    render();
  };

  const resetPositions = () => {
    bird.x = width * 0.28;
    bird.y = height * 0.45;
    bird.velocity = 0;
  };

  const resetGame = () => {
    pipes = [];
    score = 0;
    lastPipeTime = 0;
    started = false;
    paused = false;
    gameOver = false;
    overlay.classList.remove("hidden");
    overlay.querySelector(".hint").textContent = "Press Space / Click to start";
    resetPositions();
  };

  const startGame = () => {
    if (gameOver) return;
    if (!started) {
      started = true;
      overlay.classList.add("hidden");
      lastPipeTime = performance.now();
    }
    jump();
  };

  const jump = () => {
    if (paused || gameOver) return;
    bird.velocity = JUMP;
  };

  const togglePause = () => {
    if (!started || gameOver) return;
    paused = !paused;
  };

  const spawnPipe = () => {
    const gapMargin = 100;
    const gapCenter = clamp(
      Math.random() * (height - gapMargin * 2) + gapMargin,
      gapMargin + GAP_SIZE / 2,
      height - gapMargin - GAP_SIZE / 2
    );
    pipes.push({
      x: width + PIPE_WIDTH,
      gapY: gapCenter,
      passed: false
    });
  };

  const circleRectCollision = (cx, cy, radius, rx, ry, rw, rh) => {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
  };

  const checkCollision = () => {
    if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= height) {
      return true;
    }

    for (const pipe of pipes) {
      const topRect = {
        x: pipe.x,
        y: 0,
        w: PIPE_WIDTH,
        h: pipe.gapY - GAP_SIZE / 2
      };
      const bottomRect = {
        x: pipe.x,
        y: pipe.gapY + GAP_SIZE / 2,
        w: PIPE_WIDTH,
        h: height - (pipe.gapY + GAP_SIZE / 2)
      };

      if (
        circleRectCollision(bird.x, bird.y, bird.radius, topRect.x, topRect.y, topRect.w, topRect.h) ||
        circleRectCollision(
          bird.x,
          bird.y,
          bird.radius,
          bottomRect.x,
          bottomRect.y,
          bottomRect.w,
          bottomRect.h
        )
      ) {
        return true;
      }
    }
    return false;
  };

  const update = (delta) => {
    if (!started || paused || gameOver) return;

    const speed = BASE_SPEED + score * 1.2;

    bird.velocity += GRAVITY * delta;
    bird.y += bird.velocity * delta;

    if (performance.now() - lastPipeTime >= PIPE_INTERVAL) {
      spawnPipe();
      lastPipeTime = performance.now();
    }

    pipes.forEach((pipe) => {
      pipe.x -= speed * delta;
    });

    pipes = pipes.filter((pipe) => pipe.x + PIPE_WIDTH > -20);

    pipes.forEach((pipe) => {
      if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
        pipe.passed = true;
        score += 1;
        if (score > bestScore) {
          bestScore = score;
          saveBest();
        }
      }
    });

    if (checkCollision()) {
      gameOver = true;
      overlay.classList.remove("hidden");
      overlay.querySelector(".hint").textContent = "Game Over · R to restart";
    }
  };

  const drawBackground = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0a2e35");
    gradient.addColorStop(1, "#051417");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(14, 196, 202, 0.12)";
    ctx.fillRect(0, height * 0.72, width, height * 0.28);
  };

  const drawBird = () => {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(Math.min(Math.max(bird.velocity / 500, -0.5), 0.5));
    ctx.fillStyle = "#50fff5";
    ctx.beginPath();
    ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#021113";
    ctx.beginPath();
    ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawPipes = () => {
    pipes.forEach((pipe) => {
      const topHeight = pipe.gapY - GAP_SIZE / 2;
      const bottomY = pipe.gapY + GAP_SIZE / 2;
      const bottomHeight = height - bottomY;

      ctx.fillStyle = "#0fb6b8";
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topHeight);
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, bottomHeight);

      ctx.strokeStyle = "rgba(5, 32, 35, 0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x + 2, 0, PIPE_WIDTH - 4, topHeight - 2);
      ctx.strokeRect(pipe.x + 2, bottomY + 2, PIPE_WIDTH - 4, bottomHeight - 2);
    });
  };

  const drawHud = () => {
    ctx.fillStyle = "#d7fffb";
    ctx.font = "700 20px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(score), width / 2, 36);

    ctx.font = "600 12px Inter, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(215, 255, 251, 0.8)";
    ctx.fillText(`Best ${bestScore}`, width - 18, 26);

    if (paused && started && !gameOver) {
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(215, 255, 251, 0.9)";
      ctx.fillText("Paused", width / 2, height / 2 - 10);
      ctx.font = "500 11px Inter, system-ui, sans-serif";
      ctx.fillText("Press P to resume", width / 2, height / 2 + 10);
    }
  };

  const render = () => {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawPipes();
    drawBird();
    drawHud();
  };

  const loop = (timestamp) => {
    const delta = Math.min((timestamp - lastFrame) / 1000, 0.032);
    lastFrame = timestamp;
    update(delta);
    render();
    rafId = requestAnimationFrame(loop);
  };

  const handleKeyDown = (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      if (!started) {
        startGame();
      } else if (!paused && !gameOver) {
        jump();
      }
    }

    if (event.code === "KeyP") {
      togglePause();
    }

    if (event.code === "KeyR") {
      resetGame();
    }
  };

  const handlePointer = (event) => {
    event.preventDefault();
    wrapper.focus();
    if (!started) {
      startGame();
    } else if (!paused && !gameOver) {
      jump();
    }
  };

  const init = () => {
    loadBest();
    resetGame();
    resize();
    wrapper.focus();
    lastFrame = performance.now();
    rafId = requestAnimationFrame(loop);
  };

  window.addEventListener("resize", resize);
  document.addEventListener("keydown", handleKeyDown, { passive: false });
  wrapper.addEventListener("pointerdown", handlePointer);
  wrapper.addEventListener("click", () => wrapper.focus());
  init();

  window.addEventListener("beforeunload", () => {
    if (rafId) cancelAnimationFrame(rafId);
  });
})();
