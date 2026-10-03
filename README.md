# Inside Things: Camera Lab

Live site: [Inside Things: Camera Lab](https://inside-things-camera-lab.eight-bits.chatgpt.site/)

A self-contained educational camera workbench, built by an agent from the approved design. Explore a camera cutaway, follow the light, and discover the trade-offs between aperture, shutter speed, and ISO. There is no AI runtime, account, external dependency, or remote service.

## Run

Requires Node.js 20 or later. From this project directory:

```sh
npm start
```

Open `http://127.0.0.1:4174`. The server binds only to the loopback interface. Set `PORT` to choose a different port. The published site consists entirely of `dist/`; any static host serving `.mjs` as JavaScript can serve it. Open it through HTTP, since browser module loading may fail with `file://` URLs.

```sh
npm test
npm run check
```

No installation or build step is needed. Assets are authored directly in `dist/`.

## The instrument

- Five selectable components: lens, aperture, shutter, sensor, and body.
- Exploded and assembled schematic views, with aperture opening and a symbolic shutter slit connected to settings.
- Seven apertures, seven shutter speeds, and six ISO settings with native keyboard-accessible sliders.
- A deterministic geometric optical target whose brightness, distant-target softness, moving-target trail, and grain respond to settings.
- A brightness meter and a separate captured-light calculation that make the role of ISO explicit.
- Three experiments, measurable criteria, live goal indicators, optional hints, actionable result feedback, and session-only completion tracking.
- Complete reset of controls, component, assembly, selected challenge, feedback, hints, progress, and reference disclosure.
- Responsive layouts, visible focus, reduced-motion support, accessible component buttons, and descriptive preview text.
- Optional WebMCP `read_camera_state` and `set_camera_settings` tools when `document.modelContext.registerTool` is available, with a `navigator.modelContext` fallback. Both inputs are validated; the setter rejects empty, unknown, and unsupported settings before modifying state. Registration includes behavioral annotations, handles synchronous and asynchronous failure, and uses abort-based page lifecycle cleanup. Unsupported browsers use the same complete interface without these tools.

## A 90-second demo

1. **0–15 seconds:** Select Lens, Aperture, Shutter, and Sensor. Toggle Exploded view off and on to connect the individual parts to the assembled camera.
2. **15–30 seconds:** At the initial f/4, 1/125 s, ISO 400 settings, move ISO to 800. Brightness doubles while captured light remains at 1.00×. Return ISO to 400.
3. **30–50 seconds:** Choose Freeze motion. Set shutter to 1/500 s: the target trail nearly disappears and the image dims. Set ISO to 1600 to recover the reference brightness. Check the settings to complete the experiment.
4. **50–65 seconds:** Choose Isolate a subject. Set f/2.8, 1/250 s, ISO 400. Notice the softened distant target. Check the result.
5. **65–80 seconds:** Choose Keep depth sharp. Set f/8, 1/30 s, ISO 400. The distant target becomes sharp while the moving target leaves a trail. Check the result to complete all three experiments.
6. **80–90 seconds:** Open Behind the simulation to explain the model and references, then Reset lab to return every interaction to its initial state.

## Model and honest limits

Settings use a shutter denominator (`125` means `1/125` second). The reference is f/4, 1/125 s, ISO 400.

```text
lightRatio = (125 / shutterDenominator) × (4 / fNumber)²
brightnessRatio = lightRatio × (ISO / 400)
brightnessStops = log₂(brightnessRatio)
```

ISO does not increase the photons reaching the sensor. The meter and readouts show the mathematical ratio. The preview applies a compressed, clamped brightness transformation to keep the range legible; it is not a photometric output.

The fixed scene represents a 50 mm lens focused on the amber moving target. Depth-of-field blur, motion trails, aperture visualization, shutter slit, and grain are bounded illustrative proxies, not calibrated optical or sensor predictions. Grain depends on both captured light and a simple ISO term. High ISO does not inevitably produce a noisier final image. Real cameras also depend on illumination, subject speed, focus distance, lens design, sensor characteristics, processing, and diffraction. Narrow apertures do not model diffraction here. The mirrorless-style cutaway is schematic, not to scale; Canon's reference includes DSLR-specific components deliberately omitted from this model.

Experiment acceptance requires both its technical criterion and brightness within ±0.5 stops of reference. Freeze: denominator ≥500. Isolate: f-number ≤2.8. Depth: f-number ≥8. Many solutions are possible. Completion records a previously successful check; changing controls clears current feedback but preserves session achievements. Nothing persists across reloads.

## Verification

Validated with Node.js 24.21.0:

- 12 Node built-in tests pass: reference exposure; ISO/light separation; aperture and shutter relationships; compensation; all 294 allowed combinations producing finite model values; invalid inputs; all three challenge paths; brightness tolerance; reset defaults.
- JavaScript syntax checks pass for `dist/model.mjs`, `dist/app.mjs`, and `server.mjs`.
- Local entry assets, module imports, and literal UI ID references checked against the delivered files.

Browser interaction, cross-browser rendering, and experimental WebMCP execution have not been browser-tested in this build. The parent coordinator independently reviews and hosts the output.

## References

- [Nikon: Understanding maximum aperture](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-maximum-aperture)
- [Nikon: A basic look at the basics of exposure](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/a-basic-look-at-the-basics-of-exposure)
- [Adobe: Using high ISO settings in photography](https://blog.adobe.com/en/publish/2023/04/20/lowdown-using-high-iso-settings-in-photography)
- [Canon: Camera technology](https://global.canon/en/technology/canon-tech/tech/dslr/)

## Files

- `dist/index.html` — semantic interface and functional SVG diagrams.
- `dist/styles.css` — responsive instrument layout and visual treatment.
- `dist/app.mjs` — DOM rendering, interactions, deterministic grain, progressive WebMCP registration.
- `dist/model.mjs` — pure validation, simulation, state defaults, and challenge evaluation.
- `dist/icon.svg` — local icon.
- `tests/model.test.mjs` — meaningful model tests using Node's built-in runner.
- `server.mjs` — small loopback-only static server with correct module MIME types.
- `docs/` and `.openai/` — coordinator-owned design, references, and hosting metadata.
