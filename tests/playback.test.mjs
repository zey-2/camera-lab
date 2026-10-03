import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayback} from '../dist/playback.mjs';

function fakeClock() {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  return {
    setTimer(callback, delay) {
      const id = ++nextId;
      timers.set(id, {callback, at:now + delay});
      return id;
    },
    clearTimer(id) { timers.delete(id); },
    pending() { return timers.size; },
    queuedCallbacks() { return [...timers.values()].map(timer => timer.callback); },
    advance(milliseconds) {
      const end = now + milliseconds;
      while (true) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= end)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at;
        timers.delete(due[0]);
        due[1].callback();
      }
      now = end;
    }
  };
}

function setup() {
  const clock = fakeClock();
  const phases = [];
  const playback = createPlayback({onPhase:phase => phases.push(phase), ...clock});
  return {clock, phases, playback};
}

test('one play returns to viewing', () => {
  const {clock, phases, playback} = setup();
  assert.equal(clock.pending(), 0);
  assert.deepEqual(phases, []);
  playback.play();
  assert.deepEqual(phases, ['viewing']);
  clock.advance(299);
  assert.deepEqual(phases, ['viewing']);
  clock.advance(1);
  assert.deepEqual(phases, ['viewing', 'exposure']);
  clock.advance(899);
  assert.deepEqual(phases, ['viewing', 'exposure']);
  clock.advance(1);
  assert.deepEqual(phases, ['viewing', 'exposure', 'viewing']);
  assert.equal(clock.pending(), 0);
  clock.advance(10000);
  assert.deepEqual(phases, ['viewing', 'exposure', 'viewing']);
});

test('second play invalidates first', () => {
  const {clock, phases, playback} = setup();
  playback.play();
  const queued = clock.queuedCallbacks();
  clock.advance(400);
  playback.play();
  queued.forEach(callback => callback());
  assert.deepEqual(phases, ['viewing', 'exposure', 'viewing']);
  clock.advance(299);
  assert.deepEqual(phases, ['viewing', 'exposure', 'viewing']);
  clock.advance(1);
  assert.deepEqual(phases, ['viewing', 'exposure', 'viewing', 'exposure']);
  clock.advance(900);
  clock.advance(10000);
  assert.deepEqual(phases, ['viewing', 'exposure', 'viewing', 'exposure', 'viewing']);
  assert.equal(clock.pending(), 0);
});

test('cancel suppresses queued exposure', () => {
  const {clock, phases, playback} = setup();
  playback.play();
  const queued = clock.queuedCallbacks();
  playback.cancel();
  assert.equal(clock.pending(), 0);
  queued.forEach(callback => callback());
  clock.advance(10000);
  assert.deepEqual(phases, ['viewing']);
});

test('dispose suppresses all callbacks', () => {
  const {clock, phases, playback} = setup();
  playback.play();
  clock.advance(300);
  const queued = clock.queuedCallbacks();
  playback.dispose();
  playback.dispose();
  playback.play();
  queued.forEach(callback => callback());
  clock.advance(10000);
  assert.deepEqual(phases, ['viewing', 'exposure']);
  assert.equal(clock.pending(), 0);
});

test('cancel can be followed by a fresh finite play', () => {
  const {clock, phases, playback} = setup();
  playback.play();
  playback.cancel();
  playback.play();
  clock.advance(1200);
  clock.advance(10000);
  assert.deepEqual(phases, ['viewing', 'viewing', 'exposure', 'viewing']);
  assert.equal(clock.pending(), 0);
});
