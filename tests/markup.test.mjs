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

