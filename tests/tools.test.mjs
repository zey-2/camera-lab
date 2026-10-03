import test from 'node:test';
import assert from 'node:assert/strict';
import {APERTURES, SHUTTERS, ISOS, createInitialState} from '../dist/model.mjs';
import {createSnapshot, transition} from '../dist/state.mjs';
import {serializeCameraState, createToolDefinitions, registerCameraTools} from '../dist/tools.mjs';

const initial = () => createSnapshot(createInitialState());
function instrument(snapshot = initial()) {
  let committed = snapshot;
  let renders = 0, cancellations = 0, commits = 0, reads = 0;
  const api = {
    read() { reads++; return serializeCameraState(committed); },
    set(patch) {
      const candidate = transition(committed, {type:'set-settings', patch});
      cancellations++;
      committed = candidate;
      commits++;
      renders++;
      return serializeCameraState(committed);
    }
  };
  return {api, definitions:createToolDefinitions(api),
    snapshot:() => committed, counts:() => ({renders, cancellations, commits, reads})};
}

test('legacy keys survive additive read fields', () => {
  const snapshot = initial();
  const read = serializeCameraState(snapshot);
  assert.deepEqual(read, {
    settings:{...snapshot.state.settings}, exposure:{...snapshot.exposure},
    selectedPart:'lens', exploded:false, challenge:{id:'freeze', ...snapshot.challenge},
    completedChallenges:[],
    simulation:'Illustrative, fixed scene and focus; not a calibrated camera prediction.',
    cameraType:'mirrorless', viewMode:'assembled', exposurePhase:'viewing'
  });
  const exploded = serializeCameraState(transition(snapshot, {type:'set-view', viewMode:'exploded'}));
  assert.equal(exploded.exploded, true);
  assert.equal(exploded.viewMode, 'exploded');
  const exposure = transition(transition(snapshot, {type:'set-view', viewMode:'cutaway'}), {type:'set-phase', phase:'exposure'});
  const dslr = serializeCameraState(transition(exposure, {type:'set-type', cameraType:'dslr'}));
  assert.equal(serializeCameraState(exposure).exposurePhase, 'exposure');
  assert.equal(dslr.cameraType, 'dslr');
  assert.equal(dslr.exploded, false);
});

test('read returns detached values', async () => {
  let snapshot = transition(initial(), {type:'set-settings', patch:{shutter:500, iso:1600}});
  snapshot = transition(snapshot, {type:'check-challenge'});
  const before = structuredClone(snapshot);
  const lab = instrument(snapshot);
  const read = await lab.definitions[0].execute({});
  const expected = structuredClone(read);
  read.settings.iso = 100;
  read.exposure.stops = 99;
  read.challenge.passed = false;
  read.challenge.id = 'depth';
  read.completedChallenges.push('depth');
  read.viewMode = 'exploded';
  assert.deepEqual(lab.snapshot(), before);
  assert.deepEqual(await lab.definitions[0].execute({}), expected);
  assert.notStrictEqual(read.settings, snapshot.state.settings);
  assert.notStrictEqual(read.exposure, snapshot.exposure);
  assert.notStrictEqual(read.challenge, snapshot.challenge);
  assert.notStrictEqual(read.completedChallenges, snapshot.state.completed);
});

test('definitions preserve exact legacy schemas and annotations', () => {
  const [read, set] = instrument().definitions;
  assert.deepEqual([read.name, set.name], ['read_camera_state', 'set_camera_settings']);
  assert.equal(read.title, 'Read camera state');
  assert.equal(set.title, 'Set camera settings');
  assert.equal(read.description, 'Read the Camera Lab settings, illustrative light and brightness model, component selection, and challenge evaluation.');
  assert.equal(set.description, 'Set one or more Camera Lab controls to supported numeric values. Shutter is the denominator: 500 means 1/500 second. Updates the same visible state as the sliders.');
  assert.deepEqual(read.inputSchema, {type:'object', properties:{}, additionalProperties:false});
  assert.deepEqual(set.inputSchema, {type:'object', minProperties:1, properties:{
    aperture:{type:'number', enum:[...APERTURES]}, shutter:{type:'number', enum:[...SHUTTERS]}, iso:{type:'number', enum:[...ISOS]}
  }, additionalProperties:false});
  assert.deepEqual(read.annotations, {readOnlyHint:true, untrustedContentHint:false});
  assert.deepEqual(set.annotations, {readOnlyHint:false, untrustedContentHint:false});
});

test('invalid tool input never invokes commit', async () => {
  const exposure = transition(transition(initial(), {type:'set-view', viewMode:'cutaway'}), {type:'set-phase', phase:'exposure'});
  const lab = instrument(exposure), before = structuredClone(lab.snapshot());
  for (const input of [undefined, null, [], {iso:400}, '']) {
    await assert.rejects(lab.definitions[0].execute(input), /Invalid read input/);
    assert.deepEqual(lab.snapshot(), before);
    assert.deepEqual(lab.counts(), {reads:0, commits:0, renders:0, cancellations:0});
  }
  for (const patch of [undefined, null, [], {}, {extra:1}, {cameraType:'dslr'}, {viewMode:'exploded'},
    {iso:'800'}, {aperture:2}, {aperture:0}, {iso:6400}, {shutter:-1}, {shutter:0},
    {iso:NaN}, {shutter:Infinity}, {aperture:-Infinity}, {iso:null}, {iso:true}, {iso:800, shutter:0}]) {
    await assert.rejects(lab.definitions[1].execute(patch));
    assert.deepEqual(lab.snapshot(), before);
    assert.deepEqual(lab.counts(), {reads:0, commits:0, renders:0, cancellations:0});
  }
});

test('valid setter returns committed state without selecting a part', async () => {
  const selected = transition(initial(), {type:'select-part', part:'evf', source:'list'});
  const lab = instrument(selected);
  const result = await lab.definitions[1].execute({iso:800, shutter:250});
  assert.deepEqual(result.settings, {aperture:4, shutter:250, iso:800});
  assert.equal(result.selectedPart, 'evf');
  assert.equal(result.viewMode, 'cutaway');
  assert.deepEqual(result, serializeCameraState(lab.snapshot()));
  assert.deepEqual(lab.counts(), {reads:0, commits:1, renders:1, cancellations:1});
});

test('every supported numeric setting passes through the setter', async () => {
  const lab = instrument();
  for (const [key, values] of Object.entries({aperture:APERTURES, shutter:SHUTTERS, iso:ISOS})) {
    for (const value of values) assert.equal((await lab.definitions[1].execute({[key]:value})).settings[key], value);
  }
});

test('registration is optional for absent context or missing register function', () => {
  for (const context of [undefined, null, {}, {registerTool:true}]) {
    const lifecycle = registerCameraTools(context, instrument().api);
    assert.equal(typeof lifecycle.dispose, 'function');
    assert.doesNotThrow(() => lifecycle.dispose());
    assert.doesNotThrow(() => lifecycle.dispose());
  }
});

test('each live registration generation registers two names and disposal aborts its signal', async () => {
  const registrations = [], lab = instrument();
  const context = {registerTool(definition, options) {
    assert.strictEqual(this, context);
    registrations.push({definition, signal:options.signal});
  }};
  const first = registerCameraTools(context, lab.api);
  assert.deepEqual(registrations.map(item => item.definition.name), ['read_camera_state', 'set_camera_settings']);
  assert.strictEqual(registrations[0].signal, registrations[1].signal);
  assert.equal(registrations[0].signal.aborted, false);
  assert.deepEqual(await registrations[0].definition.execute({}), serializeCameraState(lab.snapshot()));
  first.dispose();
  first.dispose();
  assert.equal(registrations[0].signal.aborted, true);
  const second = registerCameraTools(context, lab.api);
  assert.equal(registrations.length, 4);
  assert.deepEqual(registrations.slice(2).map(item => item.definition.name), ['read_camera_state', 'set_camera_settings']);
  assert.strictEqual(registrations[2].signal, registrations[3].signal);
  assert.notStrictEqual(registrations[0].signal, registrations[2].signal);
  assert.equal(registrations[2].signal.aborted, false);
  second.dispose();
  assert.equal(registrations[2].signal.aborted, true);
});

test('synchronous registration failures do not escape and abort the lifecycle', () => {
  for (const failAt of [1, 2]) {
    const signals = [];
    const context = {registerTool(definition, {signal}) {
      signals.push(signal);
      if (signals.length === failAt) throw new Error('registration unavailable');
    }};
    let lifecycle;
    assert.doesNotThrow(() => { lifecycle = registerCameraTools(context, instrument().api); });
    assert.equal(signals.length, failAt);
    assert.ok(signals.every(signal => signal.aborted));
    assert.doesNotThrow(() => lifecycle.dispose());
  }
});

test('asynchronous registration failures do not escape or leave an unhandled rejection', async () => {
  for (const failAt of [1, 2]) {
    const signals = [];
    const context = {registerTool(definition, {signal}) {
      signals.push(signal);
      return signals.length === failAt ? Promise.reject(new Error('registration unavailable')) : Promise.resolve();
    }};
    const lifecycle = registerCameraTools(context, instrument().api);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(signals.length, 2);
    assert.ok(signals.every(signal => signal.aborted));
    assert.doesNotThrow(() => lifecycle.dispose());
  }
});

test('late rejection from a disposed generation does not abort its replacement', async () => {
  let rejectOld;
  const registrations = [];
  const context = {registerTool(definition, {signal}) {
    registrations.push(signal);
    if (registrations.length === 1) return new Promise((resolve, reject) => { rejectOld = reject; });
  }};
  const first = registerCameraTools(context, instrument().api);
  first.dispose();
  const second = registerCameraTools(context, instrument().api);
  rejectOld(new Error('late failure'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(registrations[0].aborted, true);
  assert.equal(registrations[2].aborted, false);
  second.dispose();
});
