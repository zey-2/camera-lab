# Inside Things: Camera Lab

Build requested 13 September 2026: propose another project and use another agent to build it. This project develops the portfolio's everyday-object atlas into one complete interactive teaching instrument.

## Product

Help a curious beginner understand how a camera turns light into an image. The first screen exposes a large interactive camera cutaway, an explode/reassemble control, selectable components, a sensor preview, and aperture/shutter/ISO settings. A short challenge gives those controls a purpose.

Three approaches considered: another PioneerLab coaching feature (shares its subject and review dependencies); a broad transport atlas (requires detailed assets and research); one self-contained Camera Lab (chosen for a complete causal demonstration).

## Experience and visual direction

Use a deep charcoal optical-workbench aesthetic, high-contrast warm white typography, restrained amber light rays, thin technical rules, and a visually dominant camera schematic. This is the working instrument itself. Use a functional SVG cross-section, not a photographic reconstruction or exact manufacturer model. Expose actual component selection and exploded layout. Keyboard users can select every component using ordinary controls.

Represent lens, aperture, shutter, sensor, and body. Explain each selected part briefly and connect relevant settings to it. Include a live illustrative sensor preview showing exposure, foreground/background sharpness, motion trails, and noise on a clearly labeled optical test scene. Any geometric scene is a scientific diagram/test target, not decorative illustration.

Settings: aperture f/1.8, f/2.8, f/4, f/5.6, f/8, f/11, f/16; shutter 1/15, 1/30, 1/60, 1/125, 1/250, 1/500, 1/1000 seconds; ISO 100, 200, 400, 800, 1600, 3200. Baseline f/4, 1/125, ISO400. Brightness ratio = (shutterSeconds / (1/125)) * (ISO / 400) * (4 / aperture)^2. Explain this as an illustrative brightness model. ISO does not increase captured photons. Depth, noise, and blur are illustrative rather than calibrated camera predictions.

Three challenges: freeze motion (fast shutter with balanced brightness), isolate a subject (wide aperture with balanced brightness), keep depth sharp (narrow aperture with balanced brightness). Show measurable goal hints, check result, and allow retry. Changing challenges clears previous feedback. Include a reset action restoring controls, assembly, component, and challenge state. A reference disclosure links verified official photography sources. A compact walkthrough in README describes a 90-second demonstration; do not create a video.

## Architecture and state

Dependency-free static ES modules. Author public assets directly under dist/. Pure simulation and challenge logic in dist/model.mjs; UI in dist/app.mjs; styling in dist/styles.css; entry dist/index.html. Use package.json for node --test and a loopback static server command. No external services, API calls, credentials, analytics, accounts, persistence, or uploads. Use textContent for dynamic text. Finite allowlisted values; invalid inputs fail without corrupting state.

Responsive desktop and phone layouts, clear labels, semantic buttons and fieldsets, visible focus, reduced-motion support. No autoplay needed for the illustrative preview; setting changes update deterministic graphics. Explain loaded scene and limitations in visible copy without dominating the interface.

## Verification

Test exposure relationships, invalid values, all challenge success/failure paths, and reset defaults with Node's built-in runner. Check syntax and all local module/style references. Parent reviews delivered files, runs fresh checks, and opens a local preview after it serves successfully. Browser automation is not requested. If WebMCP is available, add one validated set-camera-settings tool and one read-camera-state tool backed by the same actions; this is progressive enhancement and unsupported contexts must remain harmless.

## Delivery boundary

Builder owns application files only. Parent owns this brief, Sites registration/manifests, preview, integration, review coordination, and publication. Existing projects and wiki content remain untouched. Do not create a parent-repository commit: it currently has no commits and many unrelated untracked files.
