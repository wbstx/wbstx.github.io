import test from 'node:test';
import assert from 'node:assert/strict';
import { createWheelIntent, createWheelRouter, swipeDirection } from '../js/home/page-input.js';

test('one wheel burst flips once, including a long momentum tail', () => {
  const intent = createWheelIntent();
  assert.equal(intent(120, 0), 1);
  for (let time = 16; time < 1500; time += 16) assert.equal(intent(80, time), 0);
  assert.equal(intent(120, 1800), 1);
});
test('small deltas accumulate; direction changes do not carry old distance', () => {
  const intent = createWheelIntent();
  assert.equal(intent(20, 0), 0);
  assert.equal(intent(-25, 16), 0);
  assert.equal(intent(-20, 32), -1);
});
test('gestures consumed by card dragging or reading cannot leak into a page turn', () => {
  const intent = createWheelIntent();
  assert.equal(intent(120, 0, true), 0);
  assert.equal(intent(120, 100), 0);
  assert.equal(intent(-120, 400), -1);
});
test('touch paging needs a deliberate vertical swipe', () => {
  assert.equal(swipeDirection(8, 100), 1);
  assert.equal(swipeDirection(0, -90), -1);
  assert.equal(swipeDirection(80, 60), 0);
  assert.equal(swipeDirection(0, 20), 0);
});


test('a renewed trackpad push rearms without a silent gap', () => {
  const intent = createWheelIntent();
  assert.equal(intent(60, 0), 1);
  for (let t = 20; t <= 420; t += 20) assert.equal(intent(Math.max(2, 50 - t / 8), t), 0);
  assert.equal(intent(14, 440), 0);
  assert.equal(intent(30, 460), 1);
});
test('a deliberate reversal works before the momentum tail becomes silent', () => {
  const intent = createWheelIntent();
  assert.equal(intent(60, 0), 1);
  for (let t = 40; t <= 400; t += 40) assert.equal(intent(10, t), 0);
  assert.equal(intent(-45, 420), -1);
});
test('moving from the paper list to the page area starts an independent gesture', () => {
  const intent = createWheelIntent();
  assert.equal(intent(60, 0), 1);
  intent.reset();
  assert.equal(intent(-60, 100), -1);
});
test('decaying momentum never turns a second page', () => {
  const intent = createWheelIntent();
  assert.equal(intent(100, 0), 1);
  for (let t = 16; t < 1800; t += 16) assert.equal(intent(100 * Math.exp(-t / 280), t), 0);
});

test('a biography page turn cannot carry its momentum into the paper list', () => {
  const route = createWheelRouter();
  assert.deepEqual(route(100, 0, 'page'), { preventDefault: true, direction: 1 });
  for (let t = 16; t < 1800; t += 16) {
    // The list crosses the pointer during the 460 ms animation and stays there.
    const region = t < 160 ? 'page' : 'papers';
    assert.deepEqual(route(100 * Math.exp(-t / 280), t, region), { preventDefault: true, direction: 0 });
  }
  assert.deepEqual(route(6, 2000, 'papers'), { preventDefault: false, direction: 0 }, 'a new reading gesture starts with its first small delta');
});

test('a renewed push can start reading without waiting for the old tail to stop', () => {
  const route = createWheelRouter();
  route(60, 0, 'page');
  for (let t = 20; t <= 420; t += 20) assert.equal(route(Math.max(2, 50 - t / 8), t, 'papers').preventDefault, true);
  for (const [delta, time] of [[14, 440], [30, 460], [10, 480], [2, 520]]) {
    assert.deepEqual(route(delta, time, 'papers'), { preventDefault: false, direction: 0 });
  }
});

test('reversing after a page turn starts a new native reading gesture', () => {
  const route = createWheelRouter();
  route(60, 0, 'page');
  for (let t = 40; t <= 400; t += 40) route(10, t, 'papers');
  assert.deepEqual(route(-45, 420, 'papers'), { preventDefault: false, direction: 0 });
});

test('a gesture that starts in the paper list scrolls natively throughout its tail', () => {
  const route = createWheelRouter();
  for (let t = 0; t < 1500; t += 16) {
    assert.deepEqual(route(100 * Math.exp(-t / 280), t, 'papers'), { preventDefault: false, direction: 0 });
  }
});

test('leaving the reading column can still turn the page immediately', () => {
  const route = createWheelRouter();
  route(60, 0, 'papers');
  assert.deepEqual(route(-60, 100, 'page'), { preventDefault: true, direction: -1 });
  assert.deepEqual(route(-20, 120, 'papers'), { preventDefault: true, direction: 0 });
});

test('card-drag momentum cannot start reading when the list reaches the pointer', () => {
  const route = createWheelRouter();
  route(60, 0, 'page', true);
  assert.deepEqual(route(30, 50, 'papers'), { preventDefault: true, direction: 0 });
  assert.deepEqual(route(8, 300, 'papers'), { preventDefault: false, direction: 0 });
});
