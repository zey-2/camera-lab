import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,computeExposure,evaluateChallenge,APERTURES,SHUTTERS,ISOS} from '../dist/model.mjs';
import {createSnapshot,transition} from '../dist/state.mjs';
import {getCameraConfig} from '../dist/camera-config.mjs';
const initial=()=>createSnapshot(createInitialState());
const solutions = {
  freeze: {aperture:4, shutter:500, iso:1600},
  isolate: {aperture:2.8, shutter:250, iso:400},
  depth: {aperture:8, shutter:30, iso:400}
};
function completeAll() {
  let current = initial();
  for (const [id, patch] of Object.entries(solutions)) {
    current = transition(current, {type:'choose-challenge', id});
    current = transition(current, {type:'set-settings', patch});
    current = transition(current, {type:'check-challenge'});
  }
  return current;
}

test('reset preserves chosen challenge and completions', () => {
  let completedDepth = completeAll();
  completedDepth = transition(completedDepth, {type:'set-type', cameraType:'dslr'});
  completedDepth = transition(completedDepth, {type:'select-part', part:'prism', source:'list'});
  completedDepth = transition(completedDepth, {type:'set-control', control:'iso'});
  completedDepth = transition(completedDepth, {type:'set-phase', phase:'exposure'});
  const reset = transition(completedDepth, {type:'reset-camera'});
  assert.equal(reset.state.challengeId, 'depth');
  assert.deepEqual(reset.state.completed, ['freeze','isolate','depth']);
  assert.deepEqual(reset.state.completed, completedDepth.state.completed);
  assert.deepEqual(reset.state.settings, {aperture:4, shutter:125, iso:400});
  assert.equal(reset.state.selectedPart, 'lens');
  assert.equal(reset.state.activeControl, 'aperture');
  assert.equal(reset.state.cameraType, 'mirrorless');
  assert.equal(reset.state.viewMode, 'assembled');
  assert.equal(reset.state.exposurePhase, 'viewing');
  assert.equal(reset.state.feedback, null);
  assert.deepEqual(reset.exposure, computeExposure(reset.state.settings));
  assert.notStrictEqual(reset.state.completed, completedDepth.state.completed);
  assert.equal(completedDepth.state.feedback.passed, true);
});

test('check is idempotent', () => {
  let current = initial();
  const earned = [];
  for (const [id, patch] of Object.entries(solutions)) {
    current = transition(current, {type:'choose-challenge', id});
    current = transition(current, {type:'set-settings', patch});
    const unchecked = current;
    earned.push(id);
    for (let count = 0; count < 2; count++) {
      current = transition(current, {type:'check-challenge'});
      assert.deepEqual(current.state.completed, earned);
      assert.deepEqual(current.state.feedback, {...unchecked.challenge, message:current.state.feedback.message});
      assert.equal(current.state.feedback.passed, true);
      assert.match(current.state.feedback.message, /Experiment complete.*Try another experiment/);
      assert.strictEqual(current.exposure, unchecked.exposure);
    }
    assert.deepEqual(unchecked.state.completed, earned.slice(0, -1));
  }
});

test('clear progress requires confirmation', () => {
  const earned = completeAll();
  const before = structuredClone(earned);
  const cancelled = transition(earned, {type:'clear-progress', confirmed:false});
  assert.deepEqual(cancelled, before);
  for (const confirmed of [undefined, null, 'true', 1, {}, []]) {
    assert.throws(() => transition(earned, {type:'clear-progress', confirmed}), /confirmation/);
  }
  const cleared = transition(earned, {type:'clear-progress', confirmed:true});
  assert.deepEqual(cleared.state, {...earned.state, completed:[], feedback:null});
  assert.strictEqual(cleared.exposure, earned.exposure);
  assert.deepEqual(earned, before);
});

test('confirmed clear preserves camera state including either static phase', () => {
  for (const cameraType of ['dslr','mirrorless']) for (const exposurePhase of ['viewing','exposure']) {
    let earned = completeAll();
    earned = transition(earned, {type:'set-type', cameraType});
    earned = transition(earned, {type:'set-view', viewMode:'cutaway'});
    earned = transition(earned, {type:'select-part', part:cameraType === 'dslr' ? 'prism' : 'evf', source:'list'});
    earned = transition(earned, {type:'set-control', control:'iso'});
    earned = transition(earned, {type:'set-phase', phase:exposurePhase});
    const cleared = transition(earned, {type:'clear-progress', confirmed:true});
    assert.deepEqual(cleared.state, {...earned.state, completed:[], feedback:null});
    assert.strictEqual(cleared.exposure, earned.exposure);
    assert.deepEqual(cleared.challenge, earned.challenge);
  }
});

test('challenge choice leaves settings unchanged', () => {
  let current = completeAll();
  current = transition(current, {type:'set-type', cameraType:'dslr'});
  current = transition(current, {type:'set-view', viewMode:'cutaway'});
  current = transition(current, {type:'set-phase', phase:'exposure'});
  for (const id of Object.keys(solutions)) {
    const chosen = transition(current, {type:'choose-challenge', id});
    assert.deepEqual(chosen.state, {...current.state, challengeId:id,
      selectedPart:id === 'freeze' ? 'shutter' : 'aperture',
      activeControl:id === 'freeze' ? 'shutter' : 'aperture', feedback:null});
    assert.strictEqual(chosen.exposure, current.exposure);
    assert.deepEqual(chosen.challenge, evaluateChallenge(id, current.state.settings, current.exposure));
  }
  assert.equal(current.state.feedback.passed, true);
});

test('each partial goal failure withholds new completion with actionable feedback', () => {
  const failures = {
    freeze: [{aperture:4, shutter:125, iso:400}, {aperture:4, shutter:500, iso:400}],
    isolate: [{aperture:4, shutter:125, iso:400}, {aperture:2.8, shutter:125, iso:400}],
    depth: [{aperture:4, shutter:125, iso:400}, {aperture:8, shutter:125, iso:400}]
  };
  for (const [id, settings] of Object.entries(failures)) for (const [index, patch] of settings.entries()) {
    let current = transition(initial(), {type:'choose-challenge', id});
    current = transition(current, {type:'set-settings', patch});
    const failed = transition(current, {type:'check-challenge'});
    assert.equal(failed.state.feedback.passed, false);
    assert.equal(failed.state.feedback.techniqueMet, index === 1);
    assert.equal(failed.state.feedback.brightnessMet, index === 0);
    assert.deepEqual(failed.state.completed, []);
    assert.match(failed.state.feedback.message, index === 0 ? /Next, aim for/ : /within \u00b10\.5 stops using the other settings/);
  }
});

test('failed checks and setting edits retain every previously earned completion', () => {
  const earned = completeAll();
  for (const id of Object.keys(solutions)) {
    let changed = transition(earned, {type:'choose-challenge', id});
    changed = transition(changed, {type:'set-settings', patch:{aperture:4, shutter:125, iso:400}});
    assert.equal(changed.state.feedback, null);
    assert.deepEqual(changed.state.completed, earned.state.completed);
    const failed = transition(changed, {type:'check-challenge'});
    assert.equal(failed.state.feedback.passed, false);
    assert.deepEqual(failed.state.completed, earned.state.completed);
    assert.equal(transition(failed, {type:'set-settings', patch:{iso:800}}).state.feedback, null);
  }
});

test('a fresh session starts without achievements or feedback', () => {
  const earned = completeAll();
  assert.equal(earned.state.completed.length, 3);
  const fresh = initial();
  assert.deepEqual(fresh.state.completed, []);
  assert.equal(fresh.state.feedback, null);
  assert.equal(fresh.state.challengeId, 'freeze');
});

test('public phase action permits exposure only in cutaway', () => {
  const cutaway = transition(initial(), {type:'set-view', viewMode:'cutaway'});
  const exposure = transition(cutaway, {type:'set-phase', phase:'exposure'});
  assert.equal(exposure.state.exposurePhase, 'exposure');
  assert.strictEqual(exposure.exposure, cutaway.exposure);
  assert.equal(transition(exposure, {type:'set-phase', phase:'viewing'}).state.exposurePhase, 'viewing');
  assert.equal(transition(initial(), {type:'set-phase', phase:'viewing'}).state.exposurePhase, 'viewing');
  for (const viewMode of ['assembled','exploded']) {
    const viewed = transition(initial(), {type:'set-view', viewMode});
    assert.throws(() => transition(viewed, {type:'set-phase', phase:'exposure'}), /cutaway/);
  }
  assert.throws(() => transition(cutaway, {type:'set-phase', phase:'invalid'}), /phase/);
});

test('settings type view and reset changes leave exposure in viewing', () => {
  const exposure = transition(transition(initial(), {type:'set-view',viewMode:'cutaway'}), {type:'set-phase',phase:'exposure'});
  for (const action of [
    {type:'set-settings',patch:{iso:800}},
    {type:'set-type',cameraType:'dslr'},
    {type:'set-view',viewMode:'exploded'},
    {type:'reset-camera'}
  ]) assert.equal(transition(exposure, action).state.exposurePhase, 'viewing');
  assert.equal(exposure.state.exposurePhase, 'exposure');
});

test('invalid settings preserve the original exposure snapshot', () => {
  const exposure = transition(transition(initial(), {type:'set-view',viewMode:'cutaway'}), {type:'set-phase',phase:'exposure'});
  const before = structuredClone(exposure);
  assert.throws(() => transition(exposure, {type:'set-settings',patch:{iso:800,shutter:0}}));
  assert.deepEqual(exposure, before);
  assert.equal(exposure.state.exposurePhase, 'exposure');
});
test('initial defaults are assembled mirrorless and fresh',()=>{
 const s=initial(); assert.deepEqual(s.state,{settings:{aperture:4,shutter:125,iso:400},selectedPart:'lens',cameraType:'mirrorless',viewMode:'assembled',activeControl:'aperture',exposurePhase:'viewing',challengeId:'freeze',feedback:null,completed:[]}); assert.equal(s.exposure.brightnessRatio,1);
 assert.notStrictEqual(s.state.settings,initial().state.settings); assert.notStrictEqual(s.state.completed,initial().state.completed);
});
test('type changes preserve exposure and shared selection',()=>{const s=initial(); const n=transition(s,{type:'set-type',cameraType:'dslr'}); assert.strictEqual(n.exposure,s.exposure); assert.deepEqual(n.state.settings,s.state.settings); assert.equal(n.state.selectedPart,'lens');});
test('unavailable part falls back to sensor',()=>{let s=transition(initial(),{type:'set-type',cameraType:'dslr'}); s=transition(s,{type:'select-part',part:'prism',source:'list'}); assert.equal(transition(s,{type:'set-type',cameraType:'mirrorless'}).state.selectedPart,'sensor');});
test('list and slider selection differ',()=>{const s=initial(); const n=transition(s,{type:'set-settings',patch:{iso:800},selectControl:'iso'}); assert.equal(n.state.selectedPart,'sensor'); assert.equal(n.state.viewMode,'assembled'); assert.equal(n.state.activeControl,'iso'); assert.equal(transition(s,{type:'select-part',part:'sensor',source:'list'}).state.viewMode,'cutaway');});
test('all 294 combinations preserve model across types and challenges',()=>{let count=0; for(const aperture of APERTURES) for(const shutter of SHUTTERS) for(const iso of ISOS){const settings={aperture,shutter,iso}; count++; for(const cameraType of ['dslr','mirrorless']) for(const challengeId of ['freeze','isolate','depth']){const s=createSnapshot({...createInitialState(),settings,cameraType,challengeId}); assert.deepEqual(s.exposure,computeExposure(settings)); assert.deepEqual(s.challenge,evaluateChallenge(challengeId,settings)); assert.deepEqual(s.challenge,evaluateChallenge(challengeId,settings,s.exposure));}} assert.equal(count,294);});
test('invalid actions leave entire snapshot unchanged',()=>{const s=initial(),before=structuredClone(s); for(const patch of [null,undefined,[],{},{aperture:0},{aperture:2},{aperture:NaN},{shutter:Infinity},{shutter:0},{iso:'400'},{iso:-1},{iso:null},{extraneous:1},{iso:800,shutter:0}]) assert.throws(()=>transition(s,{type:'set-settings',patch})); for(const action of [null,{}, {type:'other'},{type:'set-type',cameraType:'other'},{type:'set-view',viewMode:'other'},{type:'set-control',control:'other'},{type:'select-part',part:'prism',source:'list'},{type:'select-part',part:'lens',source:'other'},{type:'set-settings',patch:{iso:800},selectControl:'other'}]) assert.throws(()=>transition(s,action)); assert.deepEqual(s,before);});
test('non-settings transitions reuse exposure and copy mutable state',()=>{const s=initial(), n=transition(s,{type:'set-control',control:'iso'}); assert.strictEqual(n.exposure,s.exposure); assert.notStrictEqual(n.state.settings,s.state.settings); assert.notStrictEqual(n.state.completed,s.state.completed); assert.notStrictEqual(transition(s,{type:'set-settings',patch:{iso:800}}).exposure,s.exposure);});
test('reset preserves challenge and earned progress',()=>{const s=createSnapshot({...createInitialState(),cameraType:'dslr',viewMode:'exploded',challengeId:'depth',completed:['freeze'],settings:{aperture:8,shutter:30,iso:400}}); const n=transition(s,{type:'reset-camera'}); assert.deepEqual(n.state,{...createInitialState(),challengeId:'depth',completed:['freeze']}); assert.notStrictEqual(n.state.completed,s.state.completed);});
test('configuration metadata is immutable and complete',()=>{for(const type of ['dslr','mirrorless']){const c=getCameraConfig(type); assert.ok(Object.isFrozen(c)); assert.ok(Object.isFrozen(c.partIds)); for(const id of c.partIds){const p=c.parts[id]; assert.ok(p.name&&p.description&&p.connection); assert.equal(p.internal,!['lens','body'].includes(id)); assert.ok(Object.isFrozen(p));}} assert.throws(()=>getCameraConfig('other'));});
test('snapshot validates state and detaches input',()=>{for(const patch of [{cameraType:'other'},{viewMode:'other'},{activeControl:'other'},{exposurePhase:'other'},{selectedPart:'prism'},{challengeId:'other'},{completed:['other']}]) assert.throws(()=>createSnapshot({...createInitialState(),...patch})); const state=createInitialState(),s=createSnapshot(state); state.settings.iso=800; state.completed.push('freeze'); assert.equal(s.state.settings.iso,400); assert.deepEqual(s.state.completed,[]);});
test('committed snapshots cannot be mutated through read references',()=>{
 const s=initial(); assert.throws(()=>{s.state.settings.iso=800;},TypeError); assert.throws(()=>s.state.completed.push('freeze'),TypeError); assert.throws(()=>{s.exposure.stops=99;},TypeError); assert.throws(()=>{s.challenge.passed=true;},TypeError); assert.throws(()=>{s.state.viewMode='exploded';},TypeError);
});

test('challenge choice and checks preserve immutable earned progress', () => {
  const current = initial();
  const chosen = transition(current, {type:'choose-challenge', id:'isolate'});
  assert.equal(chosen.state.challengeId, 'isolate');
  assert.equal(chosen.state.selectedPart, 'aperture');
  assert.strictEqual(chosen.exposure, current.exposure);
  const solution = transition(current, {type:'set-settings', patch:{shutter:500,iso:1600}});
  const checked = transition(solution, {type:'check-challenge'});
  assert.equal(checked.state.feedback.passed, true);
  assert.deepEqual(checked.state.completed, ['freeze']);
  assert.deepEqual(transition(checked, {type:'check-challenge'}).state.completed, ['freeze']);
  assert.deepEqual(solution.state.completed, []);
  assert.equal(transition(checked, {type:'choose-challenge',id:'depth'}).state.feedback, null);
  assert.throws(() => transition(checked, {type:'choose-challenge',id:'invalid'}));
});

test('choosing a challenge selects its linked control while preserving view', () => {
  const current = transition(initial(), {type:'set-control',control:'iso'});
  for (const id of ['freeze','isolate','depth']) {
    const chosen = transition(current, {type:'choose-challenge',id});
    assert.equal(chosen.state.activeControl, id === 'freeze' ? 'shutter' : 'aperture');
    assert.equal(chosen.state.viewMode, current.state.viewMode);
  }
});

test('part selection survives views and unavailable EVF falls back on type change', () => {
 const selected=transition(initial(),{type:'select-part',part:'evf',source:'list'});
 for(const viewMode of ['assembled','cutaway','exploded']) {
  const viewed=transition(selected,{type:'set-view',viewMode});
  assert.equal(viewed.state.selectedPart,'evf'); assert.deepEqual(viewed.state.settings,selected.state.settings);
  const dslr=transition(viewed,{type:'set-type',cameraType:'dslr'});
  assert.equal(dslr.state.selectedPart,'sensor'); assert.equal(dslr.state.viewMode,viewMode);
 }
});
