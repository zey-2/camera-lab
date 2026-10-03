import { createInitialState, validateSettings, updateSettings, computeExposure, evaluateChallenge, CHALLENGES } from './model.mjs';
import { getCameraConfig } from './camera-config.mjs';
/** @typedef {'mirrorless'|'dslr'} CameraType */
/** @typedef {'assembled'|'cutaway'|'exploded'} ViewMode */
/** @typedef {'aperture'|'shutter'|'iso'} Control */
/** @typedef {'viewing'|'exposure'} Phase */
/** @typedef {'freeze'|'isolate'|'depth'} ChallengeId */
/** @typedef {'lens'|'aperture'|'shutter'|'sensor'|'body'|'mirror'|'focusing-screen'|'prism'|'optical-finder'|'evf'} PartId */
/** @typedef {ReturnType<import('./model.mjs').createInitialState>} LabState */
/** @typedef {ReturnType<import('./model.mjs').computeExposure>} Exposure */
/** @typedef {ReturnType<import('./model.mjs').evaluateChallenge>} Evaluation */
/** @typedef {{state:LabState, exposure:Exposure, challenge:Evaluation}} Snapshot */
/** @typedef {{type:'set-settings',patch:object,selectControl?:Control}|{type:'select-part',part:PartId,source:'list'|'diagram'}|{type:'set-type',cameraType:CameraType}|{type:'set-view',viewMode:ViewMode}|{type:'set-control',control:Control}|{type:'reset-camera'}} LabAction */
const controls = ['aperture','shutter','iso'];
const views = ['assembled','cutaway','exploded'];
const controlParts = {aperture:'aperture',shutter:'shutter',iso:'sensor'};
function oneOf(value, values, label) { if (!values.includes(value)) throw new RangeError(`Invalid ${label}`); }
function copyState(state) {
 if (!state || typeof state !== 'object' || Array.isArray(state)) throw new TypeError('Invalid state');
 validateSettings(state.settings);
 const config = getCameraConfig(state.cameraType);
 oneOf(state.viewMode,views,'view mode'); oneOf(state.activeControl,controls,'control');
 oneOf(state.exposurePhase,['viewing','exposure'],'phase');
 if (state.exposurePhase === 'exposure' && state.viewMode !== 'cutaway') throw new RangeError('Exposure phase requires cutaway');
 oneOf(state.selectedPart,config.partIds,'part'); oneOf(state.challengeId,Object.keys(CHALLENGES),'challenge');
 if (!Array.isArray(state.completed) || new Set(state.completed).size !== state.completed.length) throw new TypeError('Invalid completions');
 for(const id of state.completed) oneOf(id,Object.keys(CHALLENGES),'completion');
 if (state.feedback !== null && (!state.feedback || typeof state.feedback !== 'object' || Array.isArray(state.feedback) || ['passed','techniqueMet','brightnessMet'].some(k=>typeof state.feedback[k] !== 'boolean') || !Number.isFinite(state.feedback.stops) || typeof state.feedback.message !== 'string')) throw new TypeError('Invalid feedback');
 return {...state,settings:{...state.settings},completed:[...state.completed],feedback:state.feedback===null?null:{...state.feedback}};
}
function snapshot(state, exposure) {
 const copy=copyState(state);
 const result=exposure ?? computeExposure(copy.settings);
 Object.freeze(copy.settings); Object.freeze(copy.completed);
 if (copy.feedback) Object.freeze(copy.feedback);
 return Object.freeze({state:Object.freeze(copy),exposure:Object.freeze(result),challenge:Object.freeze(evaluateChallenge(copy.challengeId,copy.settings,result))});
}
/** Create a detached committed snapshot; renderers consume its derived values. */
export function createSnapshot(state) { return snapshot(state); }
/** Validate and derive without mutating the current snapshot. */
export function transition(current, action) {
 if (!action || typeof action !== 'object' || Array.isArray(action)) throw new TypeError('Invalid action');
 let state=copyState(current.state), exposure=current.exposure;
 switch(action.type) {
  case 'set-settings':
   state.settings=updateSettings(state.settings,action.patch);
   if(action.selectControl !== undefined) {oneOf(action.selectControl,controls,'control'); state.activeControl=action.selectControl; state.selectedPart=controlParts[action.selectControl];}
   state.feedback=null; state.exposurePhase='viewing'; exposure=undefined; break;
  case 'set-type': {
   const config=getCameraConfig(action.cameraType); state.cameraType=action.cameraType;
   if(!config.partIds.includes(state.selectedPart)) state.selectedPart='sensor';
   state.exposurePhase='viewing'; break;
  }
  case 'set-view': oneOf(action.viewMode,views,'view mode'); state.viewMode=action.viewMode; state.exposurePhase='viewing'; break;
  case 'set-control': oneOf(action.control,controls,'control'); state.activeControl=action.control; break;
  case 'select-part': {
   const config=getCameraConfig(state.cameraType); oneOf(action.part,config.partIds,'part'); oneOf(action.source,['list','diagram'],'selection source');
   state.selectedPart=action.part;
   if(action.source==='list' && state.viewMode==='assembled' && config.parts[action.part].internal) state.viewMode='cutaway';
   break;
  }
  case 'reset-camera': state={...createInitialState(),challengeId:state.challengeId,completed:[...state.completed]}; exposure=undefined; break;
  default: throw new RangeError('Unknown action');
 }
 return snapshot(state,exposure);
}
