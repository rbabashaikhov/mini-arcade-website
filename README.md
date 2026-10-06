# Arcade Lab

A browser arcade with eight reimagined classics. Pure HTML, CSS, and JavaScript — no frameworks, no backend, no external dependencies.

**→ [Live demo](https://github.com/rbabashaikhov/mini-arcade-website)**

---

## Games

| Game | Category | Controls |
|------|----------|----------|
| Tetris | Puzzle | Arrows move · X/Z rotate · Space drop · C hold · P pause |
| Snake | Arcade | Arrows / WASD / swipe · P pause · R restart |
| Pac-Man | Puzzle | Arrows / WASD / swipe · P pause |
| Pong | Arcade | W/S or arrows · drag touch · Space serve |
| Space Invaders | Action | A/D or arrows · Space fire · touch buttons |
| Asteroids | Action | ← → rotate · W/↑ thrust · Space fire · touch buttons |
| Flappy Bird | Arcade | Space / tap to flap |
| Whack-a-Mole | Arcade | Click or tap the mole |

---

## What's inside

- **Dark arcade portal** — game library with search, filter, thumbnails, and a featured spotlight
- **Shared design system** — token CSS (`shared/tokens.css`) and storage (`shared/storage.js`)
- **Shared puzzle UI** — `shared/puzzle-ui.js` provides start/pause/restart states, HUD, DPR canvas scaling, swipe, and visibility pause for Tetris / Snake / Pac-Man
- **Physics bugs fixed** — delta-time, refresh-rate independence, hidden-tab pause across all games
- **Mobile touch controls** — on-screen buttons and swipe for all eight games
- **Responsive** — tested at 360×800, 390×844, 412×915, 768×1024, 1280×720, 1440×900, 1920×1080, 844×390 (landscape), 1280×480
- **High scores** — safe `localStorage` with per-game namespace
- **iframe + standalone** — every game works both embedded in the portal and as a direct page

---

## Run locally

```bash
node tools/serve.cjs        # serves public/ at http://127.0.0.1:8000
```

Or any static file server from the `public/` directory.

---

## Tests

Requires [Playwright](https://playwright.dev/) (`npm install` then `npx playwright install chromium`).

```bash
node tests/logic.cjs   # headless unit tests: Snake / Tetris / Pac-Man game logic
node tests/smoke.cjs   # full browser smoke: 72 game launches × 9 viewports
```

---

## Deploy (Beget VPS / Caddy)

The `public/` directory is a self-contained static site. Serve it with Caddy, Nginx, or any static host:

```caddy
arcade.example.com {
    root * /path/to/public
    file_server
}
```

No build step needed. All assets are relative paths.

---

## Structure

```
public/
  index.html          portal
  styles.css          portal styles
  app.js              portal logic
  games.json          game metadata
  assets/
    logo.svg
    cover.svg
    thumbs/           game thumbnail SVGs
  shared/
    tokens.css        design tokens
    storage.js        safe localStorage helpers
    puzzle-ui.css     shared CSS for puzzle games
    puzzle-ui.js      shared JS for puzzle games
  games/
    tetris/           index.html · style.css · game.js
    snake/            …
    pacman/           …
    pong/             …
    space-invaders/   …
    asteroids/        …
    flappy-bird/      …
    whack-a-mole/     …
docs/                 audit notes and QA screenshots
tests/               smoke.cjs · logic.cjs
tools/               serve.cjs · baseline.cjs · artwork.cjs
```

---

**Author:** Ruslan Babashaikhov · [GitHub](https://github.com/rbabashaikhov)
