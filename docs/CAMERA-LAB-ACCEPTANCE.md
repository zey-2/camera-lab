# Camera Lab integrated acceptance evidence

Date: 3 October 2026. Branch: `codex/camera-lab`. Scope: local redesign and acceptance checkpoint; no push, PR, merge, or deployment.

- Original baseline: `c0a0e5e9daff97ca4d019d12dd75516fd9d4df6d`; original checkout remained unchanged.
- Final implementation: `cf4b8102db9b524e7518601c4a4927a58b84559a`, including the measured enlarged-text toolbar fix. Tasks 1-8 entered acceptance at independently reviewed `979f3539005178fec1a3e9ce47076c783790f359`.
- Acceptance checkpoint: the commit containing this record, titled `test: verify camera lab redesign acceptance`. Resolve its hash with `git log -1 --format=%H --grep="^test: verify camera lab redesign acceptance$"`.
- Environment: Windows, Node.js 22.17.1, Playwright CLI Chromium / HeadlessChrome 154.0.0.0. Controller browser checks and screenshot inspection are attributed below; the acceptance implementer independently ran Node, syntax, HTTP, and diff checks.
- Browser fixtures use default text and no reduced-motion preference unless explicitly stated. Sizes are CSS pixels. Default settings are f/4, 1/125 s, ISO 400, lens selected, assembled mirrorless, Viewing, active Aperture, Freeze motion, 0/3 achievements.

The reference PDFs could not be materialized with the supported Library tools (`prepare_materialize` unavailable), and inspectable reference-page pixels were unavailable. Full approved design text was supplied. Original SVG implementation from that text and the waiver of reference-pixel inspection were explicitly authorized. **No reference pixel-match claim is made.** Actual implementation screenshots were inspected.

## Acceptance status

| Gate | Status | Evidence / limit |
| --- | --- | --- |
| Numerical model, state, camera, controls, playback, progress, tools | PASS | Fresh 74/74 Node tests and syntax checks |
| Default server and complete local asset graph | PASS | `/`, stylesheet, all eight imported modules, icon: HTTP 200 and correct MIME |
| Both anatomies / all three views / desktop and mobile | PASS | Controller inspected 18 actual screenshots; bounds and no overflow measured |
| Compact tabs and responsive focus | PASS | Matching visible range, all value tabs, 901/899 px focus transition |
| Constrained reflow / doubled text | PASS | 320 px / landscape focused controls; doubled text 390 px toolbar fix retested and inspected |
| Keyboard experiments and interrupted flows | PASS | Final keyboard-only completion, reset/clear dialogs, phase cancellation, earned-progress retention |
| Reduced motion | PASS | Final both static phases/types and preference-change focus transfer |
| Native 200% zoom | PARTIAL | Real zoom changes CSS viewport; DOM/keyboard pass. Scrolled capture visual gate remains open |
| Real screen reader | NOT RUN / OPEN GATE | No supported real screen-reader control path; computer-use `node_repl` unavailable |
| Optional tool registry stub | PASS | Browser stub valid/invalid inputs and registration replacement; Node failure/lifecycle tests |
| Actual WebMCP invocation | NOT RUN | Unstubbed `webmcp-list`: no registered tools |
| Real back/forward-cache round trip / cross-browser | NOT RUN | Lifecycle events were synthetic; one Chromium version tested |
| Whole-branch independent review | PASS | [Independent review](acceptance/REVIEW.md): no actionable defects; 74 tests and direct baseline comparison of 294 settings / 1,764 evaluations passed. Task 9 review gate closed; coverage limits above remain open |

## Commands and audit

At the start of Task 9 the tracked checkout was clean; preserved `output/` QA artifacts were untracked. No install/build operation was run or needed.

```sh
npm test
npm run check
npm start
git diff --check c0a0e5e HEAD
git diff --check
git diff --name-only c0a0e5e HEAD
git diff c0a0e5e HEAD -- server.mjs .openai/hosting.json dist/icon.svg
```

The initial Task 9 fresh run, a second run before the toolbar-fix commit, and the final documentation-checkpoint run each passed 74 tests with 0 failures/skips and completed all configured syntax checks. Final transcripts are retained locally as `output/task9-tests.txt` and `output/task9-check.txt`. The server announced `Camera Lab is ready at http://127.0.0.1:4174`. All asset requests below independently returned 200:

| Paths | MIME |
| --- | --- |
| `/` | `text/html; charset=utf-8` |
| `/styles.css` | `text/css; charset=utf-8` |
| `/app.mjs`, `/model.mjs`, `/state.mjs`, `/camera-config.mjs`, `/camera.mjs`, `/renderers.mjs`, `/playback.mjs`, `/tools.mjs` | `text/javascript; charset=utf-8` |
| `/icon.svg` | `image/svg+xml` |

Baseline-to-implementation changed-file audit covers `dist/app.mjs`, `camera-config.mjs`, `camera.mjs`, `index.html`, `model.mjs`, `playback.mjs`, `renderers.mjs`, `state.mjs`, `styles.css`, `tools.mjs`; `package.json`; six test files; and this acceptance record. Task 9 additionally updates README and representative evidence. `server.mjs`, `.openai/hosting.json`, and `dist/icon.svg` have no baseline diff. Existing original design/reference notes are retained. Full output artifacts are preserved untracked; no claim of a completely clean working tree is made.

## Final viewport matrix

Controller loaded both camera types and all three views at each viewport below: 18 states. Browser page errors were `[]`; document scrollWidth equalled viewport width. Screenshots use `output/playwright/final-camera-TYPE-VIEW-WIDTH.png`.

| Viewport | Header + toolbar bottom | Workbench height / bottom | Result |
| --- | --- | --- | --- |
| 1440 x 900 | 112 | 556.1875 / 668.1875, all six states | Camera, photo, meter/equation, all three ranges co-visible |
| 1280 x 720 | 112 | 556.1875 / 668.1875, all six states | Same core feedback remains above viewport bottom |
| 390 x 844 | 132 | 548.171875 / 680.171875, Assembled, both types | Default camera, photo, meter/equation, tabs/active range co-visible |
| 390 x 844 | 132 | 683.171875 / 815.171875, Cutaway, both types | Required path labels and playback fit within 844 |
| 390 x 844 | 132 | 591.171875 / 723.171875, Exploded, both types | All separated parts and active range accessible |

Every mobile type/view/control combination (18 tab combinations) exposed exactly one matching range, with unchanged setting indices 2/3/2. The bounds are DOM measurements of the workbench, not inferences from screenshot crops. Controller inspection of all 18 screenshots found recognizable complete opaque assembled cameras, side-panel cutaways, coherent separated parts/guides, and no camera clipping. DSLR mirrorbox/prism and mirrorless shallow body/EVF are distinguishable. The full matrix was refreshed after the toolbar fix and retained these same bounds, errors `[]`, and no overflow. A [committed nine-image sample and index](acceptance/README.md) preserves representative final states; all other output artifacts remain local.

Earlier Task 5 fixture inspection covered both phases/types at 1280 and 390, four settings extremes, all type-specific named part alternatives, exploded sensor separation, and hidden-part location/Open cutaway. These are supporting fixture results, not a claim that fixtures were public playback controls. Task 6 then inspected actual timed and static public phase states.

## Optical and interaction truthfulness

DSLR Viewing sends lens light to the lowered mirror, focusing screen, prism, and optical finder; its closed shutter shields the sensor. Exposure lifts the mirror, darkens the optical finder, and admits light to the sensor. Mirrorless has no mirror/prism; solid light reaches the sensor and a labelled dashed electronic signal reaches the EVF. Exploded shows no active path and Assembled stays opaque. ISO changes image brightness without changing incoming paths. Aperture opening and symbolic shutter bar follow settings; actual shutter value is displayed separately from the finite teaching timeline.

The model retains all 294 supported setting combinations and reference equations. Browser exposure-feedback checks confirmed ISO 800 gives 1x captured light / 2x brightness; shutter 1/250 at reference aperture/ISO gives 0.5x / 0.5x. Sixty rapid range events preserve 1050 deterministic grain marks and focus, with no page errors. The tool setter and native sliders consume the same committed snapshot.

Controller final public playback and keyboard-navigation reruns:

- Playback shows Viewing immediately, Exposure after 300 ms, Viewing after 1200 ms; ten quick Play actions settle in Viewing. Settings/type/view/reset interruption returns to Viewing immediately and stays unchanged after a further 1300 ms.
- Reduced motion cancels active playback, returns to Viewing, transfers hidden Play focus to static Viewing, and exposes both static phases for both types.
- Keyboard navigation preserves ISO focus across 901 -> 899 -> 901; compact mode exposes only ISO while desktop exposes all three controls. Left/Home/End select the correct roving tab; Tab reaches ISO and Shift+Tab returns to its tab. Tab+Enter activated both type buttons, all three views for both types, and all 15 type-specific named part buttons, with the matching pressed state. Inactive compact panels are hidden.
- Final keyboard-only challenge solutions, each checked twice, produced exactly 1/3, 2/3, 3/3. Reset retained all three and the selected depth challenge and restored f/4; Clear progress cancel preserved progress and confirm cleared it to 0/3 while retaining depth, with focus retained on Clear progress after either dialog response.
- Technique-only and brightness-only partial success withhold an award; an earned success followed by failed check retains completion. Challenge change/reset close hints and reference notes and clear feedback. Confirmed clear preserves settings/type/view/static phase/challenge and open disclosures.
- Synthetic pagehide/pageshow cancels playback, returns to Viewing without replay, aborts tool registrations, and replaces exactly one two-tool generation. Final playback/challenge/flow/stub reruns reported page errors `[]`.

The single status region and DOM semantics are tested, including spoken-value attributes (`f/4`, `1/125 second`, `ISO 400`), tab selection, mode/type pressed states and completed challenge names. This establishes attribute/keyboard evidence only; it does **not** establish spoken output in a real screen reader.

## Zoom, constrained text, and limits

Native Chrome Page zoom 200% was selected in an isolated persistent QA profile and repeated on the final implementation. At a 1280 x 720 browser viewport it produced innerWidth 640, innerHeight 360, devicePixelRatio 2 and scrollWidth 640. All three focused 44 CSS px ranges were visible by DOM bounds at y=237..281; keyboard changes produced f/5.6, 1/250 s and ISO 800. Valid top-of-page native zoom pixels exist (`output/playwright/final-native-zoom200-top.png`), but scrolled screenshot attempts showed blank/cropped headless regions despite correct DOM bounds. **Native zoom visual clipping/overlap acceptance is incomplete.** CSS zoom and doubled-font screenshots are supporting visual evidence and are not substitutes for that gate.

The final constrained case found one actual regression: at 390 px with computed HTML font sizes doubled, the unwrapped camera-view row extended to x=412.109. A live one-variable wrapping check reduced document width from 412 to 390, confirming the cause. The fix allows each type/view control row to wrap; it does not hide overflow. The same case then passed with scrollWidth 390, and `final-text-double-top.png` / `final-text-double.png` were inspected for wrapped toolbar and reachable focused control. The acceptance implementer additionally inspected the doubled-text toolbar image. At 320 x 844 and 844 x 390, both types had no overflow and a reachable focused 44 CSS px ISO range set to 800; all four `final-focused-TYPE-WIDTHxHEIGHT.png` screenshots were inspected. Landscape and enlarged text use ordinary vertical scrolling, not the default-height co-visibility target.

No real screen reader was available through the supported tools. Actual spoken values, concise announcements, and assistive-technology focus behavior remain not run, so the accessibility gate stays open. Actual WebMCP execution is also not run: `webmcp-list` was retested against the final Task 8 adapter and reported no registered tools; the later CSS fix does not change that adapter. The final explicit registry stub retest set ISO 800 in visible UI, rejected a mixed-invalid patch with HTML/settings unchanged while normal Exposure -> Viewing playback continued, and recorded two initial registrations, all aborted on disposal, then four total registrations with the latest two active. This is not an actual API invocation pass.

Unmodeled behavior includes maximum-aperture DSLR viewing, live view, autofocus, exact curtain timing/travel, diffraction, and brand-specific mechanics/EVF blackout. The photo is illustrative and independent of finder state. No calibrated optical prediction, universal mirrorless blackout, or reference-pixel match is claimed.
