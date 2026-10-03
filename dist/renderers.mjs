import { APERTURES, SHUTTERS, ISOS, CHALLENGES } from './model.mjs';
import { getCameraConfig } from './camera-config.mjs';
/** @typedef {import('./state.mjs').Snapshot} Snapshot */
const optionLists = { aperture: APERTURES, shutter: SHUTTERS, iso: ISOS };
const parts = {
  lens: { number: '01', name: 'The lens', tag: 'FOCUS', description: 'Curved glass bends incoming light to form an image on the sensor. This lab holds focus on the moving amber target.', connection: 'Focus stays fixed here. Change the aperture to explore how much of the scene appears sharp.' },
  aperture: { number: '02', name: 'The aperture', tag: 'OPENING', description: 'Overlapping blades form an adjustable opening in the lens. A lower f-number means a wider opening: more light, with a shallower depth of field.', connection: 'Move the aperture control. Watch the opening change and the distant target soften or sharpen.' },
  shutter: { number: '03', name: 'The shutter', tag: 'TIME', description: 'The shutter controls how long light reaches the sensor. A short exposure captures less movement; a long exposure lets a moving subject leave a trail.', connection: 'Change the shutter speed. Faster times freeze the target but collect less light. The slit here is symbolic.' },
  sensor: { number: '04', name: 'The sensor', tag: 'SIGNAL', description: 'A grid of light-sensitive sites converts incoming photons into electrical signals. Those signals become the pixels in a digital image.', connection: 'ISO brightens the captured signal; it adds no photons. Notice how the captured-light readout stays fixed when only ISO changes.' },
  body: { number: '05', name: 'The camera body', tag: 'STRUCTURE', description: 'The light-tight housing holds the optical system and sensor in alignment. It keeps unwanted light out and supports the controls and electronics.', connection: 'Reassemble the view to see the parts fit together. This is a simplified mirrorless camera, with no mirror or prism.' }
};
function formatStops(stops) {
  return `${stops > 0.049 ? '+' : ''}${Math.abs(stops) < 0.05 ? '0.0' : stops.toFixed(1)}`;
}
function ratio(value) { return value >= 100 ? `${value.toFixed(1)}×` : value < 0.01 ? `${value.toFixed(3)}×` : `${value.toFixed(2)}×`; }
function settingsText(state) { const { aperture, shutter, iso } = state.settings; return `f/${aperture} · 1/${shutter} s · ISO ${iso}`; }

/** Update stable DOM nodes from committed values.
 * @param {Document|Element} root
 * @param {Snapshot} snapshot
 * @returns {void}
 */
function renderPart(root, snapshot) {
  const { state } = snapshot;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const metadata = getCameraConfig(state.cameraType).parts[state.selectedPart];
  const part = {number:'', tag:'COMPONENT', ...metadata, ...parts[state.selectedPart]};
  $('#part-detail-number').textContent = part.number;
  $('#part-name').textContent = part.name;
  $('#part-function').textContent = part.tag;
  $('#part-description').textContent = part.description;
  $('#part-connection').textContent = part.connection;
  for (const button of $$('[data-select-part]')) button.setAttribute('aria-pressed', String(button.dataset.selectPart === state.selectedPart));
  for (const group of $$('.diagram-part')) group.classList.toggle('is-selected', group.dataset.part === state.selectedPart);
}

/** Update stable DOM nodes from committed values.
 * @param {Document|Element} root
 * @param {Snapshot} snapshot
 * @returns {void}
 */
function renderControls(root, snapshot) {
  const { state, exposure: model } = snapshot;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  for (const [key, values] of Object.entries(optionLists)) {
    const input = $(`#${key}`);
    const index = values.indexOf(state.settings[key]);
    input.value = index;
    input.style.setProperty('--progress', `${index / (values.length - 1) * 100}%`);
    input.setAttribute('aria-valuetext', key === 'aperture' ? `f/${state.settings[key]}` : key === 'shutter' ? `1/${state.settings[key]} second` : `ISO ${state.settings[key]}`);
  }
  $('#aperture-value').textContent = `f/${state.settings.aperture}`;
  $('#shutter-value').textContent = `1/${state.settings.shutter} s`;
  $('#iso-value').textContent = state.settings.iso;
  $('#control-aperture-hole').setAttribute('r', Math.min(11, Math.max(2, 24 / state.settings.aperture)));
  $('#captured-light').textContent = ratio(model.lightRatio);
  $('#iso-gain').textContent = ratio(state.settings.iso / 400);
  $('#image-brightness').textContent = ratio(model.brightnessRatio);
}

/** Update stable DOM nodes from committed values.
 * @param {Document|Element} root
 * @param {Snapshot} snapshot
 * @returns {void}
 */
function renderPreview(root, snapshot) {
  const { state, exposure: model } = snapshot;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  for (const channel of ['r', 'g', 'b']) $(`#brightness-${channel}`).setAttribute('slope', model.displayGain.toFixed(4));
  $('#background-blur').setAttribute('stdDeviation', model.backgroundBlur.toFixed(2));
  for (const step of [1, 2, 3]) {
    $(`#trail-${step}`).setAttribute('x', 210 - model.motionTrail * step / 3);
    $(`#trail-${step}`).setAttribute('opacity', model.motionTrail < 1 ? 0 : (4 - step) * 0.085);
  }
  $('#grain').setAttribute('opacity', model.noiseOpacity.toFixed(3));
  const stops = formatStops(model.stops);
  $('#brightness-value').textContent = `${stops} stops`;
  const meter = $('#brightness-meter');
  meter.setAttribute('aria-valuenow', Math.max(-5, Math.min(5, model.stops)).toFixed(2));
  meter.setAttribute('aria-valuetext', `${stops} stops compared with reference${Math.abs(model.stops) > 5 ? ', beyond displayed meter range' : ''}`);
  $('#meter-needle').style.left = `${Math.max(0, Math.min(100, (model.stops + 5) * 10))}%`;
  $('#brightness-status').textContent = Math.abs(model.stops) <= 0.5 ? 'BALANCED' : model.stops < 0 ? (model.stops < -5 ? 'BELOW METER RANGE' : 'DARKER') : (model.stops > 5 ? 'ABOVE METER RANGE' : 'BRIGHTER');
  const motion = state.settings.shutter >= 500 ? 'Frozen' : state.settings.shutter >= 125 ? 'Short trail' : 'Long trail';
  const depth = state.settings.aperture >= 8 ? 'Sharp' : state.settings.aperture >= 4 ? 'Soft' : 'Very soft';
  const grain = model.noiseOpacity < 0.09 ? 'Low' : model.noiseOpacity < 0.22 ? 'Moderate' : 'Pronounced';
  $('#motion-value').textContent = motion;
  $('#depth-value').textContent = depth;
  $('#grain-value').textContent = grain;
  $('#preview-desc').textContent = `${settingsText(state)}. Image brightness ${stops} stops relative to reference. Moving target: ${motion.toLowerCase()}. Distant background: ${depth.toLowerCase()}. Illustrative grain: ${grain.toLowerCase()}. Focus is fixed on the amber target.`;
}

/** Update stable DOM nodes from committed values.
 * @param {Document|Element} root
 * @param {Snapshot} snapshot
 * @returns {void}
 */
function renderChallenge(root, snapshot) {
  const { state, challenge: evaluation } = snapshot;
  const $ = selector => root.querySelector(selector);
  const $$ = selector => [...root.querySelectorAll(selector)];
  const challenge = CHALLENGES[state.challengeId];
  for (const button of $$('[data-challenge]')) {
    button.setAttribute('aria-pressed', String(button.dataset.challenge === state.challengeId));
    const original = CHALLENGES[button.dataset.challenge].label;
    button.setAttribute('aria-label', `${original}${state.completed.includes(button.dataset.challenge) ? ', completed' : ''}`);
  }
  $('#experiment-title').textContent = challenge.title;
  $('#experiment-description').textContent = challenge.description;
  $('#technique-goal-text').textContent = challenge.goal;
  $('#technique-goal').classList.toggle('met', evaluation.techniqueMet);
  $('#brightness-goal').classList.toggle('met', evaluation.brightnessMet);
  $('#challenge-hint').textContent = challenge.hint;
  $('#challenge-current').textContent = settingsText(state);
  $('#progress-count').textContent = `${state.completed.length} / 3`;
  $$('.progress-dots i').forEach((dot, index) => dot.classList.toggle('complete', state.completed.includes(Object.keys(CHALLENGES)[index])));
  const feedback = $('#challenge-feedback');
  feedback.hidden = !state.feedback;
  if (state.feedback) {
    feedback.classList.toggle('success', state.feedback.passed);
    feedback.textContent = state.feedback.message;
  }
}

/** Render all interface surfaces from one snapshot.
 * @param {Document|Element} root
 * @param {Snapshot} snapshot
 * @param {{compact:boolean}} options Reserved for responsive controls.
 * @returns {void}
 */
export function renderInterface(root, snapshot, options = {compact:false}) {
  renderControls(root, snapshot);
  renderPart(root, snapshot);
  renderPreview(root, snapshot);
  renderChallenge(root, snapshot);
}
/** Initialize the fixed seed-2047 texture once.
 * @param {Document|Element} root
 * @returns {void}
 */
export function createGrain(root) {
  const $ = selector => root.querySelector(selector);
  const document = root.ownerDocument ?? root;
  if ($('#grain').childElementCount) return;
  let seed = 2047;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 1050; i++) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', (random() * 480).toFixed(1));
    rect.setAttribute('y', (random() * 290).toFixed(1));
    const size = (0.65 + random() * 1.35).toFixed(1);
    rect.setAttribute('width', size);
    rect.setAttribute('height', size);
    rect.setAttribute('fill', i % 3 ? '#f4fae7' : '#041c14');
    fragment.append(rect);
  }
  $('#grain').append(fragment);
}
