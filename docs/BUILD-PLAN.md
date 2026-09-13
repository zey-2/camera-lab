# Camera Lab Implementation Plan

**Goal:** Deliver one complete educational camera explorer built by another agent and verified by the coordinator.

**Architecture:** Static semantic HTML, CSS, SVG diagrams, deterministic preview, pure model ES module and small UI module. Author dist/ directly; no dependency installation required.

**Spec:** docs/DESIGN.md

## Global constraints

- Work only in projects/camera-lab.
- Never read credentials or change unrelated projects.
- No third-party runtime dependencies, backend, or claims of calibrated optics.
- Parent handles all Sites actions and .openai/hosting.json.
- No git operations by builder; parent coordinates an isolated project repository only if publication proceeds.

## Task 1: Complete interactive instrument (builder agent)

- [ ] Create package.json and tests/model.test.mjs. Specify independent expectations for a one-stop light change, ISO amplification, finite input validation, and challenge evaluation.
- [ ] Implement dist/model.mjs. Export DEFAULT_SETTINGS, option lists, computeExposure(settings), evaluateChallenge(id, settings), and any clean state helper needed by UI. Tests use f/4, 1/125, ISO400 = ratio 1; ISO800 = ratio 2; f/8 = ratio 0.25; 1/250 = ratio 0.5.
- [ ] Implement dist/index.html, dist/styles.css, dist/app.mjs with connected camera diagram, settings, sensor visualization, part selection, challenges, and complete reset. Use the spec as the acceptance checklist.
- [ ] Notify parent as soon as a recognizable coherent screen is ready so the local preview can open.
- [ ] Add README.md with run instructions, limitations, sources, feature list, and a concise 90-second demo walkthrough. Record tests actually run.
- [ ] Run node --test tests/model.test.mjs and node --check for modules. Return changed-file list, checks, and remaining limitations.

## Task 2: Independent verification and delivery (coordinator)

- [ ] Review application against spec and authoritative source notes. Inspect all files and run fresh tests, syntax, and entry/reference checks.
- [ ] Launch the loopback preview; verify a successful HTTP response, then open it in Codex.
- [ ] Request an independent bounded implementation review, returning any actionable findings to the same builder.
- [ ] Follow Sites hosting workflow where available. Preserve exact source and manifest; report any real publishing blocker without claiming success.
- [ ] Deliver usable project link with concise feature summary and validation result.
