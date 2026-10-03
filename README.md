# Inside Things: Camera Lab

A self-contained educational camera workbench. Explore DSLR and mirrorless anatomy, follow the light, and discover the trade-offs between aperture, shutter speed, and ISO. There is no AI runtime, account, external dependency, or remote service.

This redesign is local and has not been deployed. The [previously published site](https://inside-things-camera-lab.eight-bits.chatgpt.site/) is the baseline release, not evidence of this redesign.

## Run

Requires Node.js 20 or later. From this project directory:

```sh
npm start
```

Open `http://127.0.0.1:4174`. The server binds only to loopback. Set `PORT` to choose a different port. Assets are authored directly in `dist/`; no installation or build step is needed. Any static host serving `.mjs` as JavaScript can serve `dist/`. Use HTTP, since browser module loading may fail with `file://` URLs.

```sh
npm test
npm run check
git diff --check
```

## The instrument

The initial state is **assembled mirrorless**, viewing phase, lens selected, aperture control active, f/4, 1/125 s, ISO 400, Freeze motion selected, and 0/3 experiments completed.

- **Assembled:** complete opaque housing. Selecting an internal part with its named button opens Cutaway; a slider can instead mark its location inside the closed camera, with an Open cutaway action.
- **Cutaway:** the same camera with a side panel removed, showing anatomy and the current viewing or exposure path.
- **Exploded:** the same components separated along alignment guides. It shows no functioning light or electronic path.
- **Two anatomies:** both have lens, aperture, shutter, sensor, and body. Mirrorless adds an electronic viewfinder; DSLR adds reflex mirror, focusing screen, prism, and optical viewfinder. Every part has a named selection button below the workbench.
- **Coherent feedback:** one committed snapshot supplies the camera, simulated photo, brightness meter, captured-light equation, controls, and challenge evaluation. ISO changes signal brightness, never incoming light.
- **Controls:** seven apertures, seven shutter speeds, and six ISO values use native sliders. Below 900 CSS px, value-bearing Aperture/Shutter/ISO tabs expose one range at a time; Left/Right, Home, and End select tabs. Desktop shows all three ranges.
- **Playback:** Play exposure is available in Cutaway. It shows Viewing immediately, Exposure after 300 ms, and Viewing after 1200 ms. Timing is slowed for learning and independent of the chosen shutter speed, which is labelled separately. Setting, type, view, or reset actions cancel playback; page hide cancels it and page show restores Viewing without replay. Repeated Play restarts one finite sequence.
- **Reduced motion:** Cutaway replaces playback with static Viewing and Exposure buttons. Changing the motion preference cancels playback and moves focus between equivalent controls.
- **Experiments:** three challenges have separate technique and brightness goals, hints, actionable feedback, and session achievements. Successful checks award each challenge once. Setting edits, later failed checks, and Reset camera preserve earned completion. Changing challenge preserves settings and selects its linked control.
- **Reset camera:** restores camera/settings/part/control/phase defaults, clears current feedback, and closes hints and reference notes; it retains the selected challenge and achievements. Clear progress separately asks for confirmation and clears achievements/current feedback while retaining the camera and challenge. Reload starts a new session; nothing is stored persistently.

Optional WebMCP tools `read_camera_state` and `set_camera_settings` register when `document.modelContext.registerTool` is available, with `navigator.modelContext` as fallback. The read keeps legacy fields and adds camera type, view mode, and exposure phase. The setter accepts only supported numeric aperture/shutter/ISO values, validates the whole patch before changing state, and updates the same UI as sliders without selecting a part. Both inputs are validated; empty or unknown setter patches reject. Registration failures do not prevent ordinary use, and page lifecycle cleanup aborts registrations before replacement.

## A 90-second demo

1. **0-15 seconds:** Start with assembled Mirrorless. Open Cutaway, then switch to DSLR. Follow the viewing path through mirror, focusing screen, prism, and optical finder. Try Exploded, then return to Cutaway.
2. **15-30 seconds:** Play exposure: the DSLR mirror rises, finder darkens, and light reaches the sensor. With reduced motion, use the static Exposure and Viewing buttons. Return to Mirrorless to compare its sensor-to-EVF electronic signal.
3. **30-45 seconds:** At f/4, 1/125 s, ISO 400, set ISO 800. Brightness doubles while captured light remains 1.00x. Return ISO to 400.
4. **45-60 seconds:** For Freeze motion, set 1/500 s and ISO 1600 at f/4. The trail shrinks while reference brightness is restored. Check the settings.
5. **60-75 seconds:** Choose Isolate a subject; use f/2.8, 1/250 s, ISO 400 and check. Choose Keep depth sharp; use f/8, 1/30 s, ISO 400 and check.
6. **75-90 seconds:** Open Behind the simulation to explain the model. Reset camera restores the instrument while retaining 3/3 achievements and Keep depth sharp. Use Clear progress only when you want to erase achievements.

## Model and honest limits

Settings use a shutter denominator (`125` means `1/125` second). The reference is f/4, 1/125 s, ISO 400.

```text
lightRatio = (125 / shutterDenominator) x (4 / fNumber)^2
brightnessRatio = lightRatio x (ISO / 400)
brightnessStops = log2(brightnessRatio)
```

ISO does not increase the photons reaching the sensor. The meter and readouts show the mathematical ratio. The preview applies a compressed, clamped brightness transformation to keep the range legible; it is not a photometric output. The simulated photo predicts the captured result independently of the camera finder and playback phase.

The fixed scene represents a 50 mm lens focused on the amber moving target. Depth-of-field blur, motion trails, aperture opening, symbolic shutter timing, and grain are bounded illustrative proxies, not calibrated optical or sensor predictions. Grain depends on captured light and a simple ISO term; high ISO does not inevitably produce a noisier final image. Real cameras also depend on illumination, subject speed, focus distance, lens design, sensor characteristics, processing, and diffraction. Narrow-aperture diffraction is not modeled.

The original SVG schematics are not to scale. DSLR viewing routes light to the optical finder while the closed shutter shields the sensor; exposure lifts the mirror and darkens that finder. Mirrorless viewing routes light to the sensor and a separately labelled dashed electronic signal to the EVF, with no mirror or prism. The exposure phase depicts a representative mechanical capture interval. Maximum-aperture DSLR viewing, live view, autofocus, exact curtain travel/timing, and brand-specific behavior are not simulated. The EVF signal is illustrative; universal mirrorless blackout behavior is not implied.

Each challenge requires its technique criterion **and** brightness within +/-0.5 stops of reference: Freeze uses denominator >=500; Isolate uses f-number <=2.8; Depth uses f-number >=8. Many solutions are possible. A recorded completion means a previously successful check, not necessarily that current settings still pass.

The supplied reference PDF pixels could not be inspected. Original SVG implementation from the approved textual design was authorized; no reference pixel-match claim is made.

## Verification

Validated locally on 3 October 2026 with Node.js 22.17.1 and Playwright CLI HeadlessChrome 154.0.0.0 on Windows. `npm test` passes 74 Node tests, covering all 294 setting combinations, model validation, immutable state, anatomy, responsive controls, playback cancellation, progress, and tool contracts/lifecycle. `npm run check` syntax-checks every application module and the server.

The controller ran real browser viewport, keyboard, reduced-motion, interrupted-flow, and exposure-feedback checks. A registry stub exercised both optional tools and lifecycle replacement. Real screen-reader execution and actual WebMCP invocation remain **not run**; the unstubbed browser reported no registered tools. Native 200% zoom has DOM/keyboard evidence, but scrolled headless captures could not support a visual pass. Cross-browser rendering and real back/forward-cache restoration are not verified. See the [acceptance record](docs/CAMERA-LAB-ACCEPTANCE.md) for measured results, screenshots, commands, and remaining gates.

## References

- [Nikon: Understanding maximum aperture](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-maximum-aperture)
- [Nikon: A basic look at the basics of exposure](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/a-basic-look-at-the-basics-of-exposure)
- [Adobe: Using high ISO settings in photography](https://blog.adobe.com/en/publish/2023/04/20/lowdown-using-high-iso-settings-in-photography)
- [Canon: Camera technology](https://global.canon/en/technology/canon-tech/tech/dslr/)

## Files

- `dist/index.html`, `dist/styles.css` - semantic interface, stable SVG containers, responsive layout, and visual treatment.
- `dist/model.mjs` - allowed settings, reference exposure equations, initial defaults, and challenge criteria.
- `dist/state.mjs` - validated immutable snapshots and state transitions.
- `dist/camera-config.mjs`, `dist/camera.mjs` - type-specific anatomy, shared geometry across views, paths, and SVG rendering.
- `dist/renderers.mjs` - controls, simulated photo, deterministic 1050-mark grain, component details, playback UI, and challenge rendering.
- `dist/playback.mjs` - finite cancellable teaching sequence.
- `dist/tools.mjs`, `dist/app.mjs` - compatible optional tools, registration cleanup, UI events, snapshot commitment, and lifecycle orchestration.
- `tests/*.test.mjs` - Node built-in tests for camera, markup/renderers, model, playback, state, and tools.
- `server.mjs`, `dist/icon.svg`, `.openai/hosting.json` - original loopback static server, icon, and hosting metadata, unchanged by the redesign.
- `docs/` - original design/reference notes and integrated acceptance evidence. `output/playwright/` retains additional local QA artifacts and is not published.
