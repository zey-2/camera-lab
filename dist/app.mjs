import { APERTURES, SHUTTERS, ISOS, createInitialState } from './model.mjs';
import { createSnapshot, transition } from './state.mjs';
import { renderInterface, createGrain } from './renderers.mjs';
import { describeCamera, renderCamera } from './camera.mjs';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const optionLists = {aperture:APERTURES, shutter:SHUTTERS, iso:ISOS};
let committed = createSnapshot(createInitialState());
let announcementTimer;
const compactQuery = matchMedia('(max-width: 899px)');
function announce(message) {
  clearTimeout(announcementTimer);
  $('#lab-announcement').textContent = '';
  announcementTimer = setTimeout(() => { $('#lab-announcement').textContent = message; }, 60);
}

function renderDiagram(snapshot) { renderCamera(document, describeCamera(snapshot)); }

/** @returns {import('./state.mjs').Snapshot} The immutable committed snapshot. */
function readSnapshot() { return committed; }
/** Validate before committing or performing any DOM side effects.
 * @param {import('./state.mjs').LabAction} action
 * @returns {import('./state.mjs').Snapshot}
 */
function dispatch(action) {
  const candidate = transition(readSnapshot(), action);
  committed = candidate;
  renderInterface(document, candidate, {compact:compactQuery.matches});
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
$('#camera-diagram').addEventListener('click', event => {
  const part=event.target.closest('[data-part]');
  if(part)dispatch({type:'select-part',part:part.dataset.part,source:'diagram'});
});
for(const button of $$('button[data-camera-type]')) button.addEventListener('click',()=>{
  dispatch({type:'set-type',cameraType:button.dataset.cameraType});
  announce(button.textContent+' camera selected.');
});
for(const button of $$('button[data-view-mode]')) button.addEventListener('click',()=>{
  dispatch({type:'set-view',viewMode:button.dataset.viewMode});
});
$('#open-cutaway').addEventListener('click',()=>{
  dispatch({type:'set-view',viewMode:'cutaway'});
  $('[data-view-mode="cutaway"]').focus();
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
const controlKeys = Object.keys(optionLists);
for (const tab of $$('[data-control]')) {
  tab.addEventListener('click', () => dispatch({type:'set-control', control:tab.dataset.control}));
  tab.addEventListener('keydown', event => {
    const index = controlKeys.indexOf(tab.dataset.control);
    const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
    if (next < 0) return;
    event.preventDefault();
    dispatch({type:'set-control', control:controlKeys[next]});
    $('#control-tab-' + controlKeys[next]).focus();
  });
}
compactQuery.addEventListener('change', () => {
  const focused = document.activeElement;
  if (compactQuery.matches && controlKeys.includes(focused.id)) {
    dispatch({type:'set-control', control:focused.id});
  } else {
    renderInterface(document, readSnapshot(), {compact:compactQuery.matches});
    if (!compactQuery.matches && focused.dataset.control) $('#' + focused.dataset.control).focus();
  }
});
for (const link of $$('a[href="#settings"]')) link.addEventListener('click', () => $('#settings').focus({preventScroll:true}));
createGrain(document);
renderInterface(document, readSnapshot(), {compact:compactQuery.matches});
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
