import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineWake } from '../js/home/line-wake.js';

test('only actual movement creates a wake; a stationary pointer stays quiet', () => {
  const wake = createLineWake();
  assert.equal(wake.move(100, 100, 0), false);
  assert.equal(wake.move(101, 100, .05), false);
  assert.equal(wake.active, false);
  assert.equal(wake.move(120, 100, .1), true);
  assert.ok(Math.abs(wake.offset(140, 110, .2)) > .05);
  for (let time = .15; time < 2; time += .05) wake.move(120, 100, time);
  assert.equal(wake.active, false);
  assert.equal(wake.offset(140, 110, 2), 0);
});

test('fast reversals stay finite and below four screen pixels', () => {
  const wake = createLineWake();
  for (let i = 0; i < 180; i++) {
    const time = i * .05;
    wake.move(300 + Math.sin(i) * 80, 250 + Math.cos(i) * 40, time);
    assert.ok(wake.count <= 18);
    for (let y = 180; y <= 320; y += 20) {
      for (let x = 200; x <= 400; x += 20) {
        const displacement = wake.offset(x, y, time);
        assert.ok(Number.isFinite(displacement) && Math.abs(displacement) <= 4);
      }
    }
  }
  assert.equal(wake.advance(11), false);
  assert.equal(wake.offset(300, 250, 11), 0);
});

test('the wake is local and vanishes completely after movement ends', () => {
  const wake = createLineWake();
  wake.move(100, 100, 0);
  wake.move(120, 100, .06);
  const peak = Math.abs(wake.offset(145, 100, .12));
  assert.ok(peak > .05);
  assert.ok(Math.abs(wake.offset(800, 600, .12)) < .00001);
  assert.ok(Math.abs(wake.offset(145, 100, 1.2)) < peak * .05);
  assert.equal(wake.advance(1.5), false);
  assert.equal(wake.offset(145, 100, 1.5), 0);
});

test('leaving or returning after a pause never treats the jump as a throw', () => {
  const wake = createLineWake();
  wake.move(100, 100, 0);
  wake.move(120, 100, .06);
  wake.leave();
  assert.equal(wake.move(900, 800, .1), false);
  assert.equal(wake.count, 1);
  assert.equal(wake.move(300, 250, 1), false);
  assert.equal(wake.move(NaN, 250, 1.06), false);
  wake.clear();
  assert.equal(wake.active, false);
  assert.equal(wake.offset(140, 100, 1.1), 0);
});
