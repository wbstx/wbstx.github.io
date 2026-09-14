import test from 'node:test';
import { CARD_WIDTH, CARD_HEIGHT } from '../js/home/card-dimensions.js';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { createSpringRibbon, RIBBON_LENGTH } from '../js/home/spring-ribbon.js';
import { BADGE_ATTACHMENT } from '../js/home/lanyard.js';
import { BADGE_PHYSICS_STEP, BADGE_SOLVER_ITERATIONS, followBadgeDrag, releaseBadgeMotion, updateBadgeYaw } from '../js/home/badge-motion.js';

await RAPIER.init();

function setup() {
  const world = new RAPIER.World({ x: 0, y: -23, z: 0 });
  world.numSolverIterations = BADGE_SOLVER_ITERATIONS;
  world.timestep = BADGE_PHYSICS_STEP;
  const anchor = { x: 0, y: 4.98, z: 0 };
  const rest = { x: 0, y: anchor.y - RIBBON_LENGTH - BADGE_ATTACHMENT.y, z: 0 };
  const card = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, rest.y, 0).setLinearDamping(3.2).setAngularDamping(4.5));
  world.createCollider(RAPIER.ColliderDesc.cuboid(CARD_WIDTH / 2, CARD_HEIGHT / 2, .045).setMass(1).setCollisionGroups(0), card);
  const ribbon = createSpringRibbon({ RAPIER, world, anchor, card, attachment: BADGE_ATTACHMENT });
  const step = seconds => { for (let i = 0; i < Math.round(seconds / world.timestep); i++) world.step(); };
  step(3);
  return { world, card, ribbon, rest, step };
}

function pull({ world, card }, delta) {
  const start = { ...card.translation() };
  card.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
  const steps = Math.round(.4 / world.timestep);
  for (let i = 1; i <= steps; i++) {
    followBadgeDrag(card, { x: start.x + delta.x * i / steps, y: start.y + delta.y * i / steps, z: start.z + delta.z * i / steps });
    world.step();
  }
  for (let i = 0; i < .5 / world.timestep; i++) {
    followBadgeDrag(card, { x: start.x + delta.x, y: start.y + delta.y, z: start.z + delta.z });
    world.step();
  }
  card.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  releaseBadgeMotion(card, true);
}

test('the ribbon supports the original resting height and rebounds through it with damping', () => {
  const fixture = setup();
  const { world, card, rest } = fixture;
  try {
    const equilibrium = card.translation().y;
    assert.ok(Math.abs(equilibrium - rest.y) < .03);
    pull(fixture, { x: 0, y: -.65, z: 0 });
    const heights = [];
    for (let i = 0; i < 5 / world.timestep; i++) { world.step(); heights.push(card.translation().y); }
    assert.ok(Math.max(...heights.slice(0, Math.round(.6 / world.timestep))) > equilibrium + .15, 'springs overshoot on release');
    assert.ok(Math.min(...heights.slice(Math.round(.6 / world.timestep), Math.round(1.2 / world.timestep))) < equilibrium - .04, 'a second rebound follows');
    assert.ok(Math.abs(heights.at(-1) - equilibrium) < .03, 'oscillation decays');
  } finally { world.free(); }
});

test('a large spatial drag stays finite, recovers, and keeps the buckle attached', () => {
  const fixture = setup();
  const { world, card, ribbon, rest } = fixture;
  try {
    pull(fixture, { x: -4, y: .8, z: .35 });
    for (let i = 0; i < 10 / world.timestep; i++) {
      world.step();
      for (const body of [...ribbon.bodies, card]) {
        const position = body.translation();
        assert.ok([position.x, position.y, position.z].every(Number.isFinite));
        assert.ok(Math.abs(position.x) < 12 && Math.abs(position.y) < 12 && Math.abs(position.z) < 12);
      }
    }
    assert.ok(new Vector3().copy(card.translation()).distanceTo(rest) < .04);
    const socket = BADGE_ATTACHMENT.clone().applyQuaternion(new Quaternion().copy(card.rotation())).add(card.translation());
    assert.ok(socket.distanceTo(ribbon.bodies.at(-1).translation()) < .02);
  } finally { world.free(); }
});

const speed = body => {
  const v = body.linvel();
  return Math.hypot(v.x, v.y, v.z);
};

function dragFor({ world, card }, target, seconds) {
  for (let i = 0; i < Math.round(seconds / world.timestep); i++) {
    followBadgeDrag(card, target);
    world.step();
  }
}

test('fast reversals followed by a stretched hold stop vibrating while the pointer stays down', () => {
  for (const target of [{ x: 4, y: 1.5, z: .35 }, { x: -6, y: 0, z: .35 }, { x: 0, y: -4, z: .35 }]) {
    const fixture = setup();
    const { world, card, ribbon } = fixture;
    try {
      card.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
      dragFor(fixture, { x: -6, y: -3, z: .35 }, .5);
      dragFor(fixture, { x: 5, y: 3, z: .35 }, .05);
      dragFor(fixture, target, 1);
      assert.ok(new Vector3().copy(card.translation()).distanceTo(target) < .01, 'the card reaches the full requested stretch');
      let tailSpeed = 0;
      for (let i = 0; i < 5 / world.timestep; i++) {
        followBadgeDrag(card, target);
        world.step();
        if (i >= 4 / world.timestep) tailSpeed = Math.max(tailSpeed, ...ribbon.bodies.map(speed));
      }
      assert.ok(tailSpeed < .03, `held spring must settle: ${tailSpeed}`);
    } finally { world.free(); }
  }
});

test('throwing a stretched spring with real release momentum settles without losing its 3D swing', () => {
  const fixture = setup();
  const { world, card, ribbon, rest } = fixture;
  try {
    card.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    dragFor(fixture, { x: -6, y: -3, z: .35 }, 1);
    dragFor(fixture, { x: 5, y: 2, z: .35 }, .08);
    dragFor(fixture, { x: -5, y: -2, z: .35 }, .08);
    const start = new Vector3().copy(card.translation());
    const target = new Vector3(4, -2, .35);
    const steps = Math.round(.08 / world.timestep);
    for (let i = 1; i <= steps; i++) {
      followBadgeDrag(card, start.clone().lerp(target, i / steps));
      world.step();
    }
    assert.ok(speed(card) > 8, 'release happens during a fast gesture, without zeroing momentum');
    card.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    releaseBadgeMotion(card, true);
    assert.ok(Math.abs(card.angvel().x) > .1 && Math.abs(card.angvel().y) > .1, 'throw retains depth rotation');
    let peak = 0, tailSpeed = 0, tailSpin = 0;
    for (let i = 0; i < 8 / world.timestep; i++) {
      updateBadgeYaw(card);
      world.step();
      const currentSpeed = Math.max(...[card, ...ribbon.bodies].map(speed));
      peak = Math.max(peak, currentSpeed);
      assert.ok(Number.isFinite(currentSpeed));
      if (i >= 7 / world.timestep) {
        tailSpeed = Math.max(tailSpeed, currentSpeed);
        const spin = card.angvel();
        tailSpin = Math.max(tailSpin, Math.hypot(spin.x, spin.y, spin.z));
      }
    }
    assert.ok(peak < 60, `release must not inject explosive velocities: ${peak}`);
    assert.ok(tailSpeed < .06 && tailSpin < .06, `throw settles: speed ${tailSpeed}, spin ${tailSpin}`);
    assert.ok(new Vector3().copy(card.translation()).distanceTo(rest) < .05);
    const socket = BADGE_ATTACHMENT.clone().applyQuaternion(new Quaternion().copy(card.rotation())).add(card.translation());
    assert.ok(socket.distanceTo(ribbon.bodies.at(-1).translation()) < .02);
  } finally { world.free(); }
});
