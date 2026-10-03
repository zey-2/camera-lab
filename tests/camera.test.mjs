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
    assert.deepEqual(assembled.paths,[]); assert.deepEqual(cutaway.paths,[]);
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
