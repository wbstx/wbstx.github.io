// Keep the pointer path (including coalesced events), then resample long gaps
// at brush-sized spacing. Work is consumed under the animation frame's budget.
export class BrushStrokeQueue {
  points = [];
  last = undefined;

  clear() {
    this.points.length = 0;
    this.last = undefined;
  }

  get length() {
    return this.points.length;
  }

  push(sample) {
    const tail = this.points.at(-1);
    if (
      tail &&
      !sample.force &&
      tail.clientX === sample.clientX &&
      tail.clientY === sample.clientY
    ) {
      tail.end ||= sample.end;
      return;
    }
    this.points.push({ ...sample });
    if (this.points.length > 256) {
      // Bound event storage on high-rate pens without losing stroke boundaries.
      this.points = this.points.filter(
        (p, i, a) => p.force || p.end || i % 2 === 0 || i === a.length - 1,
      );
    }
  }

  next(spacing) {
    const step = Math.max(1, spacing);
    while (this.points.length) {
      const target = this.points[0];
      if (!this.last || target.force) {
        this.points.shift();
        this.last = target;
        return target;
      }
      const dx = target.clientX - this.last.clientX;
      const dy = target.clientY - this.last.clientY;
      const distance = Math.hypot(dx, dy);
      if (distance > step) {
        this.last = {
          clientX: this.last.clientX + (dx * step) / distance,
          clientY: this.last.clientY + (dy * step) / distance,
          pointerId: target.pointerId,
          force: false,
        };
        return this.last;
      }
      this.points.shift();
      if (target.end || !this.points.length) {
        this.last = target;
        return target;
      }
    }
    return undefined;
  }
}
