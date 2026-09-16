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

// A fresh gesture transfers ownership between paging and an inner reading area.
// Papers exit at the top; an overflowing profile exits at the bottom.
export function createWheelRouter({ edgeThreshold = 80, ...options } = {}) {
  const intent = createWheelIntent(options);
  let owner = null;
  let exitAtEdge = false;
  let edgeDistance = 0;
  return (delta, time, region, blocked = false, atEdge = false) => {
    const exitDirection = region === 'profile' ? 1 : -1;
    const towardEdge = delta * exitDirection > 0;
    // Leaving the reading column remains immediately responsive.
    if (region === 'page' && owner && owner !== 'page') {
      intent.reset();
      owner = null;
    }
    const previousGesture = intent.gestureId;
    const direction = intent(delta, time, blocked);
    if (owner === null || intent.gestureId !== previousGesture) {
      owner = region;
      // Arriving at the edge partway through a reading gesture never exits.
      exitAtEdge = region !== 'page' && atEdge && towardEdge;
      edgeDistance = 0;
    }
    if (blocked) { owner = 'page'; exitAtEdge = false; }
    const reading = owner !== 'page' && owner === region;
    if (reading) {
      if (!atEdge || !towardEdge) { exitAtEdge = false; edgeDistance = 0; }
      if (atEdge && towardEdge) {
        if (exitAtEdge) edgeDistance += Math.abs(delta);
        if (edgeDistance >= edgeThreshold) {
          owner = 'page';
          exitAtEdge = false;
          // The exit owns the rest of this gesture, including its momentum.
          intent(delta, time, true);
          return { preventDefault: true, direction: exitDirection };
        }
        return { preventDefault: true, direction: 0 };
      }
    }
    return {
      preventDefault: !reading,
      direction: region === 'page' ? direction : 0,
    };
  };
}

export function swipeDirection(x, y, threshold = 48) {
  return Math.abs(y) >= threshold && Math.abs(y) > Math.abs(x) * 1.2 ? Math.sign(y) : 0;
}
