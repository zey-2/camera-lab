import { createInitialState, validateSettings, updateSettings, computeExposure, evaluateChallenge, CHALLENGES } from './model.mjs';
import { getCameraConfig } from './camera-config.mjs';
/** @typedef {'mirrorless'|'dslr'} CameraType */
/** @typedef {'assembled'|'cutaway'|'exploded'} ViewMode */
/** @typedef {'aperture'|'shutter'|'iso'} Control */
/** @typedef {'viewing'|'exposure'} Phase */
/** @typedef {'freeze'|'isolate'|'depth'} ChallengeId */
/** @typedef {'lens'|'aperture'|'shutter'|'sensor'|'body'|'mirror'|'focusing-screen'|'prism'|'optical-finder'|'evf'} PartId */
/** @typedef {{aperture:number, shutter:number, iso:number}} Settings */
/** @typedef {{passed:boolean, techniqueMet:boolean, brightnessMet:boolean, stops:number, message:string}} Feedback */
/** @typedef {{settings:Settings, selectedPart:PartId, cameraType:CameraType, viewMode:ViewMode, activeControl:Control, exposurePhase:Phase, challengeId:ChallengeId, feedback:Feedback|null, completed:ChallengeId[]}} LabState */
/** @typedef {ReturnType<typeof import('./model.mjs').computeExposure>} Exposure */
/** @typedef {ReturnType<typeof import('./model.mjs').evaluateChallenge>} Evaluation */
/** @typedef {{state:LabState, exposure:Exposure, challenge:Evaluation}} Snapshot */
/** @typedef {{type:'set-settings',patch:Partial<Settings>,selectControl?:Control}|{type:'select-part',part:PartId,source:'list'|'diagram'}|{type:'set-type',cameraType:CameraType}|{type:'set-view',viewMode:ViewMode}|{type:'set-phase',phase:Phase}|{type:'set-control',control:Control}|{type:'choose-challenge',id:ChallengeId}|{type:'check-challenge'}|{type:'reset-camera'}} LabAction */
const controls = ['aperture','shutter','iso'];
const views = ['assembled','cutaway','exploded'];
const controlParts = {aperture:'aperture',shutter:'shutter',iso:'sensor'};
function oneOf(value, values, label) {
  if (!values.includes(value)) throw new RangeError(`Invalid ${label}`);
}

/** @param {LabState} state @returns {LabState} */
function copyState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new TypeError('Invalid state');
  validateSettings(state.settings);
  const config = getCameraConfig(state.cameraType);
  oneOf(state.viewMode, views, 'view mode');
  oneOf(state.activeControl, controls, 'control');
  oneOf(state.exposurePhase, ['viewing','exposure'], 'phase');
  if (state.exposurePhase === 'exposure' && state.viewMode !== 'cutaway') {
    throw new RangeError('Exposure phase requires cutaway');
  }
  oneOf(state.selectedPart, config.partIds, 'part');
  oneOf(state.challengeId, Object.keys(CHALLENGES), 'challenge');
  if (!Array.isArray(state.completed) || new Set(state.completed).size !== state.completed.length) {
    throw new TypeError('Invalid completions');
  }
  for (const id of state.completed) oneOf(id, Object.keys(CHALLENGES), 'completion');
  if (state.feedback !== null && (
    !state.feedback || typeof state.feedback !== 'object' || Array.isArray(state.feedback) ||
    ['passed','techniqueMet','brightnessMet'].some(key => typeof state.feedback[key] !== 'boolean') ||
    !Number.isFinite(state.feedback.stops) || typeof state.feedback.message !== 'string'
  )) throw new TypeError('Invalid feedback');
  return {
    ...state,
    settings: {...state.settings},
    completed: [...state.completed],
    feedback: state.feedback === null ? null : {...state.feedback}
  };
}

/** @param {LabState} state @param {Exposure} [exposure] @returns {Snapshot} */
function snapshot(state, exposure) {
  const copy = copyState(state);
  const result = exposure ?? computeExposure(copy.settings);
  Object.freeze(copy.settings);
  Object.freeze(copy.completed);
  if (copy.feedback) Object.freeze(copy.feedback);
  return Object.freeze({
    state: Object.freeze(copy),
    exposure: Object.freeze(result),
    challenge: Object.freeze(evaluateChallenge(copy.challengeId, copy.settings, result))
  });
}
/** Create a detached committed snapshot; renderers consume its derived values.
 * @param {LabState} state
 * @returns {Snapshot}
 */
export function createSnapshot(state) { return snapshot(state); }
/** Validate and derive without mutating the current snapshot.
 * @param {Snapshot} current
 * @param {LabAction} action
 * @returns {Snapshot}
 */
export function transition(current, action) {
  if (!action || typeof action !== 'object' || Array.isArray(action)) throw new TypeError('Invalid action');
  let state = copyState(current.state);
  let exposure = current.exposure;
  switch (action.type) {
    case 'set-settings':
      state.settings = updateSettings(state.settings, action.patch);
      if (action.selectControl !== undefined) {
        oneOf(action.selectControl, controls, 'control');
        state.activeControl = action.selectControl;
        state.selectedPart = controlParts[action.selectControl];
      }
      state.feedback = null;
      state.exposurePhase = 'viewing';
      exposure = undefined;
      break;
    case 'set-type': {
      const config = getCameraConfig(action.cameraType);
      state.cameraType = action.cameraType;
      if (!config.partIds.includes(state.selectedPart)) state.selectedPart = 'sensor';
      state.exposurePhase = 'viewing';
      break;
    }
    case 'set-view':
      oneOf(action.viewMode, views, 'view mode');
      state.viewMode = action.viewMode;
      state.exposurePhase = 'viewing';
      break;
    case 'set-control':
      oneOf(action.control, controls, 'control');
      state.activeControl = action.control;
      break;
    case 'set-phase':
      oneOf(action.phase, ['viewing','exposure'], 'phase');
      if (action.phase === 'exposure' && state.viewMode !== 'cutaway') {
        throw new RangeError('Exposure phase requires cutaway');
      }
      state.exposurePhase = action.phase;
      break;
    case 'select-part': {
      const config = getCameraConfig(state.cameraType);
      oneOf(action.part, config.partIds, 'part');
      oneOf(action.source, ['list','diagram'], 'selection source');
      state.selectedPart = action.part;
      if (action.source === 'list' && state.viewMode === 'assembled' && config.parts[action.part].internal) {
        state.viewMode = 'cutaway';
      }
      break;
    }
    case 'choose-challenge':
     oneOf(action.id, Object.keys(CHALLENGES), 'challenge');
     state.challengeId = action.id;
     state.activeControl = action.id === 'freeze' ? 'shutter' : 'aperture';
     state.selectedPart = CHALLENGES[action.id].part;
     state.feedback = null;
     break;
    case 'check-challenge': {
     const result = current.challenge;
     const goal = CHALLENGES[state.challengeId].goal;
     const stops = result.stops;
     const brightness = `${stops > 0.049 ? '+' : ''}${Math.abs(stops) < 0.05 ? '0.0' : stops.toFixed(1)} stops`;
     let message;
     if (result.passed) {
      if (!state.completed.includes(state.challengeId)) state.completed.push(state.challengeId);
      message = `Experiment complete. ${goal} ✓ Brightness ${brightness} ✓ Try another experiment or find a different solution.`;
     } else if (!result.techniqueMet && !result.brightnessMet) {
      message = `Keep exploring. Aim for ${goal.toLowerCase()}, then balance brightness to within ±0.5 stops. Yours is ${brightness}.`;
     } else if (!result.techniqueMet) {
      message = `Brightness is balanced at ${brightness}. Next, aim for ${goal.toLowerCase()} and compensate with the other settings.`;
     } else {
      message = `The creative target is met. Brightness is ${brightness}; ${stops < 0 ? 'increase' : 'decrease'} it to within ±0.5 stops using the other settings.`;
     }
     state.feedback = {...result, message};
     break;
    }
    case 'reset-camera':
      state = {...createInitialState(), challengeId:state.challengeId, completed:[...state.completed]};
      exposure = undefined;
      break;
    default:
      throw new RangeError('Unknown action');
  }
  return snapshot(state, exposure);
}
