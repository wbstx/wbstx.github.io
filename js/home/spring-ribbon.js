export const RIBBON_LENGTH = 1.68;
const NODE_COUNT = 6;
const NODE_MASS = .055;
const STIFFNESS = 520;
const DAMPING = 10;

export function createSpringRibbon({ RAPIER, world, anchor, card, attachment }) {
  const origin = { x: 0, y: 0, z: 0 };
  const segmentLength = RIBBON_LENGTH / NODE_COUNT;
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(anchor.x, anchor.y, anchor.z));
  const bodies = Array.from({ length: NODE_COUNT }, (_, i) => world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(anchor.x, anchor.y - (i + 1) * segmentLength, anchor.z)
      .setAdditionalMass(NODE_MASS).setLinearDamping(3).setAngularDamping(4),
  ));
  let parent = fixed;
  const springs = bodies.map((body, i) => {
    // Preload the springs for the badge's weight, retaining its original resting
    // height. The shorter unloaded ribbon can both compress and stretch.
    const supportedMass = card.mass() + (NODE_COUNT - i) * NODE_MASS;
    const restLength = segmentLength - supportedMass * Math.abs(world.gravity.y) / STIFFNESS;
    const spring = world.createImpulseJoint(
      RAPIER.JointData.spring(restLength, STIFFNESS, DAMPING, origin, origin), parent, body, true,
    );
    parent = body;
    return spring;
  });
  world.createImpulseJoint(RAPIER.JointData.spherical(origin, attachment), bodies.at(-1), card, true);

  return {
    bodies, springs, segmentLength,
    reset() {
      bodies.forEach((body, i) => {
        body.setTranslation({ x: anchor.x, y: anchor.y - (i + 1) * segmentLength, z: anchor.z }, true);
        body.setLinvel(origin, true);
        body.setAngvel(origin, true);
      });
    },
  };
}
