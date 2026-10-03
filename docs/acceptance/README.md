# Representative final browser evidence

Captured and inspected by the controller on 3 October 2026 using Playwright CLI HeadlessChrome 154.0.0.0 on Windows, against the final local implementation `cf4b8102db9b524e7518601c4a4927a58b84559a`. The full [acceptance record](../CAMERA-LAB-ACCEPTANCE.md) contains measured bounds, interaction results and open gates. These nine PNGs are a small retained sample; the full 18-state matrix and other fixtures remain in local `output/playwright/`.

| Image | Viewport / setting | Evidence |
| --- | --- | --- |
| [Mirrorless assembled](final-camera-mirrorless-assembled-390.png) | 390 x 844, default text/motion/settings | Default complete opaque camera and active aperture range |
| [DSLR assembled](final-camera-dslr-assembled-1280.png) | 1280 x 720, defaults except type | Recognizable complete DSLR and all three ranges |
| [DSLR cutaway](final-camera-dslr-cutaway-1280.png) | 1280 x 720, Viewing | Mirror / focusing-screen / prism / optical-finder path |
| [Mirrorless cutaway](final-camera-mirrorless-cutaway-390.png) | 390 x 844, Viewing | Sensor light and separately labelled electronic signal |
| [DSLR exploded](final-camera-dslr-exploded-390.png) | 390 x 844 | Separated type-specific anatomy and alignment guides |
| [Mirrorless exploded](final-camera-mirrorless-exploded-1280.png) | 1280 x 720 | Same components separated, with no functioning light/signal path |
| [Doubled text toolbar](final-text-double-top.png) | 390 x 844, computed HTML font sizes doubled, mirrorless Cutaway | Fixed toolbar wrapping; ordinary vertical reflow |
| [Doubled text control](final-text-double.png) | Same case, scrolled to focused range | Focused range remains reachable after text enlargement |
| [320 px focused ISO](final-focused-dslr-320x844.png) | 320 x 844, DSLR Cutaway, ISO 800 | Focused 44 CSS px range remains reachable |

Doubled computed fonts are not native browser zoom. Native 200% DOM/keyboard checks passed, but scrolled headless capture pixels could not prove visual clipping/overlap acceptance. None of these images claims matching unavailable source-reference pixels. Captures are evidence, not deployed application assets.
