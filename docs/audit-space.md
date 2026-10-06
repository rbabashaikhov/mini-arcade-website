# Space games baseline audit
Source inspected before edits: all original files in both game directories.

| Severity | Game | Original problem | Resolution |
|---|---|---|---|
| High | Invaders | Invulnerability checked outside enemy bullet loop, allowing multiple lives lost per frame. | One hit per simulation step plus simulation-time shield. |
| High | Both | No touch controls; simulation begins before player readiness. | Explicit start and multitouch controls. |
| Medium | Both | Wall-clock shields expire while paused; no hidden-tab pause; repeated P toggles state. | Simulation-time cooldowns/shields, visibility pause, repeat guard. |
| Medium | Both | Storage failure can abort startup. | Shared safe storage. |
| Medium | Both | Independent canvas width/max-height distorts aspect; no DPR scaling. | Fit fixed logical arena with DPR backing. |
| Medium | Invaders | Formation edge not clamped, bullets can hit multiple targets. | Clamp edge and consume bullets once. |
| Medium | Asteroids | Point collisions can tunnel through small rocks. | Fixed 120Hz simulation steps. |
| Medium | Both | Per-frame HUD writes; generic light UI; canvas-only state messages. | Event-driven HUD and HTML state overlays. |

Baseline source behavior: immediate simulation, keyboard only. Root baseline pass owns original browser inspection. Final browser verification is consolidated in REDESIGN-AUDIT.md.

## Completed implementation and verification

- Root Chromium baseline reproduced a startup TypeError in both original games (`Cannot set properties of null (setting textContent)`); rewritten HUD references now match HTML.
- Both pages now use original dark artwork, accessible HTML state panels, event-driven HUD, score records, separate multitouch action buttons and same-origin launcher commands.
- Fixed 120 Hz simulation steps keep collision resolution and motion independent of rendering rate. Shields/cooldowns advance only while playing. Asteroids has irregular rotating rocks, splitting, toroidal collision distance and safer respawn locations. Invaders has clamped formation reversal, bottom-row enemy fire, one-hit shields and consumed projectiles.
- Headless Edge browser verification: both games passed start → play → pause → restart across 360×800, 390×844, 412×915, 768×1024, 1280×720, 1440×900, 1920×1080, 844×390 and 1280×480 (18 page runs). No page errors, no horizontal or vertical document overflow. Screenshots captured at 390 and 1440 widths; 390px Asteroids screenshot visually inspected.
- Controlled animation-clock verification advanced each game for 300 simulation seconds: both reached `over`, lives exactly zero. Restart restored three lives; 1,000 further paused frames preserved paused state and lives.
- JavaScript syntax checks passed for both game scripts. All six source files formatted with Prettier 3.6.2 (temporary external tool, no runtime dependency).
- These tests emulate Chromium viewports and input; real physical device feel remains a recommended follow-up. Full cross-product regression is owned by the main QA pass.
