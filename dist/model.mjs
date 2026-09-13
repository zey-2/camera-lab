export const APERTURES = Object.freeze([1.8, 2.8, 4, 5.6, 8, 11, 16]);
// Shutter values are denominators in 1/value seconds.
export const SHUTTERS = Object.freeze([15, 30, 60, 125, 250, 500, 1000]);
export const ISOS = Object.freeze([100, 200, 400, 800, 1600, 3200]);
export const DEFAULT_SETTINGS = Object.freeze({ aperture: 4, shutter: 125, iso: 400 });
export const CHALLENGES = Object.freeze({
  freeze: Object.freeze({ title: 'Freeze the motion', label: 'Freeze motion', description: 'The amber target is moving. Find a shutter time that holds its edge, then recover a balanced image.', goal: 'Shutter 1/500 s or faster', hint: 'A shorter exposure catches less movement and less light. Open the aperture or raise ISO to recover brightness.', part: 'shutter' }),
  isolate: Object.freeze({ title: 'Isolate the subject', label: 'Isolate a subject', description: 'Keep attention on the amber target. Soften the distant target while keeping image brightness balanced.', goal: 'Aperture f/2.8 or wider', hint: 'A lower f-number opens the aperture and softens the background. Use a faster shutter or lower ISO to balance brightness.', part: 'aperture' }),
  depth: Object.freeze({ title: 'Bring depth into focus', label: 'Keep depth sharp', description: 'Let the distant target share the detail. Increase depth of field and compensate for the smaller opening.', goal: 'Aperture f/8 or narrower', hint: 'A higher f-number increases depth of field in this scene. A slower shutter or higher ISO can recover brightness.', part: 'aperture' })
});

const allowed = { aperture: APERTURES, shutter: SHUTTERS, iso: ISOS };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function validateSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new TypeError('Invalid camera settings');
  if (Object.keys(settings).length !== 3 || Object.keys(settings).some(key => !Object.hasOwn(allowed, key))) throw new TypeError('Invalid camera settings keys');
  for (const [key, values] of Object.entries(allowed)) {
    if (typeof settings[key] !== 'number' || !Number.isFinite(settings[key]) || !values.includes(settings[key])) throw new RangeError(`Invalid ${key} setting`);
  }
  return settings;
}

export function updateSettings(current, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).length === 0 || Object.keys(patch).some(key => !Object.hasOwn(allowed, key))) throw new TypeError('Invalid settings update');
  validateSettings(current);
  return { ...validateSettings({ ...current, ...patch }) };
}

export function computeExposure(settings) {
  validateSettings(settings);
  const { aperture, shutter, iso } = settings;
  const lightRatio = (125 / shutter) * (4 / aperture) ** 2;
  const brightnessRatio = lightRatio * (iso / 400);
  return {
    lightRatio,
    brightnessRatio,
    stops: Math.log2(brightnessRatio),
    // The following are bounded visual teaching proxies, not optical predictions.
    displayGain: clamp(brightnessRatio ** 0.48, 0.035, 7),
    backgroundBlur: clamp((8 / aperture - 1) * 1.65, 0, 6),
    motionTrail: clamp(4200 / shutter - 4.2, 0, 105),
    noiseOpacity: clamp(0.012 + Math.max(0, Math.log2(iso / 100)) * 0.025 + Math.max(0, -Math.log2(lightRatio)) * 0.045, 0.012, 0.65),
    apertureOpening: clamp(88 / aperture, 5.5, 49)
  };
}

export function evaluateChallenge(id, settings) {
  if (!Object.hasOwn(CHALLENGES, id)) throw new RangeError('Unknown challenge');
  const { stops } = computeExposure(settings);
  const techniqueMet = id === 'freeze' ? settings.shutter >= 500 : id === 'isolate' ? settings.aperture <= 2.8 : settings.aperture >= 8;
  const brightnessMet = Math.abs(stops) <= 0.5 + Number.EPSILON;
  return { passed: techniqueMet && brightnessMet, techniqueMet, brightnessMet, stops };
}

export function createInitialState() {
  return { settings: { ...DEFAULT_SETTINGS }, selectedPart: 'lens', exploded: true, challengeId: 'freeze', feedback: null, completed: [] };
}
