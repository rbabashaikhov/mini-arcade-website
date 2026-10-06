import { best } from "./storage.js";
export function setup(slug, title, width, height, actions) {
  const canvas = document.querySelector("canvas"),
    ctx = canvas.getContext("2d"),
    stage = document.querySelector(".stage");
  let state = "ready",
    high = best(slug),
    lastScore = null,
    lastExtra = null;
  const hud = (score, extra = "") => {
    if (score !== lastScore) {
      high = best(slug, score);
      document.querySelector("#score").textContent = score;
      document.querySelector("#best").textContent = high;
      lastScore = score;
    }
    if (extra !== lastExtra) {
      document.querySelector("#extra").textContent = extra;
      lastExtra = extra;
    }
  };
  const setState = (next, message = "") => {
    state = next;
    document.body.dataset.state = next;
    document.querySelector(".overlay").hidden = next === "playing";
    document.querySelector("#stateTitle").textContent =
      message ||
      { ready: title, paused: "Take a breather", over: "Run complete" }[next];
    document.querySelector("#startBtn").textContent =
      next === "paused"
        ? "Resume"
        : next === "over"
          ? "Play again"
          : "Start game";
    document.querySelector("#pauseBtn").textContent =
      next === "paused" ? "Resume" : "Pause";
    parent.postMessage({ type: "arcade:state", state: next }, location.origin);
  };
  const pause = () => {
    if (state === "playing") setState("paused");
    else if (state === "paused") setState("playing");
  };
  document.querySelector("#startBtn").onclick = () => {
    if (state !== "paused") actions.reset();
    setState("playing");
    canvas.focus({ preventScroll: true });
  };
  document.querySelector("#restartBtn").onclick = () => {
    actions.reset();
    setState("playing");
    canvas.focus({ preventScroll: true });
  };
  document.querySelector("#pauseBtn").onclick = pause;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing") setState("paused");
  });
  window.addEventListener("blur", () => {
    actions.release?.();
    if (state === "playing") setState("paused");
  });
  window.addEventListener("message", (e) => {
    if (
      e.origin !== location.origin ||
      e.source !== parent ||
      e.data?.type !== "arcade:command"
    )
      return;
    if (e.data.command === "restart") {
      actions.reset();
      setState("playing");
    }
    if (e.data.command === "pause" && state === "playing") setState("paused");
  });
  window.addEventListener("keydown", (e) => {
    if (
      e.target.closest("input,select,textarea") ||
      e.target.isContentEditable ||
      (e.target.closest("button") && ["Space", "Enter"].includes(e.code))
    )
      return;
    if (e.code === "KeyR" && !e.repeat) {
      actions.reset();
      setState("playing");
      e.preventDefault();
    } else if (
      ["KeyP", "Escape", ...(actions.pauseKeys || [])].includes(e.code) &&
      !e.repeat
    ) {
      pause();
      e.preventDefault();
    } else if (state === "playing" && actions.key(e.code, e.repeat)) {
      e.preventDefault();
    }
  });
  document.querySelectorAll("[data-action]").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      if (state !== "playing") return;
      e.preventDefault();
      actions.input(b.dataset.action);
      canvas.focus();
    });
    b.addEventListener("click", (e) => {
      if (e.detail === 0 && state === "playing")
        actions.input(b.dataset.action);
    });
  });
  function resize() {
    const r = stage.getBoundingClientRect(),
      scale = Math.min((r.width - 4) / width, (r.height - 4) / height),
      dpr = Math.min(devicePixelRatio || 1, 3);
    canvas.style.width = `${Math.max(1, width * scale)}px`;
    canvas.style.height = `${Math.max(1, height * scale)}px`;
    canvas.width = Math.round(width * scale * dpr);
    canvas.height = Math.round(height * scale * dpr);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  setState("ready");
  parent.postMessage({ type: "arcade:ready" }, location.origin);
  let last = 0;
  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    if (state === "playing") actions.update(dt);
    actions.draw(ctx, t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return {
    canvas,
    ctx,
    hud,
    setState,
    get state() {
      return state;
    },
  };
}
export function swipe(canvas, callback) {
  let start;
  canvas.addEventListener("pointerdown", (e) => {
    start = [e.clientX, e.clientY];
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start[0],
      dy = e.clientY - start[1];
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 14)
      callback(
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up",
      );
  });
  canvas.addEventListener("pointercancel", () => (start = null));
}
