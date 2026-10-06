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
let ship, enemies, shots, enemyShots, dir, cooldown, enemyCooldown, shield;
function formation() {
  enemies = [];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 9; col++)
      enemies.push({
        x: 115 + col * 55,
        y: 65 + row * 39,
        w: 32,
        h: 24,
        row,
        col,
      });
  dir = 1;
  enemyCooldown = 1;
  shots = [];
  enemyShots = [];
  shield = 1.5;
}
function resetWorld() {
  ship = { x: W / 2 - 20, y: H - 55, w: 40, h: 22 };
  cooldown = 0;
  formation();
}
function overlaps(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
function update(dt) {
  shield = Math.max(0, shield - dt);
  cooldown -= dt;
  enemyCooldown -= dt;
  ship.x = Math.max(
    16,
    Math.min(
      W - 56,
      ship.x +
        ((held("ArrowRight", "KeyD") ? 1 : 0) -
          (held("ArrowLeft", "KeyA") ? 1 : 0)) *
          330 *
          dt,
    ),
  );
  if (held("Space") && cooldown <= 0) {
    shots.push({ x: ship.x + 18, y: ship.y - 12, w: 4, h: 14 });
    cooldown = 0.2;
  }
  const speed = 30 + wave * 9 + (45 - enemies.length) * 1.5;
  for (const e of enemies) e.x += dir * speed * dt;
  const left = Math.min(...enemies.map((e) => e.x)),
    right = Math.max(...enemies.map((e) => e.x + e.w));
  if (left < 22 || right > W - 22) {
    const correction = left < 22 ? 22 - left : W - 22 - right;
    for (const e of enemies) {
      e.x += correction;
      e.y += 16;
    }
    dir *= -1;
  }
  if (enemies.some((e) => e.y + e.h >= ship.y)) {
    state("over");
    return;
  }
  if (enemyCooldown <= 0 && enemies.length) {
    const bottom = new Map();
    for (const e of enemies)
      if (!bottom.has(e.col) || bottom.get(e.col).y < e.y) bottom.set(e.col, e);
    const options = [...bottom.values()],
      e = options[Math.floor(Math.random() * options.length)];
    enemyShots.push({ x: e.x + 14, y: e.y + 25, w: 5, h: 15 });
    enemyCooldown = Math.max(0.18, 0.85 - wave * 0.06);
  }
  for (const b of shots) {
    b.y -= 540 * dt;
    const hit = enemies.find((e) => !e.hit && overlaps(b, e));
    if (hit) {
      hit.hit = true;
      b.hit = true;
      addScore((5 - hit.row) * 10);
      burst(hit.x + 16, hit.y + 12);
    }
  }
  enemies = enemies.filter((e) => !e.hit);
  shots = shots.filter((b) => !b.hit && b.y > -20);
  for (const b of enemyShots) {
    b.y += (190 + wave * 12) * dt;
    if (shield <= 0 && overlaps(b, ship)) {
      b.hit = true;
      lives--;
      shield = 1.5;
      burst(ship.x + 20, ship.y, "#ffb085");
      hud();
      if (lives <= 0) {
        state("over");
        return;
      }
    }
  }
  enemyShots = enemyShots.filter((b) => !b.hit && b.y < H + 20);
  if (!enemies.length) {
    wave++;
    formation();
    hud();
  }
}
const sprite = [
  "00100000100",
  "00010001000",
  "00111111100",
  "01101110110",
  "11111111111",
  "10111111101",
  "10100000101",
  "00011011000",
];
function draw() {
  ctx.strokeStyle = "#213f3c";
  ctx.beginPath();
  ctx.moveTo(20, H - 24);
  ctx.lineTo(W - 20, H - 24);
  ctx.stroke();
  for (const e of enemies) {
    ctx.fillStyle = ["#b9a1ff", "#92acf6", "#76e6ca", "#76e6ca", "#d2f86a"][
      e.row
    ];
    for (let y = 0; y < sprite.length; y++)
      for (let x = 0; x < 11; x++)
        if (sprite[y][x] === "1") ctx.fillRect(e.x + x * 3, e.y + y * 3, 3, 3);
  }
  ctx.fillStyle = shield > 0 ? "#a3c0bd" : "#76e6ca";
  ctx.beginPath();
  ctx.moveTo(ship.x, ship.y + 22);
  ctx.lineTo(ship.x + 7, ship.y + 9);
  ctx.lineTo(ship.x + 16, ship.y + 9);
  ctx.lineTo(ship.x + 20, ship.y - 2);
  ctx.lineTo(ship.x + 24, ship.y + 9);
  ctx.lineTo(ship.x + 33, ship.y + 9);
  ctx.lineTo(ship.x + 40, ship.y + 22);
  ctx.closePath();
  ctx.fill();
  if (shield > 0) {
    ctx.strokeStyle = "#76e6ca66";
    ctx.beginPath();
    ctx.arc(ship.x + 20, ship.y + 12, 30, Math.PI, 0);
    ctx.stroke();
  }
  ctx.fillStyle = "#e3fff7";
  for (const b of shots) ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = "#ffb085";
  for (const b of enemyShots) ctx.fillRect(b.x, b.y, b.w, b.h);
}
resetWorld();
hud();
resize();
parent.postMessage({ type: "arcade:ready" }, location.origin);
requestAnimationFrame(frame);
