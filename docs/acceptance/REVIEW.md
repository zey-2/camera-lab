# Camera Lab whole-branch independent review

**Verdict: PASS for the implementation and Task 9 review gate. No actionable correctness findings or new implementation blockers.** This does not close the explicitly open accessibility/native-zoom validation gates or establish unrun browser/API coverage.

Reviewed on 3 October 2026: baseline `c0a0e5e9daff97ca4d019d12dd75516fd9d4df6d` through acceptance checkpoint `25b76f79a970bf6f0701a0c49b0b7c8ecff23bd8`, including production `cf4b8102db9b524e7518601c4a4927a58b84559a`. Read the approved plan and six-page design text, prior Tasks 1–8 reviews, README, acceptance record, source/test changes, browser harnesses, and all nine committed representative PNGs. No source/test edits, subagents, commit, push, or publication performed.

## Findings

No severity-ranked defect requiring a change was identified. `docs/CAMERA-LAB-ACCEPTANCE.md:29` intentionally lists this review as pending at the reviewed checkpoint; the controller can replace that row with this result in its planned documentation follow-up. The separately documented unrun/partial checks must remain explicit.

## Independent verification

- `npm test`: **74 passed, 0 failed, 0 skipped, 0 cancelled**.
- `npm run check`: all eight application modules and server passed syntax checks.
- `git diff --check c0a0e5e9daff97ca4d019d12dd75516fd9d4df6d HEAD` and working-tree `git diff --check`: passed.
- An additional one-off Node comparison loaded the original model directly from `git show` and the final model/state modules. All **294** supported settings produced deeply equal baseline/final exposure objects; all **1,764** combinations of settings, two camera types, and three challenges produced deeply equal baseline/final exposure and evaluation objects. Allowed arrays and the entire three-challenge definition object also matched exactly.
- Protected-file audit: baseline diff for `server.mjs`, `.openai/hosting.json`, and `dist/icon.svg` was empty. Reviewed tree had only the existing untracked `output/` directory.

## Source and visual assessment

- `dist/state.mjs:54`, `dist/app.mjs:35`: detached frozen snapshots, reused exposure on non-settings actions, and one candidate shared by both renderers maintain consistent state. Transition validation precedes cancellation, commitment, and DOM effects. Invalid mixed settings therefore cannot partially commit or cancel playback.
- `dist/playback.mjs:5`, `dist/app.mjs:82`: finite 300/1200 ms teaching phases use generation invalidation as well as cleared timers. Manually invoked stale callbacks are covered by tests. Settings/type/view/reset interruption, page lifecycle cancellation, static reduced-motion phases, and preference-change focus transfer agree with the approved contract.
- `dist/camera-config.mjs:37`, `dist/camera.mjs:9` and `:109`: the DSLR viewing ray meets the authored reflective stroke at approximately `(410.557377,195)`, crosses the focusing screen at y=134, traverses the prism, and ends inside the optical finder. The raised mirror clears the horizontal capture ray; the shutter opens and the finder darkens during exposure. Mirrorless light ends on its sensor and the separately styled electronic path ends within the EVF. ISO does not affect these paths or their styling. Shared anchors remain consistent across assembled/cutaway/exploded views; assembled hides internals and paths, exploded shows separated parts/guides without live paths.
- `dist/renderers.mjs:87` and `:161`: photo gain, blur, trail/noise formulas and seed-2047/1050-mark grain match baseline behavior and remain independent of finder phase. `dist/state.mjs:151` and `:155` distinguish camera reset from confirmed progress clearing; earned completions remain unique and survive later failures and reset.
- `dist/app.mjs:138`, `dist/renderers.mjs:39`, `dist/styles.css:222`: stable native ranges, roving tabs, hidden inactive compact panels, and breakpoint focus handling support the keyboard behavior. The final toolbar wrapping change addresses its measured enlarged-text overflow without hiding page overflow.
- `dist/tools.mjs:11`, `:25`, `:59`: both legacy tools retain their names, schemas, annotations, and seven legacy read fields; only the three approved read fields are additive. Detached reads, validated setters without extra part selection, optional registration, and generation-local failure/disposal behavior are sound.

Independently inspected all nine images under `docs/acceptance/`: both assembled cameras, DSLR desktop and mirrorless mobile cutaways, both exploded variants, doubled-text toolbar and focused control, and the focused 320px DSLR case. They show opaque recognizable housings, coherent cutaways and separated anatomy, distinct light/signal legends, uncropped camera geometry, co-visible default feedback/controls, and readable ordinary enlarged-text reflow. Original PDF pixels were explicitly waived; no pixel-match assessment is made.

Exact final 18-state bounds, 18 mobile tab combinations, browser console results, keyboard challenge completion, repeated/interrupted playback, and registry-stub results are **controller evidence**, not browser runs repeated by this reviewer. The inspected final viewport, keyboard, constrained-text, native-zoom, and tool-stub harnesses support the stated scope. Fresh numerical/source checks and committed-image inspection above are this reviewer's own evidence.

## Remaining acceptance limits

README and acceptance documentation honestly retain: real screen-reader execution not run; native 200% zoom DOM/keyboard results without a completed scrolled-pixel visual gate; actual WebMCP invocation not run (stub only); cross-browser and real back/forward-cache restoration not run. These are coverage limits, not demonstrated implementation defects. Task 9 can record its independent review as passed while preserving those open gates; the redesign must not be described as fully verified across them.
