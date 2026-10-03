import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

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
