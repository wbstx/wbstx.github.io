import { Euler, MathUtils, Quaternion } from 'three';

// The light spring nodes need smaller steps and more constraint iterations
// while a kinematic card holds the spring far beyond its resting length.
export const BADGE_PHYSICS_STEP = 1 / 120;
export const BADGE_SOLVER_ITERATIONS = 24;

const quaternion = new Quaternion();
const euler = new Euler(0, 0, 0, 'YXZ');
const { clamp } = MathUtils;

export function followBadgeDrag(card, target, dt = BADGE_PHYSICS_STEP) {
  const position = card.translation();
  const dx = target.x - position.x, dy = target.y - position.y, dz = target.z - position.z;
  const distance = Math.hypot(dx, dy, dz);
  // Follow normal gestures closely, but don't turn a pointer jump into an
  // unbounded kinematic velocity. Desktop reach remains unrestricted.
  const fraction = distance > 0 ? Math.min(1 - Math.exp(-30 * dt), 18 * dt / distance) : 0;
  card.setNextKinematicTranslation({
    x: position.x + dx * fraction,
    y: position.y + dy * fraction,
    z: position.z + dz * fraction,
  });
}

export function releaseBadgeMotion(card, spatialThrow) {
  const velocity = card.linvel();
  const vx = clamp(velocity.x, -8, 8), vy = clamp(velocity.y, -8, 8);
  card.setLinvel({
    x: vx, y: vy,
    z: clamp(velocity.z + (spatialThrow ? vx * .045 + vy * .025 : 0), -1.2, 1.2),
  }, true);
  if (spatialThrow) {
    const spin = card.angvel();
    card.setAngvel({
      x: clamp(spin.x + vx * .045, -.65, .65),
      y: clamp(spin.y + vx * .06, -.8, .8),
      z: spin.z,
    }, true);
  }
}

export function updateBadgeYaw(card, { back = false, peek = null, dt = BADGE_PHYSICS_STEP } = {}) {
  const velocity = card.angvel(), movement = card.linvel();
  euler.setFromQuaternion(quaternion.copy(card.rotation()), 'YXZ');
  const swingYaw = clamp(movement.x * .085 + card.translation().x * .025, -.22, .22);
  const targetYaw = (back ? Math.PI : 0) - .08 + (peek?.yaw ?? swingYaw);
  const error = Math.atan2(Math.sin(targetYaw - euler.y), Math.cos(targetYaw - euler.y));
  // Preserve the original 60 Hz swivel response when physics uses substeps.
  const retention = Math.pow(.94, dt * 60);
  const yawVelocity = peek ? clamp(peek.velocity + error * 8, -3, 3)
    : velocity.y * retention + error * .23 * (1 - retention) / .06;
  if (peek || Math.abs(error) > .005 || Math.abs(velocity.y) > .01) {
    card.setAngvel({ x: velocity.x, y: yawVelocity, z: velocity.z }, true);
  }
}
