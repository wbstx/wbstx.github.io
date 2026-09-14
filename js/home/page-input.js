// Ignore a wheel gesture's momentum, but allow a fresh push or reversal without
// requiring the trackpad to become completely silent between page turns.
export function createWheelIntent({ threshold = 40, pause = 180, rearmAfter = 380 } = {}) {
  let lastTime, distance, consumed, firedAt, firedDirection, tailMinimum;
  function reset() {
    intent.gestureId = 0;
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
    if (quiet || freshPush) {
      distance = 0;
      consumed = false;
      tailMinimum = Infinity;
      intent.gestureId++;
    }
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

// Keep a page-turn gesture's tail out of a paper list that moves under the
// pointer. Only a new gesture may transfer ownership from the page to papers.
export function createWheelRouter(options) {
  const intent = createWheelIntent(options);
  let owner = null;
  return (delta, time, region, blocked = false) => {
    // Leaving the reading column remains immediately responsive.
    if (region === 'page' && owner === 'papers') {
      intent.reset();
      owner = null;
    }
    const previousGesture = intent.gestureId;
    const direction = intent(delta, time, blocked);
    if (owner === null || intent.gestureId !== previousGesture) owner = region;
    if (blocked) owner = 'page';
    const reading = owner === 'papers' && region === 'papers';
    return {
      preventDefault: !reading,
      direction: region === 'page' ? direction : 0,
    };
  };
}

export function swipeDirection(x, y) {
  return Math.abs(y) >= 48 && Math.abs(y) > Math.abs(x) * 1.2 ? Math.sign(y) : 0;
}
