import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,computeExposure,evaluateChallenge,APERTURES,SHUTTERS,ISOS} from '../dist/model.mjs';
import {createSnapshot,transition} from '../dist/state.mjs';
import {getCameraConfig} from '../dist/camera-config.mjs';
const initial=()=>createSnapshot(createInitialState());
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
