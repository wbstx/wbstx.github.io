// Ignore a wheel gesture's momentum, but allow a fresh push or reversal without
// requiring the trackpad to become completely silent between page turns.
export function createWheelIntent({ threshold = 40, pause = 180, rearmAfter = 380 } = {}) {
  let lastTime, distance, consumed, firedAt, firedDirection, tailMinimum;
  function reset() {
    lastTime = -Infinity;
    distance = 0;
    consumed = false;
    firedAt = -Infinity;
    firedDirection = 0;
    tailMinimum = Infinity;
  }
  reset();
  function intent(delta, time, blocked = false) {
    if (!Number.isFinite(delta) || delta === 0) return 0;
    const magnitude = Math.abs(delta);
    const direction = Math.sign(delta);
    const quiet = time - lastTime > pause;
    const freshPush = consumed && time - firedAt >= rearmAfter && (
      direction !== firedDirection || (magnitude >= 12 && magnitude >= tailMinimum * 2.5)
    );
    if (quiet || freshPush) { distance = 0; consumed = false; tailMinimum = Infinity; }
    lastTime = time;
    // An actual card drag owns its gesture. Page animations are deliberately
    // excluded: a new gesture can interrupt them rather than becoming stuck.
    if (blocked) {
      consumed = true;
      firedAt = time;
      firedDirection = direction;
      tailMinimum = magnitude;
      return 0;
    }
    if (consumed) { tailMinimum = Math.min(tailMinimum, magnitude); return 0; }
    if (direction !== Math.sign(distance)) distance = 0;
    distance += delta;
    if (Math.abs(distance) < threshold) return 0;
    consumed = true;
    firedAt = time;
    firedDirection = direction;
    tailMinimum = magnitude;
    return direction;
  }
  intent.reset = reset;
  return intent;
}

export function swipeDirection(x, y) {
  return Math.abs(y) >= 48 && Math.abs(y) > Math.abs(x) * 1.2 ? Math.sign(y) : 0;
}
