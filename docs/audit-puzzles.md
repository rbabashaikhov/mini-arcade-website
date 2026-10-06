# Puzzle games baseline audit

Source inspection before replacement (2026-09-25):

| Severity | Game | Evidence / defect | Resolution |
|---|---|---|---|
| High | Pac-Man | Center-only turn checks use progress <= .001, but frame steps retain fractional progress; most intersections are skipped. Movement can render into a wall before collision is checked. | Replace with tile-boundary traversal and buffered turns. |
| High | Pac-Man | Collision loop can deduct several lives in one frame; uncancelled respawn timeout can mutate a restarted run. | Single collision return, delta-based respawn grace period. |
| Medium | Pac-Man | Ghost-eating points never update best score. Greedy home route can loop. | Central scoring; explicit timed ghost respawn. |
| High | Snake | Collision includes tail even when it vacates this tick. Filled board leaves stale food and never wins. | Exclude departing tail; explicit board-cleared state. |
| Medium | Snake | Starts moving immediately; no touch controls or hidden-tab pause; storage exceptions abort initialization. | Start state, swipe/buttons, safe storage, visibility pause. |
| Medium | Tetris | First left/right key moves immediately and again on next RAF because activeMoveDir resets to zero. Hard-drop score HUD can remain stale. | Single input path and central HUD updates. |
| Medium | Tetris | Repeated keydown can hard-drop several pieces; unlimited grounded rotation resets lock delay. | Edge-trigger drop/rotate/hold; capped lock resets. |
| High | All | No usable mobile control set. Tetris hides restart on compact screens; stacked preview is not deducted from board height. Pac-Man min-height + padding overflows viewport. | Responsive measured stage and visible touch controls. |
| Medium | All | Unprotected legacy localStorage, inconsistent pause/restart states, no readiness protocol. | Shared safe persistence and explicit state protocol. |

Original sources fully inspected. Implementation verification is recorded below after checks; browser coverage is maintained by the main audit.

## Completed implementation and verification

- All rows above resolved in replacement implementations. Pac-Man uses tile-boundary traversal, buffered direction changes, a single damage event per update, and delta-driven ghost respawn; no timers can escape a restart.
- Snake retains wrap mode, adds two-turn buffering, vacating-tail handling and a filled-board completion state. Tetris retains bag/ghost/three previews, adds hold and bounded lock resets.
- Shared puzzle UI provides safe score storage, readiness/state messages, start/pause/restart overlays, DPR canvas sizing, visibility pause, keyboard-accessible touch buttons, and swipe recognition. Game loops are single RAF loops with capped elapsed time.
- Chromium (Edge) automated interaction: all three games at 360×800, 390×844, 412×915, 768×1024, 1280×720, 1440×900, 1920×1080, 844×390 and 1280×500. **27 cases pass**, no JS errors or page overflow. Start, arrow key, touch button, pause and restart exercised in every case.
- Deterministic browser imports: Snake tail-vacating collision, solid wall collision, wrap and growth pass. Tetris four-rotation identity, wall/floor collisions and free placement pass.
- Browser terminal states: Snake wall death then restart; Tetris repeated hard drops to stack-out then score reset; Pac-Man pellet collection and paused-score stability pass.
- Maze graph: all 21 rows have 19 columns; BFS from player spawn reaches every walkable tile, including every pellet.
- Mobile screenshots `docs/qa-{snake,tetris,pacman}-mobile.png` captured. Tetris screenshot visually reviewed: board, hold, previews, HUD and six controls remain visible.
- Remaining limitation: browser touch emulation is verified; physical phone hardware testing is not available. Audio is intentionally not added to these three games.
