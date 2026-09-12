import { Quaternion, Vector3 } from 'three';

import { HARDWARE_ATTACHMENT } from './hardware.js';

// One position for the D-ring, the physics joint and the rendered ribbon.
export const BADGE_ATTACHMENT = HARDWARE_ATTACHMENT;
export const STRAP_HALF_WIDTH = .205;

const identity = new Quaternion();
const rotation = new Quaternion();
const point = new Vector3();
const tangent = new Vector3();
const across = new Vector3();

export function writeRibbonPositions(curve, suspensionRotation, positions, segments) {
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPoint(t, point);
    curve.getTangent(t, tangent);
    // Only the strap-side D-ring can orient the ribbon. The swivel absorbs
    // card flips, so those flips cannot twist the strap or turn it edge-on.
    rotation.slerpQuaternions(identity, suspensionRotation, t * t);
    across.set(1, 0, 0).applyQuaternion(rotation);
    if (i < segments) {
      across.addScaledVector(tangent, -across.dot(tangent));
      if (across.lengthSq() < 1e-8) {
        across.set(0, 0, 1).cross(tangent);
        if (across.lengthSq() < 1e-8) across.set(0, 1, 0).cross(tangent);
      }
    }
    // The final cross-section shares the clasp's local X axis exactly.
    across.normalize().multiplyScalar(STRAP_HALF_WIDTH);
    positions.set([
      point.x - across.x, point.y - across.y, point.z - across.z,
      point.x + across.x, point.y + across.y, point.z + across.z,
    ], i * 6);
  }
}
