import test from 'node:test';
import assert from 'node:assert/strict';
import { createWheelIntent, swipeDirection } from '../js/home/page-input.js';

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
