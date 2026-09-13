import { APERTURES, SHUTTERS, ISOS, CHALLENGES, createInitialState, updateSettings, computeExposure, evaluateChallenge } from './model.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const optionLists = { aperture: APERTURES, shutter: SHUTTERS, iso: ISOS };
const parts = {
  lens: { number: '01', name: 'The lens', tag: 'FOCUS', description: 'Curved glass bends incoming light to form an image on the sensor. This lab holds focus on the moving amber target.', connection: 'Focus stays fixed here. Change the aperture to explore how much of the scene appears sharp.' },
  aperture: { number: '02', name: 'The aperture', tag: 'OPENING', description: 'Overlapping blades form an adjustable opening in the lens. A lower f-number means a wider opening: more light, with a shallower depth of field.', connection: 'Move the aperture control. Watch the opening change and the distant target soften or sharpen.' },
  shutter: { number: '03', name: 'The shutter', tag: 'TIME', description: 'The shutter controls how long light reaches the sensor. A short exposure captures less movement; a long exposure lets a moving subject leave a trail.', connection: 'Change the shutter speed. Faster times freeze the target but collect less light. The slit here is symbolic.' },
  sensor: { number: '04', name: 'The sensor', tag: 'SIGNAL', description: 'A grid of light-sensitive sites converts incoming photons into electrical signals. Those signals become the pixels in a digital image.', connection: 'ISO brightens the captured signal; it adds no photons. Notice how the captured-light readout stays fixed when only ISO changes.' },
  body: { number: '05', name: 'The camera body', tag: 'STRUCTURE', description: 'The light-tight housing holds the optical system and sensor in alignment. It keeps unwanted light out and supports the controls and electronics.', connection: 'Reassemble the view to see the parts fit together. This is a simplified mirrorless camera, with no mirror or prism.' }
};
let state = createInitialState();
let announcementTimer;

function announce(message) {
  clearTimeout(announcementTimer);
  $('#lab-announcement').textContent = '';
  announcementTimer = setTimeout(() => { $('#lab-announcement').textContent = message; }, 60);
}

function formatStops(stops) {
  return `${stops > 0.049 ? '+' : ''}${Math.abs(stops) < 0.05 ? '0.0' : stops.toFixed(1)}`;
}
function ratio(value) { return value >= 100 ? `${value.toFixed(1)}×` : value < 0.01 ? `${value.toFixed(3)}×` : `${value.toFixed(2)}×`; }
function settingsText() { const { aperture, shutter, iso } = state.settings; return `f/${aperture} · 1/${shutter} s · ISO ${iso}`; }

function renderPart() {
  const part = parts[state.selectedPart];
  $('#part-detail-number').textContent = part.number;
  $('#part-name').textContent = part.name;
  $('#part-function').textContent = part.tag;
  $('#part-description').textContent = part.description;
  $('#part-connection').textContent = part.connection;
  for (const button of $$('[data-select-part]')) button.setAttribute('aria-pressed', String(button.dataset.selectPart === state.selectedPart));
  for (const group of $$('.diagram-part')) group.classList.toggle('is-selected', group.dataset.part === state.selectedPart);
}

function renderDiagram(model) {
  const positions = state.exploded ? { lens: 130, aperture: 326, shutter: 473, sensor: 586, body: 680 } : { lens: 284, aperture: 371, shutter: 432, sensor: 487, body: 549 };
  for (const [key, position] of Object.entries(positions)) $(`#part-${key}`).style.setProperty('--x', `${position}px`);
  $('#assembly-toggle').setAttribute('aria-pressed', String(state.exploded));
  $('#assembly-status').textContent = state.exploded ? 'PARTS SEPARATED FOR EXPLORATION' : 'ASSEMBLED · LIGHT-TIGHT HOUSING';
  $('#aperture-hole').setAttribute('ry', model.apertureOpening.toFixed(2));
  $('#aperture-hole').setAttribute('rx', (model.apertureOpening * 0.39).toFixed(2));
  const lensX = positions.lens + 45;
  const sensorX = positions.sensor + 8;
  const edge = 28 + model.apertureOpening * 0.5;
  $('#light-fill').setAttribute('d', `M23 ${186 - edge}H${lensX}L${sensorX} 186 ${lensX} ${186 + edge}H23Z`);
  $('#ray-top').setAttribute('d', `M23 ${186 - edge}H${lensX}L${sensorX} 186`);
  $('#ray-mid').setAttribute('d', `M23 186H${sensorX}`);
  $('#ray-bottom').setAttribute('d', `M23 ${186 + edge}H${lensX}L${sensorX} 186`);
  $('#shutter-gap').setAttribute('stroke-width', Math.max(1.5, Math.min(28, 1000 / state.settings.shutter)).toFixed(2));
}

function renderControls(model) {
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

function renderPreview(model) {
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
  $('#preview-desc').textContent = `${settingsText()}. Image brightness ${stops} stops relative to reference. Moving target: ${motion.toLowerCase()}. Distant background: ${depth.toLowerCase()}. Illustrative grain: ${grain.toLowerCase()}. Focus is fixed on the amber target.`;
}

function renderChallenge() {
  const challenge = CHALLENGES[state.challengeId];
  const evaluation = evaluateChallenge(state.challengeId, state.settings);
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
  $('#challenge-current').textContent = settingsText();
  $('#progress-count').textContent = `${state.completed.length} / 3`;
  $$('.progress-dots i').forEach((dot, index) => dot.classList.toggle('complete', state.completed.includes(Object.keys(CHALLENGES)[index])));
  const feedback = $('#challenge-feedback');
  feedback.hidden = !state.feedback;
  if (state.feedback) {
    feedback.classList.toggle('success', state.feedback.passed);
    feedback.textContent = state.feedback.message;
  }
}

function render() {
  const model = computeExposure(state.settings);
  renderControls(model);
  renderPart();
  renderDiagram(model);
  renderPreview(model);
  renderChallenge();
}

function setCameraSettings(patch, selectPart) {
  // Validate the complete update before touching state or the DOM.
  const next = updateSettings(state.settings, patch);
  state.settings = next;
  state.feedback = null;
  if (selectPart && Object.hasOwn(parts, selectPart)) state.selectedPart = selectPart;
  render();
  return readCameraState();
}

function readCameraState() {
  return { settings: { ...state.settings }, exposure: computeExposure(state.settings), selectedPart: state.selectedPart, exploded: state.exploded, challenge: { id: state.challengeId, ...evaluateChallenge(state.challengeId, state.settings) }, completedChallenges: [...state.completed], simulation: 'Illustrative, fixed scene and focus; not a calibrated camera prediction.' };
}

// Seeded geometry: no animation, random redraw, remote texture, or image download.
function createGrain() {
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

for (const [key, values] of Object.entries(optionLists)) {
  $(`#${key}`).addEventListener('input', event => {
    const index = Number(event.currentTarget.value);
    if (!Number.isInteger(index) || !Object.hasOwn(values, index)) return;
    setCameraSettings({ [key]: values[index] }, key === 'iso' ? 'sensor' : key);
  });
}
for (const button of $$('[data-select-part]')) button.addEventListener('click', () => {
  state.selectedPart = button.dataset.selectPart;
  renderPart();
});
for (const part of $$('.diagram-part')) part.addEventListener('click', () => {
  state.selectedPart = part.dataset.part;
  renderPart();
});
$('#assembly-toggle').addEventListener('click', () => {
  state.exploded = !state.exploded;
  renderDiagram(computeExposure(state.settings));
});
for (const button of $$('[data-challenge]')) button.addEventListener('click', () => {
  state.challengeId = button.dataset.challenge;
  state.feedback = null;
  state.selectedPart = CHALLENGES[state.challengeId].part;
  $('#challenge-hint').hidden = true;
  $('#hint-toggle').setAttribute('aria-expanded', 'false');
  $('#hint-toggle').textContent = 'Give me a hint';
  renderPart();
  renderChallenge();
});
$('#hint-toggle').addEventListener('click', () => {
  const expanded = $('#hint-toggle').getAttribute('aria-expanded') === 'true';
  $('#hint-toggle').setAttribute('aria-expanded', String(!expanded));
  $('#hint-toggle').textContent = expanded ? 'Give me a hint' : 'Hide hint';
  $('#challenge-hint').hidden = expanded;
});
$('#check-challenge').addEventListener('click', () => {
  const result = evaluateChallenge(state.challengeId, state.settings);
  const brightness = `${formatStops(result.stops)} stops`;
  let message;
  if (result.passed) {
    if (!state.completed.includes(state.challengeId)) state.completed.push(state.challengeId);
    message = `Experiment complete. ${CHALLENGES[state.challengeId].goal} ✓ Brightness ${brightness} ✓ Try another experiment or find a different solution.`;
  } else if (!result.techniqueMet && !result.brightnessMet) {
    message = `Keep exploring. Aim for ${CHALLENGES[state.challengeId].goal.toLowerCase()}, then balance brightness to within ±0.5 stops. Yours is ${brightness}.`;
  } else if (!result.techniqueMet) {
    message = `Brightness is balanced at ${brightness}. Next, aim for ${CHALLENGES[state.challengeId].goal.toLowerCase()} and compensate with the other settings.`;
  } else {
    message = `The creative target is met. Brightness is ${brightness}; ${result.stops < 0 ? 'increase' : 'decrease'} it to within ±0.5 stops using the other settings.`;
  }
  state.feedback = { ...result, message };
  renderChallenge();
  announce(message);
});
$('#reset').addEventListener('click', () => {
  state = createInitialState();
  $('#challenge-hint').hidden = true;
  $('#hint-toggle').setAttribute('aria-expanded', 'false');
  $('#hint-toggle').textContent = 'Give me a hint';
  $('.reference-disclosure').open = false;
  render();
  announce('Lab reset. f/4, 1/125 second, ISO 400. Lens selected, exploded view on. Experiment progress cleared.');
});

createGrain();
render();

// Progressive WebMCP support. Registration failures never gate the instrument.
const modelContext = document.modelContext ?? navigator.modelContext;
let toolLifecycle;
function registerCameraTools() {
  if (!modelContext || typeof modelContext.registerTool !== 'function') return;
  if (toolLifecycle && !toolLifecycle.signal.aborted) return;
  toolLifecycle = new AbortController();
  const lifecycle = toolLifecycle;
  const definitions = [
    {
      name: 'read_camera_state',
      title: 'Read camera state',
      description: 'Read the Camera Lab settings, illustrative light and brightness model, component selection, and challenge evaluation.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async input => {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 0) throw new TypeError('Invalid read input: expected an empty object');
        return readCameraState();
      }
    },
    {
      name: 'set_camera_settings',
      title: 'Set camera settings',
      description: 'Set one or more Camera Lab controls to supported numeric values. Shutter is the denominator: 500 means 1/500 second. Updates the same visible state as the sliders.',
      inputSchema: { type: 'object', minProperties: 1, properties: { aperture: { type: 'number', enum: [...APERTURES] }, shutter: { type: 'number', enum: [...SHUTTERS] }, iso: { type: 'number', enum: [...ISOS] } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async input => setCameraSettings(input)
    }
  ];
  for (const definition of definitions) {
    try {
      void Promise.resolve(modelContext.registerTool(definition, { signal: lifecycle.signal })).catch(() => lifecycle.abort());
    } catch { lifecycle.abort(); }
    if (lifecycle.signal.aborted) break;
  }
}
registerCameraTools();
addEventListener('pagehide', () => toolLifecycle?.abort());
addEventListener('pageshow', () => { if (toolLifecycle?.signal.aborted) registerCameraTools(); });
