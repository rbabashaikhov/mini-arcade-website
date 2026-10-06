import { setup } from "../../shared/puzzle-ui.js";
export const SHAPES = {
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
export const rotate = (m) =>
  m[0].map((_, x) => m.map((row) => row[x]).reverse());
export function collision(board, m, x, y) {
  return m.some((row, j) =>
    row.some(
      (v, i) =>
        v &&
        (x + i < 0 ||
          x + i >= 10 ||
          y + j >= 20 ||
          (y + j >= 0 && board[y + j][x + i])),
    ),
  );
}
const colors = {
  I: "#79ddeb",
  J: "#7a9cff",
  L: "#ffb374",
  O: "#f1d770",
  S: "#a4dc86",
  T: "#c29cf4",
  Z: "#f38498",
};
let board,
  current,
  bag,
  queue,
  held,
  canHold,
  score,
  lines,
  clock,
  lock,
  resets;
function pull() {
  if (!bag.length) {
    bag = Object.keys(SHAPES);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}
function spawn(type) {
  while (queue.length < 4) queue.push(pull());
  type = type || queue.shift();
  current = { type, m: SHAPES[type].map((r) => r.slice()), x: 3, y: -1 };
  clock = 0;
  lock = 0;
  resets = 0;
  if (collision(board, current.m, current.x, current.y))
    ui.setState("over", "Stack complete");
}
function hud() {
  ui.hud(score, `LEVEL ${Math.floor(lines / 10) + 1}\n${lines} LINES`);
}
function reset() {
  board = Array.from({ length: 20 }, () => Array(10).fill(null));
  bag = [];
  queue = [];
  held = null;
  canHold = true;
  score = 0;
  lines = 0;
  spawn();
  hud();
}
function grounded() {
  return collision(board, current.m, current.x, current.y + 1);
}
function settle() {
  let top = false;
  current.m.forEach((row, j) =>
    row.forEach((v, i) => {
      if (v) {
        if (current.y + j < 0) top = true;
        else board[current.y + j][current.x + i] = current.type;
      }
    }),
  );
  if (top) {
    ui.setState("over", "Stack complete");
    return;
  }
  const kept = board.filter((r) => !r.every(Boolean)),
    n = 20 - kept.length;
  board = [...Array.from({ length: n }, () => Array(10).fill(null)), ...kept];
  score += [0, 100, 300, 500, 800][n] * (Math.floor(lines / 10) + 1);
  lines += n;
  canHold = true;
  spawn();
  hud();
}
function ghost() {
  let y = current.y;
  while (!collision(board, current.m, current.x, y + 1)) y++;
  return y;
}
function input(action) {
  if (ui.state !== "playing") return;
  if (action === "left" || action === "right") {
    const x = current.x + (action === "left" ? -1 : 1);
    if (!collision(board, current.m, x, current.y)) {
      current.x = x;
      if (grounded() && resets++ < 15) lock = 0;
    }
  } else if (action === "rotate" || action === "ccw") {
    let m = rotate(current.m);
    if (action === "ccw") m = rotate(rotate(m));
    for (const [x, y] of [
      [0, 0],
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0],
      [0, -1],
      [0, -2],
    ])
      if (!collision(board, m, current.x + x, current.y + y)) {
        current.m = m;
        current.x += x;
        current.y += y;
        if (resets++ < 15) lock = 0;
        break;
      }
  } else if (action === "down") {
    if (!grounded()) {
      current.y++;
      score++;
      hud();
    }
    clock = 0;
  } else if (action === "drop") {
    const y = ghost();
    score += (y - current.y) * 2;
    current.y = y;
    settle();
  } else if (action === "hold" && canHold) {
    const type = current.type;
    spawn(held);
    held = type;
    canHold = false;
  }
}
function update(dt) {
  clock += dt;
  if (clock >= Math.max(0.08, 0.8 - Math.floor(lines / 10) * 0.06)) {
    clock = 0;
    if (!grounded()) current.y++;
  }
  if (grounded()) {
    lock += dt;
    if (lock >= 0.45) settle();
  } else lock = 0;
}
function cell(c, x, y, type, size = 24, alpha = 1) {
  c.globalAlpha = alpha;
  c.fillStyle = colors[type];
  c.fillRect(x + 1, y + 1, size - 2, size - 2);
  c.fillStyle = "#ffffff30";
  c.fillRect(x + 3, y + 3, size - 6, 3);
  c.globalAlpha = 1;
}
function piece(c, m, ox, oy, type, size = 24, alpha = 1) {
  m.forEach((r, y) =>
    r.forEach((v, x) => {
      if (v && oy + y * size >= 0)
        cell(c, ox + x * size, oy + y * size, type, size, alpha);
    }),
  );
}
function draw(c) {
  c.fillStyle = "#101117";
  c.fillRect(0, 0, 352, 480);
  c.strokeStyle = "#242630";
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 10; x++) {
      c.strokeRect(x * 24, y * 24, 24, 24);
      if (board?.[y][x]) cell(c, x * 24, y * 24, board[y][x]);
    }
  if (!current) return;
  piece(c, current.m, current.x * 24, ghost() * 24, current.type, 24, 0.19);
  piece(c, current.m, current.x * 24, current.y * 24, current.type);
  c.fillStyle = "#a4a5ad";
  c.font = "11px system-ui";
  c.fillText("HOLD / C", 260, 24);
  c.fillText("NEXT", 260, 142);
  if (held) piece(c, SHAPES[held], 253, 45, held, 20, canHold ? 1 : 0.4);
  queue
    .slice(0, 3)
    .forEach((type, i) => piece(c, SHAPES[type], 253, 165 + i * 94, type, 20));
}
const keys = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowDown: "down",
  KeyS: "down",
  ArrowUp: "rotate",
  KeyW: "rotate",
  KeyX: "rotate",
  KeyZ: "ccw",
  Space: "drop",
  KeyC: "hold",
  ShiftLeft: "hold",
};
const ui = setup("tetris", "Make room.", 352, 480, {
  reset,
  input,
  update,
  draw,
  key(code, repeat) {
    const action = keys[code];
    if (!action) return false;
    if (!repeat || ["left", "right", "down"].includes(action)) input(action);
    return true;
  },
});
reset();
