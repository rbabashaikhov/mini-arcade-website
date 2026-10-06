import { setup, swipe } from "../../shared/puzzle-ui.js";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const MAP = [
  "###################",
  "#o...............o#",
  "#.###.##.##.###.#.#",
  "#.....#...#.....#.#",
  "#.###.#.#.#.###.#.#",
  "#...#...#...#.....#",
  "###.#.#####.#.###.#",
  "#...#...#...#.....#",
  "#.#####.#.#####.#.#",
  "#....... .......#.#",
  "#.###.#   #.###.#.#",
  "#.....#   #.....#.#",
  "#.###.#####.###.#.#",
  "#...#.......#...#.#",
  "###.#.#####.#.###.#",
  "#...#...#...#.....#",
  "#.###.#.#.#.###.#.#",
  "#.....#...#.....#.#",
  "#.###.##.##.###.#.#",
  "#o...............o#",
  "###################",
];
const dirs = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  },
  all = Object.values(dirs);
let grid, player, ghosts, score, lives, level, power, grace, pellets;
function wall(x, y) {
  return !grid[y] || grid[y][x] === undefined || grid[y][x] === "#";
}
function allowed(e, d) {
  return !wall(e.x + d.x, e.y + d.y);
}
function entity(x, y, color) {
  return {
    x,
    y,
    dir: { x: 0, y: 0 },
    next: dirs.left,
    progress: 0,
    color,
    wait: 0,
  };
}
function positions() {
  player = entity(9, 19, "#f6d16c");
  ghosts = [
    entity(8, 11, "#f38498"),
    entity(9, 11, "#8dd6de"),
    entity(10, 11, "#c2a3f4"),
  ];
  ghosts.forEach((g, i) => (g.wait = 0.7 + i * 0.7));
  power = 0;
  grace = 1.2;
}
function build() {
  grid = MAP.map((r) => r.split(""));
  pellets = grid.flat().filter((v) => v === "." || v === "o").length;
  positions();
}
function hud() {
  ui.hud(
    score,
    `${lives} LIVES · ${level} MAZE${power > 0 ? "\nPOWER " + Math.ceil(power) + "s" : ""}`,
  );
}
function reset() {
  score = 0;
  lives = 3;
  level = 1;
  build();
  hud();
}
function eat() {
  const tile = grid[player.y][player.x];
  if (tile === "." || tile === "o") {
    grid[player.y][player.x] = " ";
    pellets--;
    score += tile === "o" ? 50 : 10;
    if (tile === "o") power = 7;
    hud();
  }
}
// Consume each tile boundary explicitly so turns cannot be skipped by a fractional frame.
function move(e, distance, choose, arrive) {
  let guard = 0;
  while (distance > 0 && guard++ < 8) {
    if (e.progress === 0) {
      choose();
      if (!allowed(e, e.dir) || (e.dir.x === 0 && e.dir.y === 0)) return;
    }
    const step = Math.min(distance, 1 - e.progress);
    e.progress += step;
    distance -= step;
    if (e.progress >= 1 - 1e-9) {
      e.x += e.dir.x;
      e.y += e.dir.y;
      e.progress = 0;
      arrive?.();
    }
  }
}
function chooseGhost(g, index) {
  let options = all.filter((d) => allowed(g, d));
  if (options.length > 1)
    options = options.filter((d) => d.x !== -g.dir.x || d.y !== -g.dir.y);
  const target =
    index === 1
      ? { x: player.x + player.dir.x * 3, y: player.y + player.dir.y * 3 }
      : player;
  options.sort((a, b) => {
    const da = Math.abs(g.x + a.x - target.x) + Math.abs(g.y + a.y - target.y),
      db = Math.abs(g.x + b.x - target.x) + Math.abs(g.y + b.y - target.y);
    return power > 0 ? db - da : da - db;
  });
  g.dir = (Math.random() < 0.2
    ? options[Math.floor(Math.random() * options.length)]
    : options[0]) || { x: 0, y: 0 };
}
function position(e) {
  return { x: e.x + e.dir.x * e.progress, y: e.y + e.dir.y * e.progress };
}
function update(dt) {
  eat();
  power = Math.max(0, power - dt);
  grace = Math.max(0, grace - dt);
  move(
    player,
    dt * 6.2,
    () => {
      if (allowed(player, player.next)) player.dir = player.next;
    },
    eat,
  );
  for (let i = 0; i < ghosts.length; i++) {
    const g = ghosts[i];
    g.wait = Math.max(0, g.wait - dt);
    if (!g.wait)
      move(g, dt * (power ? 3 : Math.min(5.3, 4 + level * 0.16)), () =>
        chooseGhost(g, i),
      );
    const p = position(player),
      q = position(g);
    if (!g.wait && Math.hypot(p.x - q.x, p.y - q.y) < 0.65) {
      if (power) {
        score += 200;
        g.x = 9;
        g.y = 11;
        g.progress = 0;
        g.dir = { x: 0, y: 0 };
        g.wait = 2;
        hud();
      } else if (!grace) {
        lives--;
        if (lives <= 0) ui.setState("over", "Out of the maze");
        else positions();
        hud();
        return;
      }
    }
  }
  if (!pellets) {
    level++;
    build();
    hud();
  }
  if (power > 0) hud();
}
function input(name) {
  if (ui.state === "playing" && dirs[name]) player.next = dirs[name];
}
function draw(c, t) {
  c.fillStyle = "#111219";
  c.fillRect(0, 0, 380, 420);
  grid?.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v === "#") {
        c.fillStyle = "#1c2843";
        c.strokeStyle = "#5975b0";
        c.lineWidth = 1;
        c.beginPath();
        c.roundRect(x * 20 + 2, y * 20 + 2, 16, 16, 4);
        c.fill();
        c.stroke();
      } else if (v === "." || v === "o") {
        c.fillStyle = v === "o" ? "#f6d16c" : "#d6c6a2";
        c.beginPath();
        c.arc(x * 20 + 10, y * 20 + 10, v === "o" ? 5 : 2, 0, 7);
        c.fill();
      }
    }),
  );
  if (!player) return;
  const p = position(player),
    angle = Math.atan2(player.dir.y, player.dir.x),
    mouth =
      0.25 +
      (ui.state === "playing" && !reducedMotion.matches
        ? Math.abs(Math.sin(t * 0.012)) * 0.3
        : 0);
  c.fillStyle = grace > 0 ? "#fff0b2" : "#f6d16c";
  c.beginPath();
  c.moveTo(p.x * 20 + 10, p.y * 20 + 10);
  c.arc(
    p.x * 20 + 10,
    p.y * 20 + 10,
    8.5,
    angle + mouth,
    angle + Math.PI * 2 - mouth,
  );
  c.closePath();
  c.fill();
  ghosts.forEach((g) => {
    if (g.wait > 0) return;
    const p = position(g),
      x = p.x * 20 + 10,
      y = p.y * 20 + 10;
    c.fillStyle = power > 0 ? "#83a7ff" : g.color;
    c.beginPath();
    c.arc(x, y, 8, Math.PI, 0);
    c.lineTo(x + 8, y + 8);
    c.lineTo(x + 3, y + 5);
    c.lineTo(x, y + 8);
    c.lineTo(x - 3, y + 5);
    c.lineTo(x - 8, y + 8);
    c.closePath();
    c.fill();
    c.fillStyle = "#fff";
    c.fillRect(x - 5, y - 3, 4, 5);
    c.fillRect(x + 1, y - 3, 4, 5);
    c.fillStyle = "#141823";
    c.fillRect(x - 3, y - 1, 2, 3);
    c.fillRect(x + 3, y - 1, 2, 3);
  });
}
const keys = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const ui = setup("pacman", "A-maze yourself.", 380, 420, {
  reset,
  input,
  update,
  draw,
  key(code) {
    if (keys[code]) {
      input(keys[code]);
      return true;
    }
  },
});
reset();
swipe(ui.canvas, input);
