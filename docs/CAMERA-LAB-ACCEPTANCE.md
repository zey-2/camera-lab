# Camera Lab acceptance evidence

Task 3 responsive workbench checkpoint, 3 October 2026. Baseline: `882f478`.

This record covers layout only. Camera silhouettes and anatomy remain the existing drawing until later approved tasks. No claim of pixel matching an unavailable reference page is made.

## Automated checks

- Before implementation, the responsive markup assertion failed because matching tab and panel targets were absent.
- After implementation: `npm test` passes 30 tests; `npm run check` passes; `git diff --check` passes.
- Markup assertions prove matching tab/panel references, one physical range per setting, and details/challenges/reference following the workbench.
- Renderer checks prove compact mode hides inactive panels, exposes every setting value, and preserves the spoken shutter value `1/125 second`. Desktop exposes all three panels.

## Browser evidence

Baseline screenshots were captured by the controller at 1280 × 720 and 390 × 844 before implementation. Initial layout measurements failed the height goals and led to reduced illustration space and secondary padding.

Controller browser verification confirmed no horizontal page overflow at 1440 × 900, 1280 × 720, 390 × 844, 320 × 844, and 844 × 390. ISO focus survived 901 → 899 → 901; compact mode retained the focused ISO panel. Left wrapped Aperture to ISO; Home and End selected their endpoint tabs.

Final viewport bounds, screenshots, and zoom results will be recorded after the controller completes the final layout pass. Screenshots live in `output/playwright/` and are local evidence, not hosted assets.

## Remaining acceptance gates

Whole-camera visual recognition, all anatomy/view combinations, actual screen-reader execution, playback, challenge progress, and actual tool integration belong to subsequent tasks and are not asserted here.

### Constrained reading checks

The controller applied CSS `zoom: 2` at 1280 × 720: document width stayed 1280 CSS px, controls remained visible with ordinary vertical scrolling, and the screenshot was inspected. At 390 × 844, doubling each computed HTML font size kept document width at 390 CSS px and text wrapped normally. Screenshots: `output/playwright/layout-csszoom200.png` and `output/playwright/layout-large-text.png`.

Actual browser 200% zoom is **not run**: Ctrl+= had no effect in the available headless browser (innerWidth and devicePixelRatio stayed unchanged). CSS zoom is supporting evidence, not an actual browser zoom pass.

### Final default viewport results

Browser: HeadlessChrome 154.0.0.0, Windows 10 user agent. Default text. Measurements supplied by the controller's actual Playwright CLI browser run:

| Viewport | Header + toolbar bottom | Workbench height / bottom | Result |
| --- | --- | --- | --- |
| 1440 × 900 | 112 | 556.19 / 668.19 | Core feedback and all ranges co-visible |
| 1280 × 720 | 112 | 556.19 / 668.19 | Core feedback and all ranges co-visible |
| 390 × 844 | — | bottom 677.77 | Camera, photo, meter, all tab values and active range co-visible |
| 320 × 844 | — | bottom 680.17 | Ordinary reflow; no horizontal overflow |
| 844 × 390 | — | bottom 817.77 | Ordinary vertical scrolling; no horizontal overflow |

Document scrollWidth equalled viewport width in every case. Final desktop screenshots were captured after the last sizing correction; mobile and constrained screenshots correspond to the matching unchanged responsive sizes. Screenshots: `layout-1440x900.png`, `layout-1280x720.png`, `layout-390x844.png`, `layout-320x844.png`, `layout-844x390.png` under `output/playwright/`.

The Task 3 layout gate passes. Actual browser zoom remains an explicitly unrun integrated acceptance check.
