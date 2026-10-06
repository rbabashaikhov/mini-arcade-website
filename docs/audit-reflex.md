# Reflex games audit

Baseline source inspection (before replacement):

| Game | Severity | Reproduced by source inspection | Resolution |
| --- | --- | --- | --- |
| Pong | High | Movement uses pixels/frame; monitor refresh changes speed. Resize changes world dimensions but not paddle size. Pointer position ignores canvas scale. | Fixed logical world, delta physics with substeps, scaled pointer coordinates. |
| Pong | High | No pause or hidden-tab handling; held keys may stick after focus loss. | Explicit state machine, clear inputs on blur, automatic pause. |
| Flappy Bird | High | Every resize teleports bird and resets velocity mid-run. Pipe schedule uses wall clock while paused. | Fixed world, simulation-time obstacle clock. |
| Flappy Bird | Medium | No touch restart/pause controls; Space repeat flaps repeatedly. | Real buttons; ignore repeated keydown. |
| Whack-a-Mole | High | Starts immediately; timers continue hidden. No pause. | Deliberate start, single delta loop, hidden-tab pause. |
| Pong / Mole | Medium | Unguarded localStorage can prevent boot. | Shared safe, namespaced storage. |
| All | Medium | Inconsistent visual UI, underspecified state transitions and mobile sizing. | Coherent dark HUD, explicit states, responsive playfields and touch. |

Verification: implementation and browser regression verification are tracked by the parent audit. No baseline browser claims are made by this source audit.

Verification completed: Chromium (Microsoft Edge), all three games start/pause/resume/restart; 27 layout checks across 360x800, 390x844, 412x915, 768x1024, 1280x720, 1440x900, 1920x1080, 844x390, 1280x400. No document overflow or runtime errors. Touch mole scoring and persisted best; keyboard pause; full 30-second Mole game-over; Flappy touch input, collision game-over and retry; Pong touch and keyboard input exercised. JavaScript syntax checks pass. Mobile start-state and active-game screenshots saved as docs/reflex-*.png. Pong match completion and actual physical-device testing remain outside this subtask verification.
