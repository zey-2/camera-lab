import { APERTURES, SHUTTERS, ISOS, createInitialState } from './model.mjs';
import { createSnapshot, transition } from './state.mjs';
import { renderInterface, createGrain } from './renderers.mjs';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const optionLists = {aperture:APERTURES, shutter:SHUTTERS, iso:ISOS};
let committed = createSnapshot(createInitialState());
let announcementTimer;
function announce(message) {
  clearTimeout(announcementTimer);
  $('#lab-announcement').textContent = '';
  announcementTimer = setTimeout(() => { $('#lab-announcement').textContent = message; }, 60);
}

function renderDiagram(snapshot) {
  const {state, exposure:model} = snapshot;
  const exploded = state.viewMode === 'exploded';
  const positions = exploded ? { lens: 130, aperture: 326, shutter: 473, sensor: 586, body: 680 } : { lens: 284, aperture: 371, shutter: 432, sensor: 487, body: 549 };
  for (const [key, position] of Object.entries(positions)) $(`#part-${key}`).style.setProperty('--x', `${position}px`);
  $('#assembly-toggle').setAttribute('aria-pressed', String(exploded));
  $('#assembly-status').textContent = exploded ? 'PARTS SEPARATED FOR EXPLORATION' : 'ASSEMBLED · LIGHT-TIGHT HOUSING';
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


/** @returns {import('./state.mjs').Snapshot} The immutable committed snapshot. */
function readSnapshot() { return committed; }
/** Validate before committing or performing any DOM side effects.
 * @param {import('./state.mjs').LabAction} action
 * @returns {import('./state.mjs').Snapshot}
 */
function dispatch(action) {
  const candidate = transition(readSnapshot(), action);
  committed = candidate;
  renderInterface(document, candidate, {compact:false});
  renderDiagram(candidate);
  return candidate;
}
function closeHint() {
  $('#challenge-hint').hidden = true;
  $('#hint-toggle').setAttribute('aria-expanded', 'false');
  $('#hint-toggle').textContent = 'Give me a hint';
}
function setCameraSettings(patch, selectControl) {
  dispatch({type:'set-settings', patch, selectControl});
  return readCameraState();
}
function readCameraState() {
  const {state, exposure, challenge} = readSnapshot();
  return {settings:{...state.settings}, exposure:{...exposure}, selectedPart:state.selectedPart,
    exploded:state.viewMode === 'exploded', challenge:{id:state.challengeId, ...challenge},
    completedChallenges:[...state.completed], simulation:'Illustrative, fixed scene and focus; not a calibrated camera prediction.'};
}
for (const [key, values] of Object.entries(optionLists)) {
  $(`#${key}`).addEventListener('input', event => {
    const index = Number(event.currentTarget.value);
    if (!Number.isInteger(index) || !Object.hasOwn(values, index)) return;
    setCameraSettings({[key]:values[index]}, key);
  });
}
for (const button of $$('[data-select-part]')) button.addEventListener('click', () => {
  dispatch({type:'select-part', part:button.dataset.selectPart, source:'list'});
});
for (const part of $$('.diagram-part')) part.addEventListener('click', () => {
  dispatch({type:'select-part', part:part.dataset.part, source:'diagram'});
});
$('#assembly-toggle').addEventListener('click', () => {
  dispatch({type:'set-view', viewMode:readSnapshot().state.viewMode === 'exploded' ? 'assembled' : 'exploded'});
});
for (const button of $$('[data-challenge]')) button.addEventListener('click', () => {
  dispatch({type:'choose-challenge', id:button.dataset.challenge});
  closeHint();
});
$('#hint-toggle').addEventListener('click', () => {
  const expanded = $('#hint-toggle').getAttribute('aria-expanded') === 'true';
  $('#hint-toggle').setAttribute('aria-expanded', String(!expanded));
  $('#hint-toggle').textContent = expanded ? 'Give me a hint' : 'Hide hint';
  $('#challenge-hint').hidden = expanded;
});
$('#check-challenge').addEventListener('click', () => {
  const next = dispatch({type:'check-challenge'});
  announce(next.state.feedback.message);
});
$('#reset').addEventListener('click', () => {
  dispatch({type:'reset-camera'});
  closeHint();
  $('.reference-disclosure').open = false;
  announce('Camera reset. f/4, 1/125 second, ISO 400. Lens selected, assembled mirrorless view. Experiment progress retained.');
});
createGrain(document);
renderInterface(document, readSnapshot(), {compact:false});
renderDiagram(readSnapshot());

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
