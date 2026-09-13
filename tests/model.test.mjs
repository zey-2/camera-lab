import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, APERTURES, SHUTTERS, ISOS, computeExposure, evaluateChallenge, createInitialState, updateSettings } from '../dist/model.mjs';

const settings = (patch = {}) => ({ ...DEFAULT_SETTINGS, ...patch });

test('reference settings produce unit captured light and brightness', () => {
  const result = computeExposure(settings());
  assert.equal(result.lightRatio, 1);
  assert.equal(result.brightnessRatio, 1);
  assert.equal(result.stops, 0);
});

test('doubling ISO doubles brightness without changing captured light', () => {
  const result = computeExposure(settings({ iso: 800 }));
  assert.equal(result.brightnessRatio, 2);
  assert.equal(result.lightRatio, 1);
  assert.equal(result.stops, 1);
});

test('doubling f-number quarters captured light', () => {
  const result = computeExposure(settings({ aperture: 8 }));
  assert.equal(result.brightnessRatio, 0.25);
  assert.equal(result.lightRatio, 0.25);
  assert.equal(result.stops, -2);
});

test('halving exposure time halves captured light', () => {
  assert.equal(computeExposure(settings({ shutter: 250 })).lightRatio, 0.5);
  assert.equal(computeExposure(settings({ shutter: 250 })).stops, -1);
});

test('compensating ISO preserves brightness while photons fall', () => {
  const result = computeExposure(settings({ shutter: 500, iso: 1600 }));
  assert.equal(result.brightnessRatio, 1);
  assert.equal(result.lightRatio, 0.25);
});

test('all supported setting combinations give finite graphics values', () => {
  for (const aperture of APERTURES) for (const shutter of SHUTTERS) for (const iso of ISOS) {
    const result = computeExposure({ aperture, shutter, iso });
    for (const value of Object.values(result)) assert.equal(Number.isFinite(value), true);
    assert.ok(result.brightnessRatio > 0);
    assert.ok(result.noiseOpacity >= 0 && result.noiseOpacity <= 0.65);
  }
});

test('invalid, missing, coerced, and nonfinite settings reject without mutation', () => {
  const original = settings();
  for (const patch of [{}, { aperture: 0 }, { aperture: 2 }, { aperture: NaN }, { shutter: Infinity }, { shutter: 0 }, { iso: '400' }, { iso: -1 }, { iso: null }, { extraneous: 1 }]) {
    assert.throws(() => updateSettings(original, patch), /Invalid/);
    assert.deepEqual(original, DEFAULT_SETTINGS);
  }
  for (const input of [null, undefined, [], {}, { aperture: 4, shutter: 125 }]) assert.throws(() => computeExposure(input), /Invalid/);
});

test('freeze challenge requires fast shutter and balanced brightness', () => {
  assert.equal(evaluateChallenge('freeze', settings({ shutter: 500, iso: 1600 })).passed, true);
  assert.equal(evaluateChallenge('freeze', settings()).techniqueMet, false);
  assert.equal(evaluateChallenge('freeze', settings({ shutter: 1000, iso: 100 })).brightnessMet, false);
  assert.equal(evaluateChallenge('freeze', settings({ shutter: 1000, iso: 100 })).passed, false);
});

test('isolation challenge requires wide aperture and balanced brightness', () => {
  assert.equal(evaluateChallenge('isolate', settings({ aperture: 2.8, shutter: 250 })).passed, true);
  assert.equal(evaluateChallenge('isolate', settings()).techniqueMet, false);
  assert.equal(evaluateChallenge('isolate', settings({ aperture: 1.8, shutter: 15, iso: 3200 })).passed, false);
});

test('depth challenge requires narrow aperture and balanced brightness', () => {
  assert.equal(evaluateChallenge('depth', settings({ aperture: 8, shutter: 30, iso: 400 })).passed, true);
  assert.equal(evaluateChallenge('depth', settings()).techniqueMet, false);
  assert.equal(evaluateChallenge('depth', settings({ aperture: 16, shutter: 1000, iso: 100 })).passed, false);
});

test('brightness accepts reference, rejects one stop above it, and invalid challenge rejects', () => {
  const result = evaluateChallenge('freeze', settings({ shutter: 500, iso: 1600 }));
  assert.equal(result.brightnessMet, true);
  assert.equal(evaluateChallenge('freeze', settings({ shutter: 500, iso: 3200 })).brightnessMet, false);
  assert.throws(() => evaluateChallenge('other', settings()), /Unknown challenge/);
});

test('reset state is fresh and restores every setting and interaction', () => {
  const modified = createInitialState();
  modified.settings.iso = 3200;
  modified.selectedPart = 'sensor';
  modified.exploded = false;
  modified.challengeId = 'depth';
  modified.feedback = { passed: true };
  modified.completed.push('freeze');
  const reset = createInitialState();
  assert.deepEqual(reset.settings, { aperture: 4, shutter: 125, iso: 400 });
  assert.equal(reset.selectedPart, 'lens');
  assert.equal(reset.exploded, true);
  assert.equal(reset.challengeId, 'freeze');
  assert.equal(reset.feedback, null);
  assert.deepEqual(reset.completed, []);
});
