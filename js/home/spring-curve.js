import { Curve, Vector3 } from 'three';

// A clamped cubic B-spline softens the simulated node angles. The last three
// controls share the socket axis, spreading the bend out before the terminal
// instead of forcing it through a tiny Catmull-Rom guide segment.
export class SpringCurve extends Curve {
  constructor(nodeCount) {
    super();
    this.points = Array.from({ length: nodeCount + 2 }, () => new Vector3());
    this.arcLengthDivisions = 240;
    this.work = Array.from({ length: 4 }, () => new Vector3());
    const spans = this.points.length - 3;
    this.knots = Array.from({ length: this.points.length + 4 }, (_, i) => Math.max(0, Math.min(1, (i - 3) / spans)));
  }

  update(anchor, bodies, socket, socketUp) {
    const points = this.points;
    points[0].copy(anchor);
    // Reserve the final two free nodes for a longer, smooth socket transition.
    for (let i = 0; i < bodies.length - 2; i++) points[i + 1].copy(bodies[i].translation());
    const lastFree = bodies.length - 2;
    let length = points[lastFree].distanceTo(socket);
    for (let i = 1; i <= lastFree; i++) length += points[i].distanceTo(points[i - 1]);
    const lead = Math.min(.5, length * .28, points[lastFree].distanceTo(socket) * .65);
    points[lastFree + 1].copy(socket).addScaledVector(socketUp, lead);
    points[lastFree + 2].copy(socket).addScaledVector(socketUp, lead * .5);
    points[lastFree + 3].copy(socket);
    this.needsUpdate = true;
    return this;
  }

  getPoint(t, target = new Vector3()) {
    const { points, knots, work } = this;
    const u = Math.max(0, Math.min(1, t));
    const span = Math.min(points.length - 1, 3 + Math.floor(u * (points.length - 3)));
    for (let j = 0; j <= 3; j++) work[j].copy(points[span - 3 + j]);
    for (let level = 1; level <= 3; level++) {
      for (let j = 3; j >= level; j--) {
        const start = knots[span - 3 + j];
        const alpha = (u - start) / (knots[span + 1 + j - level] - start);
        work[j].lerpVectors(work[j - 1], work[j], alpha);
      }
    }
    return target.copy(work[3]);
  }
}
