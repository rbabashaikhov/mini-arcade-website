import { best } from "../../shared/storage.js";
const $ = (id) => document.getElementById(id);
const canvas = $("gameCanvas"),
  ctx = canvas.getContext("2d"),
  arena = $("gameWrapper");
const W = 720,
  H = 520,
  keys = new Set(),
  touches = new Map();
const slug = location.pathname.includes("asteroids")
  ? "asteroids"
  : "space-invaders";
const accent = slug === "asteroids" ? "#b9a1ff" : "#76e6ca";
document.documentElement.style.setProperty("--accent", accent);
let mode = "ready",
  score = 0,
  lives = 3,
  wave = 1,
  record = best(slug),
  last = 0,
  accumulator = 0,
  clock = 0;
const stars = Array.from({ length: 64 }, (_, i) => ({
  x: (i * 173.31) % W,
  y: (i * 97.81) % H,
  r: i % 4 === 0 ? 1.5 : 0.7,
}));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let sparks = [];
function hud() {
  $("scoreValue").textContent = score;
  $("bestValue").textContent = record;
  $("livesValue").textContent = lives;
  $("levelValue").textContent = wave;
}
function addScore(n) {
  score += n;
  record = best(slug, score);
  hud();
}
function clearInput() {
  keys.clear();
  touches.clear();
  document
    .querySelectorAll(".active")
    .forEach((el) => el.classList.remove("active"));
}
function state(next) {
  mode = next;
  document.body.dataset.state = next;
  clearInput();
  accumulator = 0;
  $("pauseBtn").disabled = next === "ready" || next === "over";
  $("pauseBtn").textContent = next === "paused" ? "Resume" : "Pause";
  $("overlay").hidden = next === "playing";
  if (next === "paused") {
    $("overlayTitle").textContent = "Flight paused";
    $("overlayText").textContent = "Take your time. Resume when you are ready.";
    $("startBtn").textContent = "Resume";
  }
  if (next === "over") {
    $("overlayTitle").textContent = "Mission complete";
    $("overlayText").textContent =
      `Score ${score} · Wave ${wave}. Ready for another run?`;
    $("startBtn").textContent = "Play again";
  }
  parent.postMessage({ type: "arcade:state", state: next }, location.origin);
}
function restart() {
  score = 0;
  lives = 3;
  wave = 1;
  clock = 0;
  sparks = [];
  resetWorld();
  hud();
  state("playing");
  arena.focus({ preventScroll: true });
}
function pause() {
  if (mode === "playing") state("paused");
  else if (mode === "paused") {
    state("playing");
    arena.focus({ preventScroll: true });
  }
}
function held(...codes) {
  return codes.some(
    (code) => keys.has(code) || [...touches.values()].includes(code),
  );
}
$("startBtn").onclick = () => (mode === "paused" ? pause() : restart());
$("restartBtn").onclick = restart;
$("pauseBtn").onclick = pause;
window.addEventListener("keydown", (e) => {
  if (e.target.closest("button") && (e.code === "Space" || e.code === "Enter"))
    return;
  if (
    [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "Space",
      "KeyA",
      "KeyD",
      "KeyW",
    ].includes(e.code) &&
    mode === "playing"
  ) {
    e.preventDefault();
    keys.add(e.code);
  }
  if (e.repeat) return;
  if (e.code === "KeyP") pause();
  if (e.code === "KeyR") restart();
  if (e.code === "Enter" && mode === "ready") restart();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", () => {
  clearInput();
  if (mode === "playing") state("paused");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "playing") state("paused");
});
window.addEventListener("message", (e) => {
  if (
    e.origin !== location.origin ||
    e.source !== parent ||
    e.data?.type !== "arcade:command"
  )
    return;
  if (e.data.command === "restart") restart();
  if (e.data.command === "pause" && mode === "playing") pause();
});
document.querySelectorAll("[data-key]").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (mode !== "playing") return;
    arena.focus({ preventScroll: true });
    btn.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, btn.dataset.key);
    btn.classList.add("active");
  });
  const release = (e) => {
    touches.delete(e.pointerId);
    if (![...touches.values()].includes(btn.dataset.key))
      btn.classList.remove("active");
  };
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointercancel", release);
  btn.addEventListener("lostpointercapture", release);
});
canvas.addEventListener("pointerdown", () =>
  arena.focus({ preventScroll: true }),
);
function resize() {
  const main = document.querySelector("main"),
    style = getComputedStyle(main);
  const other = [...main.children]
    .filter((e) => e !== arena)
    .reduce((n, e) => n + e.getBoundingClientRect().height, 0);
  const room =
    innerHeight -
    parseFloat(style.paddingTop) -
    parseFloat(style.paddingBottom) -
    other -
    parseFloat(style.gap) * 4;
  const width = Math.min(
    960,
    main.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight),
    (Math.max(80, room) * W) / H,
  );
  arena.style.width = width + "px";
  arena.style.height = (width * H) / W + "px";
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(((width * H) / W) * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
}
window.addEventListener("resize", resize);
function burst(x, y, color = accent) {
  if (reduced) return;
  for (let i = 0; i < 10; i++) {
    let a = Math.random() * Math.PI * 2;
    sparks.push({
      x,
      y,
      vx: Math.cos(a) * 100,
      vy: Math.sin(a) * 100,
      life: 0.35,
      color,
    });
  }
}
function background() {
  ctx.fillStyle = "#090e14";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#536173";
  for (const s of stars) ctx.fillRect(s.x, s.y, s.r, s.r);
}
function frame(time) {
  const dt = Math.min((time - last) / 1000 || 0, 0.05);
  last = time;
  if (mode === "playing") {
    accumulator += dt;
    while (accumulator >= 1 / 120 && mode === "playing") {
      clock += 1 / 120;
      update(1 / 120);
      for (const p of sparks) {
        p.x += p.vx / 120;
        p.y += p.vy / 120;
        p.life -= 1 / 120;
      }
      sparks = sparks.filter((p) => p.life > 0);
      accumulator -= 1 / 120;
    }
  }
  background();
  draw();
  for (const p of sparks) {
    ctx.globalAlpha = p.life / 0.35;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}
let ship, rocks, bullets, cooldown, shield;
const radii = [16, 28, 44],
  points = [100, 50, 20];
function rock(size, x, y) {
  const a = Math.random() * Math.PI * 2,
    speed = 35 + wave * 7 + Math.random() * 45;
  return {
    x,
    y,
    size,
    r: radii[size],
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    angle: Math.random() * 6.28,
    spin: (Math.random() - 0.5) * 0.7,
    shape: Array.from({ length: 10 }, () => 0.76 + Math.random() * 0.24),
  };
}
function spawn() {
  rocks = [];
  for (let i = 0; i < Math.min(4 + wave, 10); i++) {
    const a = (i / Math.min(4 + wave, 10)) * Math.PI * 2;
    rocks.push(rock(2, W / 2 + Math.cos(a) * 290, H / 2 + Math.sin(a) * 220));
  }
  bullets = [];
  shield = 2;
}
function resetWorld() {
  ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 };
  cooldown = 0;
  spawn();
}
function wrap(e) {
  e.x = (e.x + W) % W;
  e.y = (e.y + H) % H;
}
function distance(a, b) {
  const x = Math.abs(a.x - b.x),
    y = Math.abs(a.y - b.y);
  return Math.hypot(Math.min(x, W - x), Math.min(y, H - y));
}
function update(dt) {
  shield = Math.max(0, shield - dt);
  cooldown -= dt;
  ship.a +=
    ((held("ArrowRight", "KeyD") ? 1 : 0) -
      (held("ArrowLeft", "KeyA") ? 1 : 0)) *
    3.7 *
    dt;
  if (held("ArrowUp", "KeyW")) {
    ship.vx += Math.cos(ship.a) * 245 * dt;
    ship.vy += Math.sin(ship.a) * 245 * dt;
  }
  const damping = Math.exp(-0.65 * dt);
  ship.vx *= damping;
  ship.vy *= damping;
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > 360) {
    ship.vx *= 360 / speed;
    ship.vy *= 360 / speed;
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrap(ship);
  if (held("Space") && cooldown <= 0) {
    bullets.push({
      x: ship.x + Math.cos(ship.a) * 21,
      y: ship.y + Math.sin(ship.a) * 21,
      vx: Math.cos(ship.a) * 540 + ship.vx,
      vy: Math.sin(ship.a) * 540 + ship.vy,
      life: 1,
    });
    cooldown = 0.18;
  }
  for (const r of rocks) {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.angle += r.spin * dt;
    wrap(r);
  }
  const fragments = [];
  for (const b of bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    wrap(b);
    const hit = rocks.find((r) => !r.hit && distance(b, r) < r.r);
    if (hit) {
      hit.hit = true;
      b.life = 0;
      addScore(points[hit.size]);
      burst(hit.x, hit.y);
      if (hit.size > 0) {
        for (let i = 0; i < 2; i++)
          fragments.push(rock(hit.size - 1, hit.x, hit.y));
      }
    }
  }
  rocks = rocks.filter((r) => !r.hit).concat(fragments);
  bullets = bullets.filter((b) => b.life > 0);
  if (shield <= 0 && rocks.some((r) => distance(r, ship) < r.r + 11)) {
    lives--;
    burst(ship.x, ship.y, "#ffb085");
    hud();
    if (lives <= 0) {
      state("over");
      return;
    }
    const candidates = [
      { x: W / 2, y: H / 2 },
      { x: W / 4, y: H / 4 },
      { x: (3 * W) / 4, y: (3 * H) / 4 },
      { x: W / 4, y: (3 * H) / 4 },
      { x: (3 * W) / 4, y: H / 4 },
    ];
    candidates.sort(
      (a, b) =>
        Math.min(...rocks.map((r) => distance(b, r) - r.r)) -
        Math.min(...rocks.map((r) => distance(a, r) - r.r)),
    );
    ship = { ...candidates[0], vx: 0, vy: 0, a: -Math.PI / 2 };
    shield = 2;
  }
  if (!rocks.length) {
    wave++;
    ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 };
    spawn();
    hud();
  }
}
function outlineRock(r, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r.angle);
  ctx.beginPath();
  r.shape.forEach((p, i) => {
    const a = (i / r.shape.length) * Math.PI * 2;
    const px = Math.cos(a) * r.r * p,
      py = Math.sin(a) * r.r * p;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = "#111622";
  ctx.fill();
  ctx.strokeStyle = ["#d1c3f5", "#9e92be", "#737587"][r.size];
  ctx.lineWidth = 1.7;
  ctx.stroke();
  ctx.restore();
}
function draw() {
  for (const r of rocks) {
    outlineRock(r, r.x, r.y);
    if (r.x < r.r) outlineRock(r, r.x + W, r.y);
    if (r.x > W - r.r) outlineRock(r, r.x - W, r.y);
    if (r.y < r.r) outlineRock(r, r.x, r.y + H);
    if (r.y > H - r.r) outlineRock(r, r.x, r.y - H);
  }
  ctx.fillStyle = "#e9dcff";
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.a + Math.PI / 2);
  ctx.strokeStyle = "#d2c3ff";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#201a33";
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(12, 13);
  ctx.lineTo(0, 7);
  ctx.lineTo(-12, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (mode === "playing" && held("ArrowUp", "KeyW")) {
    ctx.strokeStyle = "#ffbf86";
    ctx.beginPath();
    ctx.moveTo(-5, 13);
    ctx.lineTo(0, 25);
    ctx.lineTo(5, 13);
    ctx.stroke();
  }
  if (shield > 0) {
    ctx.strokeStyle = "#b9a1ff55";
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
resetWorld();
hud();
resize();
parent.postMessage({ type: "arcade:ready" }, location.origin);
requestAnimationFrame(frame);
