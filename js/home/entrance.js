import { Euler, Quaternion, Vector3 } from 'three';

export const ENTRANCE_DURATION = 2.6;

// Pose the whole suspension as one pendulum before releasing it. Starting
// every rope node in the same frame avoids a solver snap on the first frame.
export function startBadgeEntrance({ bodies, rigidCard, anchor, rest, segmentLength, narrow }) {
  const swing = new Quaternion().setFromEuler(new Euler(narrow ? .085 : .12, 0, narrow ? .24 : .34));
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -.42);
  const offset = new Vector3();
  const velocity = new Vector3();
  const angularVelocity = new Vector3(narrow ? .10 : .14, .14, -.42);
  const place = (body, distance) => {
    offset.set(0, -distance, 0).applyQuaternion(swing);
    // All joints share the same spatial swing, including depth and velocity.
    velocity.crossVectors(angularVelocity, offset);
    body.setTranslation(offset.clone().add(anchor), true);
    body.setLinvel(velocity, true);
  };
  bodies.forEach((body, i) => place(body, (i + 1) * segmentLength));
  place(rigidCard, anchor.y - rest.y);
  rigidCard.setRotation(swing.multiply(yaw), true);
  rigidCard.setAngvel(angularVelocity, true);
  updateEntranceDamping(rigidCard, 0);
}

export function updateEntranceDamping(rigidCard, elapsed) {
  const progress = Math.min(1, elapsed / ENTRANCE_DURATION);
  const settle = progress * progress;
  rigidCard.setLinearDamping(.7 + 2.5 * settle);
  rigidCard.setAngularDamping(1.1 + 3.4 * settle);
}
