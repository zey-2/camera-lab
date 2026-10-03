import test from 'node:test';
import assert from 'node:assert/strict';
import {getCameraConfig} from '../dist/camera-config.mjs';
import {createInitialState} from '../dist/model.mjs';
import {createSnapshot} from '../dist/state.mjs';

const snapshot = (cameraType, viewMode, selectedPart='lens') => createSnapshot({...createInitialState(), cameraType, viewMode, selectedPart});
const camera = await import('../dist/camera.mjs').catch(() => ({}));

test('every supported part has one anchor and offset', () => {
  for (const type of ['mirrorless','dslr']) {
    const config = getCameraConfig(type);
    assert.ok(config.geometry, 'missing shared geometry');
    assert.deepEqual(Object.keys(config.geometry).sort(), [...config.partIds].sort());
    for (const {anchor, explodedOffset, bounds} of Object.values(config.geometry)) {
      assert.equal(anchor.length,2); assert.equal(explodedOffset.length,2); assert.equal(bounds.length,4);
      assert.ok([...anchor,...explodedOffset,...bounds].every(Number.isFinite));
    }
  }
});
test('assembled and cutaway share anchors', () => {
  assert.equal(typeof camera.describeCamera,'function');
  for (const type of ['mirrorless','dslr']) {
    const assembled=camera.describeCamera(snapshot(type,'assembled'));
    const cutaway=camera.describeCamera(snapshot(type,'cutaway'));
    assert.deepEqual(assembled.parts.map(p=>p.transform),cutaway.parts.map(p=>p.transform));
    assert.deepEqual(assembled.parts.filter(p=>p.visible).map(p=>p.id).sort(),['body','lens']);
    assert.ok(cutaway.parts.every(p=>p.visible));
    assert.deepEqual(assembled.paths,[]);
  }
});

const phaseCamera = (cameraType, exposurePhase='viewing', patch={}) => camera.describeCamera(createSnapshot({...createInitialState(),cameraType,viewMode:'cutaway',exposurePhase,...patch}));
test('DSLR viewing uses finder not sensor', () => {
  const d=phaseCamera('dslr');
  assert.equal(d.mirror,'down'); assert.equal(d.finder,'optical'); assert.equal(d.sensorReceivingLight,false);
  assert.equal(d.shutterOpen,false);
  assert.equal(d.paths.length,1); assert.equal(d.paths[0].kind,'light');
  const points=d.paths[0].points;
  assert.deepEqual(points.at(-1),getCameraConfig('dslr').geometry['optical-finder'].anchor);
  // Incoming ray y=195 intersects the reflective stroke from (372,237) to (428,176).
  const hit=points.find(([x,y])=>x>360&&x<435&&y===195);
  assert.ok(hit); assert.ok(Math.abs(hit[0]-(372+(195-237)*(428-372)/(176-237)))<0.001);
  assert.ok(points.some(([x,y])=>x>=362&&x<=446&&y===134),'crosses focusing screen');
  assert.match(d.explanation,/focusing screen.*prism.*optical finder/i);
});
test('DSLR exposure lifts mirror and blacks finder', () => {
  const d=phaseCamera('dslr','exposure');
  assert.equal(d.mirror,'up'); assert.equal(d.finder,'dark'); assert.equal(d.sensorReceivingLight,true);
  assert.equal(d.shutterOpen,true);
  assert.deepEqual(d.paths[0].points.at(-1),getCameraConfig('dslr').geometry.sensor.anchor);
  assert.ok(d.paths[0].points.every(([,y])=>y===195));
  assert.match(d.explanation,/finder.*dark/i);
});
test('mirrorless omits mirror and prism and distinguishes electronic signal', () => {
  for(const phase of ['viewing','exposure']) {
    const d=phaseCamera('mirrorless',phase);
    assert.equal(d.mirror,'absent'); assert.equal(d.finder,'electronic'); assert.equal(d.sensorReceivingLight,true);
    assert.ok(!d.parts.some(p=>['mirror','prism'].includes(p.id)));
    assert.deepEqual(d.paths.map(p=>p.kind),['light','signal']);
    assert.deepEqual(d.paths[0].points.at(-1),getCameraConfig('mirrorless').geometry.sensor.anchor);
    assert.ok(d.paths[1].points.at(-1)[0]>=420 && d.paths[1].points.at(-1)[0]<=464);
  }
  assert.match(phaseCamera('mirrorless','exposure').explanation,/representative mechanical/i);
  assert.match(phaseCamera('mirrorless','exposure').explanation,/EVF.*varies/i);
});
test('exploded never displays live paths and assembled stays opaque', () => {
  for(const type of ['dslr','mirrorless']) for(const mode of ['exploded','assembled']) {
    const d=phaseCamera(type,'viewing',{viewMode:mode,selectedPart:'shutter'});
    assert.deepEqual(d.paths,[]);
    if(mode==='assembled') { assert.equal(d.marker.part,'shutter'); assert.match(d.marker.label,/shutter/i); }
  }
});
test('ISO leaves incoming paths unchanged while opening and timing cues follow settings', () => {
  for(const type of ['dslr','mirrorless']) for(const phase of ['viewing','exposure']) {
    const base=phaseCamera(type,phase);
    const iso=phaseCamera(type,phase,{settings:{aperture:4,shutter:125,iso:800}});
    assert.deepEqual(iso.paths,base.paths);
    assert.equal(iso.apertureOpening,base.apertureOpening); assert.equal(iso.shutterCue,base.shutterCue);
    const fast=phaseCamera(type,phase,{settings:{aperture:16,shutter:1000,iso:400}});
    assert.ok(fast.apertureOpening<base.apertureOpening); assert.ok(fast.shutterCue<base.shutterCue);
    assert.equal(fast.shutterLabel,'1/1000 s');
  }
});
test('exploded sensor is visibly separated from the housing bounds', () => {
  for(const type of ['dslr','mirrorless']) {
    const d=phaseCamera(type,'viewing',{viewMode:'exploded'}),g=getCameraConfig(type).geometry;
    const sensor=d.parts.find(p=>p.id==='sensor'),body=d.parts.find(p=>p.id==='body');
    assert.ok(sensor.transform[0]+g.sensor.bounds[0]>body.transform[0]+g.body.bounds[0]+g.body.bounds[2]+8);
  }
});
test('exploded preserves geometry identity', () => {
  assert.equal(typeof camera.describeCamera,'function');
  for(const type of ['mirrorless','dslr']) {
    const config=getCameraConfig(type);
    const descriptor=camera.describeCamera(snapshot(type,'exploded'));
    assert.deepEqual(descriptor.parts.map(p=>p.id),config.partIds);
    for(const part of descriptor.parts) {
      const geometry=config.geometry[part.id];
      assert.deepEqual(part.transform,geometry.anchor.map((x,i)=>x+geometry.explodedOffset[i]));
    }
    assert.deepEqual(descriptor.paths,[]);
  }
});
test('all view bounds fit the fixed viewBox', () => {
  assert.equal(typeof camera.describeCamera,'function');
  for(const type of ['mirrorless','dslr']) for(const mode of ['assembled','cutaway','exploded']) {
    const config=getCameraConfig(type);
    assert.deepEqual(config.viewBox,[0,0,780,355]);
    assert.ok(config.outlinePath && config.cutawayPath);
    for(const p of camera.describeCamera(snapshot(type,mode)).parts) {
      const [x,y,w,h]=config.geometry[p.id].bounds;
      assert.ok(x+p.transform[0]>=8 && y+p.transform[1]>=8,`${type}/${mode}/${p.id} start`);
      assert.ok(x+w+p.transform[0]<=772 && y+h+p.transform[1]<=347,`${type}/${mode}/${p.id} end`);
    }
  }
});
test('geometry is independent of settings and hidden selections get a location marker', () => {
  assert.equal(typeof camera.describeCamera,'function');
  const before=snapshot('dslr','assembled','sensor');
  const after=createSnapshot({...before.state,settings:{aperture:16,shutter:1000,iso:3200},challengeId:'depth'});
  assert.deepEqual(camera.describeCamera(before).parts,camera.describeCamera(after).parts);
  assert.equal(camera.describeCamera(before).marker.part,'sensor');
  assert.equal(camera.describeCamera(snapshot('dslr','cutaway','sensor')).marker,null);
});
