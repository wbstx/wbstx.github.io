// Screen-space impulses keep the same small amplitude at every viewport size.
export function createLineWake({ amplitude = 4, duration = 1.3, limit = 18 } = {}) {
  let previous = null;
  let waves = [];

  function advance(time) {
    waves = waves.filter(wave => time - wave.time < duration);
    return waves.length > 0;
  }

  return {
    get active() { return waves.length > 0; },
    get count() { return waves.length; },
    clear() { previous = null; waves = []; },
    leave() { previous = null; },
    advance,
    move(x, y, time) {
      if (![x, y, time].every(Number.isFinite)) return false;
      advance(time);
      if (!previous || time - previous.time > .2) {
        previous = { x, y, time };
        return false;
      }
      const distance = Math.hypot(x - previous.x, y - previous.y);
      if (time - previous.time < .045 || distance < 4) return false;
      previous = { x, y, time };
      waves.push({ x, y, time, force: Math.min(1.6, distance / 16) });
      if (waves.length > limit) waves.shift();
      return true;
    },
    offset(x, y, time) {
      let displacement = 0;
      for (const wave of waves) {
        const age = time - wave.time;
        if (age < 0 || age >= duration) continue;
        const distance = Math.hypot(x - wave.x, y - wave.y);
        const phase = distance - age * 105;
        // A soft wavefront travels a short distance, then fully dissipates.
        const envelope = Math.exp(-phase * phase / 1800 - age * 4.8);
        displacement += Math.sin(phase / 15) * envelope * wave.force * amplitude * .28;
      }
      return amplitude * Math.tanh(displacement / amplitude);
    },
  };
}
