# Arcade Lab redesign audit

## Baseline — 25 September 2026
Cloned the requested repository into the empty workspace. Branch `main`, clean tree, origin `https://github.com/rbabashaikhov/mini-arcade-website`, baseline commit `bc63730`. History preserved.

Baseline browser: Chromium (installed Microsoft Edge), 1440×900. Machine-readable results: `baseline.json`; screenshots: `baseline-*.png`.

| Severity | Area | Finding | Resolution / verification |
|---|---|---|---|
| Critical | Space Invaders, Asteroids | Both throw `Cannot set properties of null (setting textContent)` on startup | Game batch in progress |
| High | Portal input | Tetris-specific forwarding consumes keys globally, most games do not handle forwarded keys; WASD excluded | Replace with native iframe focus; keep UI keyboard navigation intact |
| High | Pong | Movement per frame and physics dimensions altered by resize; pointer coordinates not scaled | Game batch in progress |
| High | Snake | Collision includes departing tail; full board leaves stale food; no explicit initial state | Game batch in progress |
| High | Mobile | Most games lack complete touch controls | Per-game controls in progress |
| High | Whack-a-Mole | Direct page is 1648px tall at 1440×900; portal injects zoom workaround | Responsive game layout in progress |
| Medium | Persistence | Unprotected localStorage reads/writes; inconsistent keys | Safe shared namespaced storage added |
| Medium | Lifecycle | Hidden-tab handling and pause inconsistent; held inputs can stick | Explicit states and reset timing in progress |
| Medium | Portal | Emoji-only navigation, light default, no retry or load timeout, weak library presentation | Library redesign in progress |
| Medium | Pac-Man | Direct page taller than 900px viewport; no native action buttons | Game batch in progress |

Individual source audits are recorded in `audit-puzzles.md`, `audit-space.md`, `audit-reflex.md`. Final verification and limitations will be added after cross-device tests.
