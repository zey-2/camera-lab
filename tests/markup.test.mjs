import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getCameraConfig} from '../dist/camera-config.mjs';

test('every camera component has an equivalent named selection button', async () => {
  const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
  for(const type of ['mirrorless','dslr']) for(const id of getCameraConfig(type).partIds) {
    assert.match(html,new RegExp(`<button[^>]*data-select-part="${id}"[^>]*>[^]*?</button>`),`missing ${id} button`);
  }
});

test('mechanism labels expose light versus signal and symbolic capture cues', async () => {
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 for(const id of ['camera-paths','camera-path-legend','camera-phase-label','camera-explanation','camera-shutter-value','shutter-timing-cue']) assert.match(html,new RegExp(`id="${id}"`));
 assert.ok(html.includes('Preview of selected capture opening'));
 assert.ok(html.includes('Electronic signal')); assert.ok(html.includes('Light'));
 assert.ok(html.indexOf('id="camera-explanation"')>html.indexOf('id="lab-details"'));
});

test('all literal interface targets exist once', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate IDs');
  for (const id of ['aperture','shutter','iso','aperture-value','shutter-value','iso-value','brightness-meter','brightness-value','brightness-status','preview-desc','grain','part-name','part-description','part-connection','experiment-title','experiment-description','technique-goal-text','technique-goal','brightness-goal','challenge-hint','challenge-current','progress-count','challenge-feedback','check-challenge','hint-toggle']) {
    assert.ok(ids.includes(id), `missing #${id}`);
  }
  assert.ok(html.includes('Simulated photo</h2>'));
});

test('renderer exposes snapshot interface and seeded grain initialization', async () => {
  const renderer = await import('../dist/renderers.mjs').catch(() => ({}));
  assert.equal(typeof renderer.renderInterface, 'function');
  assert.equal(typeof renderer.createGrain, 'function');
});


test('rendered ratios and setting descriptions preserve Unicode formatting', async () => {
  const {renderInterface} = await import('../dist/renderers.mjs');
  const {createSnapshot} = await import('../dist/state.mjs');
  const {createInitialState} = await import('../dist/model.mjs');
  const nodes = new Map();
  const root = {
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, {
        style: {setProperty() {}}, classList: {toggle() {}}, setAttribute() {}
      });
      return nodes.get(selector);
    },
    querySelectorAll() { return []; }
  };
  renderInterface(root, createSnapshot(createInitialState()), {compact:false});
  assert.equal(nodes.get('#captured-light').textContent, '1.00\u00d7');
  assert.equal(nodes.get('#image-brightness').textContent, '1.00\u00d7');
  assert.equal(nodes.get('#challenge-current').textContent, 'f/4 \u00b7 1/125 s \u00b7 ISO 400');
  assert.ok(nodes.get('#preview-desc').textContent.startsWith('f/4 \u00b7 1/125 s \u00b7 ISO 400.'));
});

test('responsive tabs share one physical range and labelled panels', async () => {
 const html = await readFile(new URL('../dist/index.html', import.meta.url),'utf8');
 for(const key of ['aperture','shutter','iso']) {
 assert.match(html,new RegExp(`id="control-tab-${key}"[^>]*aria-controls="control-panel-${key}"`));
 assert.match(html,new RegExp(`id="control-panel-${key}"[^>]*aria-labelledby="control-tab-${key}"`));
 assert.equal([...html.matchAll(new RegExp(`id="${key}" type="range"`,'g'))].length,1);
 }
 const order=['id="lab-workbench"','id="lab-details"','class="challenge-panel','class="reference-disclosure'].map(x=>html.indexOf(x));
 assert.ok(order.every((x,i)=>x>=0 && (!i || x>order[i-1])));
});

test('compact controls expose all values and only selected range panel', async () => {
  const {renderInterface} = await import('../dist/renderers.mjs');
  const {createSnapshot, transition} = await import('../dist/state.mjs');
  const {createInitialState} = await import('../dist/model.mjs');
  const nodes = new Map();
  const root = {querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {attributes:{}, style:{setProperty(){}},classList:{toggle(){}},setAttribute(key,value){this.attributes[key]=value;}});
    return nodes.get(selector);
  },querySelectorAll(){return [];}};
  const before=createSnapshot(createInitialState());
  const next=transition(before,{type:'set-control',control:'iso'});
  assert.deepEqual(next.state.settings,before.state.settings);
  renderInterface(root,next,{compact:true});
  assert.equal(nodes.get('#control-tabs').hidden,false);
  for(const key of ['aperture','shutter','iso']) {
    assert.equal(nodes.get('#control-panel-'+key).hidden,key!=='iso');
    assert.equal(nodes.get('#control-tab-'+key).tabIndex,key==='iso'?0:-1);
  }
  assert.equal(nodes.get('#tab-value-aperture').textContent,'f/4');
  assert.equal(nodes.get('#tab-value-shutter').textContent,'1/125 s');
  assert.equal(nodes.get('#shutter').attributes['aria-valuetext'],'1/125 second');
  renderInterface(root,next,{compact:false});
  assert.equal(nodes.get('#control-tabs').hidden,true);
  for(const key of ['aperture','shutter','iso']) assert.equal(nodes.get('#control-panel-'+key).hidden,false);
});
