import test from 'node:test';
import assert from 'node:assert/strict';
import { createFlipPeek } from '../js/home/flip-peek.js';

test('the cue waits for a settled badge, reveals its reverse, then runs only once', () => {
  let completions = 0;
  const cue = createFlipPeek({ onComplete: () => completions++ });
  for (let i = 0; i < 300; i++) assert.equal(cue.step(1 / 60, false), null);
  for (let i = 0; i < 40; i++) assert.equal(cue.step(1 / 60, true), null);
  let preview;
  for (let i = 0; i < 30 && !preview; i++) preview = cue.step(1 / 60, true);
  assert.ok(preview, 'starts after the settling delay');
  let maximumYaw = preview.yaw;
  // The preview itself makes the card move, so settled will become false.
  for (let i = 0; i < 240; i++) {
    preview = cue.step(1 / 60, false);
    if (preview) maximumYaw = Math.max(maximumYaw, preview.yaw);
  }
  assert.ok(maximumYaw > Math.PI / 2, 'briefly reveals the reverse');
  assert.equal(completions, 1);
  for (let i = 0; i < 300; i++) assert.equal(cue.step(1 / 60, true), null);
  assert.equal(completions, 1);
});

test('user input permanently cancels both waiting and active previews', () => {
  for (const active of [false, true]) {
    let completions = 0;
    const cue = createFlipPeek({ onComplete: () => completions++ });
    if (active) for (let i = 0; i < 90; i++) cue.step(1 / 60, true);
    cue.cancel();
    cue.cancel();
    for (let i = 0; i < 300; i++) assert.equal(cue.step(1 / 60, true), null);
    assert.equal(completions, 1);
  }
});

test('reduced-motion visitors do not get an automatic preview', () => {
  const cue = createFlipPeek({ disabled: true, onComplete: () => assert.fail('no cue should play') });
  for (let i = 0; i < 600; i++) assert.equal(cue.step(1 / 60, true), null);
  cue.cancel();
});

test('refresh creates a fresh cue even after the previous page was used', () => {
  const previousPage = createFlipPeek();
  previousPage.cancel();
  const refreshedPage = createFlipPeek();
  let preview = null;
  for (let i = 0; i < 70; i++) {
    assert.equal(previousPage.step(1 / 60, true), null);
    preview ||= refreshedPage.step(1 / 60, true);
  }
  assert.ok(preview, 'a new page load can demonstrate the flip again');
});
