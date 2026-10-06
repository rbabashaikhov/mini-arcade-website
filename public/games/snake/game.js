import { setup, swipe } from "../../shared/puzzle-ui.js";
import { get, set } from "../../shared/storage.js";
export function advance(body, dir, food, wrap, cols = 24, rows = 18) {
  let head = { x: body[0].x + dir.x, y: body[0].y + dir.y };
  if (wrap) {
    head.x = (head.x + cols) % cols;
    head.y = (head.y + rows) % rows;
  }
  const grows = head.x === food?.x && head.y === food?.y;
  if (
    head.x < 0 ||
    head.x >= cols ||
    head.y < 0 ||
    head.y >= rows ||
    body
      .slice(0, grows ? body.length : -1)
      .some((p) => p.x === head.x && p.y === head.y)
  )
    return null;
  return [head, ...(grows ? body : body.slice(0, -1))];
}
const dirs = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
let snake,
  dir,
  queue,
  food,
  score,
  clock = 0;
const toggle = document.querySelector("#wrapToggle");
toggle.checked = get("snake:wrap", false) === true;
toggle.onchange = () => set("snake:wrap", toggle.checked);
function place() {
  const cells = [];
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 24; x++)
      if (!snake.some((p) => p.x === x && p.y === y)) cells.push({ x, y });
  food = cells[Math.floor(Math.random() * cells.length)];
}
function reset() {
  snake = [
    { x: 9, y: 9 },
    { x: 8, y: 9 },
    { x: 7, y: 9 },
  ];
  dir = dirs.right;
  queue = [];
  score = 0;
  clock = 0;
  place();
  ui.hud(score, "SPEED 01");
}
function input(name) {
  if (ui.state !== "playing") return;
  const next = dirs[name],
    prev = queue.at(-1) || dir;
  if (
    next &&
    queue.length < 2 &&
    !(next.x === -prev.x && next.y === -prev.y) &&
    !(next.x === prev.x && next.y === prev.y)
  )
    queue.push(next);
}
function update(dt) {
  clock += dt;
  const speed = Math.max(0.075, 0.17 - Math.floor(score / 5) * 0.01);
  if (clock < speed) return;
  clock -= speed;
  dir = queue.shift() || dir;
  const next = advance(snake, dir, food, toggle.checked);
  if (!next) {
    ui.setState("over", "End of the line");
    return;
  }
  const ate = next.length > snake.length;
  snake = next;
  if (ate) {
    score++;
    place();
    ui.hud(
      score,
      `SPEED ${String(Math.floor(score / 5) + 1).padStart(2, "0")}`,
    );
    if (!food) ui.setState("over", "Grid complete!");
  }
}
function draw(c) {
  c.fillStyle = "#101713";
  c.fillRect(0, 0, 480, 360);
  c.strokeStyle = "#203027";
  c.lineWidth = 0.5;
  for (let x = 0; x <= 480; x += 20) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 360);
    c.stroke();
  }
  for (let y = 0; y <= 360; y += 20) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(480, y);
    c.stroke();
  }
  if (food) {
    c.fillStyle = "#ff977b";
    c.beginPath();
    c.arc(food.x * 20 + 10, food.y * 20 + 10, 6, 0, 7);
    c.fill();
    c.fillStyle = "#d2f86a";
    c.fillRect(food.x * 20 + 11, food.y * 20 + 1, 4, 3);
  }
  snake?.forEach((p, i) => {
    c.fillStyle = i === 0 ? "#dcff91" : "#80b963";
    c.beginPath();
    c.roundRect(p.x * 20 + 1, p.y * 20 + 1, 18, 18, i === 0 ? 6 : 4);
    c.fill();
    if (i === 0) {
      c.fillStyle = "#182218";
      const ox = dir.y ? 5 : dir.x > 0 ? 13 : 5,
        oy = dir.x ? 5 : dir.y > 0 ? 13 : 5;
      c.fillRect(p.x * 20 + ox, p.y * 20 + oy, 3, 3);
      c.fillRect(
        p.x * 20 + (dir.y ? 13 : ox),
        p.y * 20 + (dir.x ? 13 : oy),
        3,
        3,
      );
    }
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
const ui = setup("snake", "Stay hungry.", 480, 360, {
  reset,
  input,
  update,
  draw,
  pauseKeys: ["Space"],
  key(code) {
    if (keys[code]) {
      input(keys[code]);
      return true;
    }
  },
});
reset();
swipe(ui.canvas, input);
