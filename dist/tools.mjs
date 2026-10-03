import {APERTURES, SHUTTERS, ISOS, DEFAULT_SETTINGS, updateSettings} from './model.mjs';

/** @typedef {{settings:import('./state.mjs').Settings, exposure:import('./state.mjs').Exposure, selectedPart:import('./state.mjs').PartId, exploded:boolean, challenge:{id:import('./state.mjs').ChallengeId}&import('./state.mjs').Evaluation, completedChallenges:import('./state.mjs').ChallengeId[], simulation:string, cameraType:import('./state.mjs').CameraType, viewMode:import('./state.mjs').ViewMode, exposurePhase:import('./state.mjs').Phase}} CameraStateRead */
/** @typedef {{read:()=>CameraStateRead, set:(patch:Partial<import('./state.mjs').Settings>)=>CameraStateRead}} CameraToolApi */
/** @typedef {{name:string, title:string, description:string, inputSchema:object, annotations:{readOnlyHint:boolean, untrustedContentHint:boolean}, execute:(input:unknown)=>Promise<CameraStateRead>}} ToolDefinition */

/** Return detached values while preserving the legacy tool result.
 * @param {import('./state.mjs').Snapshot} snapshot
 * @returns {CameraStateRead}
 */
export function serializeCameraState({state, exposure, challenge}) {
  return {
    settings:{...state.settings}, exposure:{...exposure}, selectedPart:state.selectedPart,
    exploded:state.viewMode === 'exploded', challenge:{id:state.challengeId, ...challenge},
    completedChallenges:[...state.completed],
    simulation:'Illustrative, fixed scene and focus; not a calibrated camera prediction.',
    cameraType:state.cameraType, viewMode:state.viewMode, exposurePhase:state.exposurePhase
  };
}

/** Validate the entire input before handing control to the app's commit path.
 * @param {CameraToolApi} api
 * @returns {ToolDefinition[]}
 */
export function createToolDefinitions({read, set}) {
  return [
    {
      name: 'read_camera_state',
      title: 'Read camera state',
      description: 'Read the Camera Lab settings, illustrative light and brightness model, component selection, and challenge evaluation.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: async input => {
        if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 0) throw new TypeError('Invalid read input: expected an empty object');
        return read();
      }
    },
    {
      name: 'set_camera_settings',
      title: 'Set camera settings',
      description: 'Set one or more Camera Lab controls to supported numeric values. Shutter is the denominator: 500 means 1/500 second. Updates the same visible state as the sliders.',
      inputSchema: { type: 'object', minProperties: 1, properties: { aperture: { type: 'number', enum: [...APERTURES] }, shutter: { type: 'number', enum: [...SHUTTERS] }, iso: { type: 'number', enum: [...ISOS] } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async input => {
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Invalid settings update');
        const patch = {...input};
        updateSettings(DEFAULT_SETTINGS, patch);
        return set(patch);
      }
    }
  ];
}

/** Register one optional generation. Disposal or either failure aborts both tools.
 * @param {{registerTool?:Function}|null|undefined} context
 * @param {CameraToolApi} api
 * @returns {{dispose:()=>void}}
 */
export function registerCameraTools(context, api) {
  const lifecycle = new AbortController();
  const registration = {dispose:() => lifecycle.abort()};
  if (!context || typeof context.registerTool !== 'function') return registration;
  for (const definition of createToolDefinitions(api)) {
    try {
      void Promise.resolve(context.registerTool(definition, {signal:lifecycle.signal})).catch(() => lifecycle.abort());
    } catch { lifecycle.abort(); }
    if (lifecycle.signal.aborted) break;
  }
  return registration;
}
