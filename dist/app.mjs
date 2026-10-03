import { APERTURES, SHUTTERS, ISOS, CHALLENGES, createInitialState } from './model.mjs';
import { createSnapshot, transition } from './state.mjs';
import { renderInterface, createGrain } from './renderers.mjs';
import { describeCamera, renderCamera } from './camera.mjs';
import { getCameraConfig } from './camera-config.mjs';
import { createPlayback } from './playback.mjs';
import { serializeCameraState, registerCameraTools } from './tools.mjs';
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const optionLists = {aperture:APERTURES, shutter:SHUTTERS, iso:ISOS};
let committed = createSnapshot(createInitialState());
let announcementTimer;
const compactQuery = matchMedia('(max-width: 899px)');
const reducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
const playback = createPlayback({onPhase:phase => dispatch({type:'set-phase', phase})});
const playbackInterruptions = new Set(['set-settings','set-type','set-view','reset-camera']);
function announce(message) {
  clearTimeout(announcementTimer);
  $('#lab-announcement').textContent = '';
  announcementTimer = setTimeout(() => { $('#lab-announcement').textContent = message; }, 60);
}

function renderDiagram(snapshot) { renderCamera(document, describeCamera(snapshot)); }
function renderSnapshot(snapshot) {
  renderInterface(document, snapshot, {compact:compactQuery.matches, reducedMotion:reducedMotionQuery.matches});
  renderDiagram(snapshot);
}

/** @returns {import('./state.mjs').Snapshot} The immutable committed snapshot. */
function readSnapshot() { return committed; }
/** Validate before committing or performing any DOM side effects.
 * @param {import('./state.mjs').LabAction} action
 * @returns {import('./state.mjs').Snapshot}
 */
function dispatch(action) {
  const candidate = transition(readSnapshot(), action);
  if (playbackInterruptions.has(action.type)) playback.cancel();
  committed = candidate;
  renderSnapshot(candidate);
  return candidate;
}
function closeHint() {
  $('#challenge-hint').hidden = true;
  $('#hint-toggle').setAttribute('aria-expanded', 'false');
  $('#hint-toggle').textContent = 'Give me a hint';
}
function closeDisclosures() {
  closeHint();
  $('.reference-disclosure').open = false;
}
function setCameraSettings(patch, selectControl) {
  dispatch({type:'set-settings', patch, selectControl});
  return readCameraState();
}
function readCameraState() {
  return serializeCameraState(readSnapshot());
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
  const next=dispatch({type:'set-type',cameraType:button.dataset.cameraType});
  const selection=getCameraConfig(next.state.cameraType).parts[next.state.selectedPart].name.replace(/^The /,'');
  announce(`${button.textContent} camera. ${selection} selected.`);
});
for(const button of $$('button[data-view-mode]')) button.addEventListener('click',()=>{
  dispatch({type:'set-view',viewMode:button.dataset.viewMode});
});
$('#open-cutaway').addEventListener('click',()=>{
  dispatch({type:'set-view',viewMode:'cutaway'});
  $('[data-view-mode="cutaway"]').focus();
});
$('#play-exposure').addEventListener('click', () => {
  if (readSnapshot().state.viewMode === 'cutaway' && !reducedMotionQuery.matches) playback.play();
});
for (const phase of ['viewing','exposure']) $('#phase-' + phase).addEventListener('click', () => {
  if (readSnapshot().state.viewMode !== 'cutaway' || !reducedMotionQuery.matches) return;
  playback.cancel();
  dispatch({type:'set-phase', phase});
});
reducedMotionQuery.addEventListener('change', () => {
  const focused = document.activeElement;
  playback.cancel();
  dispatch({type:'set-phase', phase:'viewing'});
  if (focused.id === 'play-exposure' && reducedMotionQuery.matches) $('#phase-viewing').focus();
  else if (['phase-viewing','phase-exposure'].includes(focused.id) && !reducedMotionQuery.matches) $('#play-exposure').focus();
});
for (const button of $$('[data-challenge]')) button.addEventListener('click', () => {
  const next = dispatch({type:'choose-challenge', id:button.dataset.challenge});
  closeDisclosures();
  announce(`${CHALLENGES[next.state.challengeId].title}. ${next.state.activeControl === 'shutter' ? 'Shutter' : 'Aperture'} selected. Camera settings and experiment progress retained.`);
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
  closeDisclosures();
  announce('Camera reset. f/4, 1/125 second, ISO 400. Lens selected, assembled mirrorless view. Experiment progress retained.');
});
$('#clear-progress').addEventListener('click', () => {
  const confirmed = confirm('Clear all earned challenge completions? Camera settings will stay unchanged.');
  $('#clear-progress').focus();
  if (!confirmed) return;
  dispatch({type:'clear-progress', confirmed:true});
  announce('Experiment progress cleared. Camera settings and current experiment retained.');
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
    renderSnapshot(readSnapshot());
    if (!compactQuery.matches && focused.dataset.control) $('#' + focused.dataset.control).focus();
  }
});
for (const link of $$('a[href="#settings"]')) link.addEventListener('click', () => $('#settings').focus({preventScroll:true}));
createGrain(document);
renderSnapshot(readSnapshot());

// Progressive WebMCP support. Registration failures never gate the instrument.
const modelContext = document.modelContext ?? navigator.modelContext;
const toolApi = {read:readCameraState, set:patch => setCameraSettings(patch)};
let toolLifecycle = registerCameraTools(modelContext, toolApi);
function ensureCameraTools() {
  if (!toolLifecycle) toolLifecycle = registerCameraTools(modelContext, toolApi);
}
addEventListener('pagehide', () => {
  playback.cancel();
  committed = transition(readSnapshot(), {type:'set-phase', phase:'viewing'});
  toolLifecycle?.dispose();
  toolLifecycle = undefined;
});
addEventListener('pageshow', () => {
  renderSnapshot(readSnapshot());
  ensureCameraTools();
});
