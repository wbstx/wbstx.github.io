export const FLIP_PEEK_DURATION = 2.8;
const REST_DELAY = .9;
const PEEK_ANGLE = 2; // Just past edge-on: reveal a sliver of the reverse.

// A first-use demonstration. Once playing, its own motion must not reset the
// settling delay. User input cancels it for this page load; refresh starts anew.
export function createFlipPeek({ disabled = false, onComplete = () => {} } = {}) {
  let phase = disabled ? 'done' : 'waiting';
  let idle = 0;
  let elapsed = 0;
  function finish() {
    if (phase === 'done') return;
    phase = 'done';
    onComplete();
  }
  return {
    cancel: finish,
    step(delta, settled) {
      if (phase === 'done') return null;
      if (phase === 'waiting') {
        idle = settled ? idle + delta : 0;
        if (idle < REST_DELAY) return null;
        phase = 'playing';
      }
      elapsed += delta;
      if (elapsed >= FLIP_PEEK_DURATION) { finish(); return null; }
      const t = elapsed / FLIP_PEEK_DURATION;
      return {
        yaw: PEEK_ANGLE * Math.sin(Math.PI * t) ** 2,
        velocity: PEEK_ANGLE * Math.PI / FLIP_PEEK_DURATION * Math.sin(2 * Math.PI * t),
      };
    },
  };
}
