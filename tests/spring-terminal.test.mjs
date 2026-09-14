import test from 'node:test';
import { CARD_WIDTH, CARD_HEIGHT } from '../js/home/card-dimensions.js';
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { Euler, Quaternion, Vector3 } from 'three';
import { SpringCurve } from '../js/home/spring-curve.js';
import { createCoilGeometry } from '../js/home/spring-coil.js';
import { COIL_NECK_LENGTH, COIL_SWIVEL_SEAT, HARDWARE_ATTACHMENT, createBadgeHardware, updateBadgeHardware } from '../js/home/hardware.js';
import { createSpringRibbon, RIBBON_LENGTH } from '../js/home/spring-ribbon.js';
import { BADGE_PHYSICS_STEP, BADGE_SOLVER_ITERATIONS, followBadgeDrag, releaseBadgeMotion, updateBadgeYaw } from '../js/home/badge-motion.js';

await RAPIER.init();

function terminalCurvature(curve) {
  curve.updateArcLengths();
  const length = curve.getLength(), tail = Math.min(.45, length * .35), step = tail / 60;
  let worst = 0, previous = curve.getTangentAt(1 - tail / length);
  for (let i = 1; i <= 60; i++) {
    const tangent = curve.getTangentAt(1 - tail / length + i * step / length);
    worst = Math.max(worst, previous.angleTo(tangent) / step);
    previous = tangent;
  }
  return worst;
}

function dispose(hardware) {
  const materials = new Set();
  for (const group of [hardware.suspension, hardware.hook, hardware.eyelets]) {
    group.traverse(object => { object.geometry?.dispose(); if (object.material) materials.add(object.material); });
  }
  materials.forEach(material => material.dispose());
}

test('the black terminal follows tension while the D-ring remains independent of card twist', () => {
  const hardware = createBadgeHardware();
  const cardPosition = new Vector3(.4, .3, -.2), springPoint = new Vector3(-.6, 3.5, .4);
  const swing = new Quaternion().setFromEuler(new Euler(.35, 0, -.5));
  let ring, socket;
  try {
    for (let i = 0; i <= 24; i++) {
      const rotation = swing.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), i * Math.PI / 12));
      updateBadgeHardware(hardware, cardPosition, rotation, springPoint);
      hardware.suspension.updateMatrixWorld(true);
      const pivot = COIL_SWIVEL_SEAT.clone().applyQuaternion(hardware.suspension.quaternion).add(hardware.suspension.position);
      const tip = hardware.coilTerminal.localToWorld(new Vector3(0, COIL_NECK_LENGTH, 0));
      assert.ok(tip.distanceTo(hardware.coilSocket) < 1e-10, 'rendered neck meets the spring endpoint');
      assert.ok(Math.abs(pivot.distanceTo(tip) - COIL_NECK_LENGTH) < 1e-10, 'the terminal itself cannot stretch');
      assert.ok(hardware.coilDirection.dot(springPoint.clone().sub(pivot).normalize()) > .999999);
      ring ??= hardware.suspension.quaternion.clone();
      socket ??= hardware.coilSocket.clone();
      assert.ok(1 - Math.abs(ring.dot(hardware.suspension.quaternion)) < 1e-12);
      assert.ok(socket.distanceTo(hardware.coilSocket) < 1e-10);
    }
  } finally { dispose(hardware); }
});

for (const target of [{ x: -4, y: .8, z: .35 }, { x: 4, y: -1, z: .35 }, { x: 1, y: 3.3, z: .35 }]) {
  test(`spring terminal avoids a tight fold during drag and rebound at ${target.x}, ${target.y}`, () => {
    const world = new RAPIER.World({ x: 0, y: -23, z: 0 });
    world.timestep = BADGE_PHYSICS_STEP;
    world.numSolverIterations = BADGE_SOLVER_ITERATIONS;
    const anchor = new Vector3(0, 4.98, 0);
    const card = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, anchor.y - RIBBON_LENGTH - HARDWARE_ATTACHMENT.y, 0).setLinearDamping(3.2).setAngularDamping(4.5));
    world.createCollider(RAPIER.ColliderDesc.cuboid(CARD_WIDTH / 2, CARD_HEIGHT / 2, .045).setMass(1).setCollisionGroups(0), card);
    const { bodies } = createSpringRibbon({ RAPIER, world, anchor, card, attachment: HARDWARE_ATTACHMENT });
    const hardware = createBadgeHardware(), curve = new SpringCurve(bodies.length), coil = createCoilGeometry();
    let worst = 0;
    const inspect = () => {
      updateBadgeHardware(hardware, card.translation(), new Quaternion().copy(card.rotation()), bodies.at(-2).translation());
      curve.update(anchor, bodies, hardware.coilSocket, hardware.coilDirection);
      worst = Math.max(worst, terminalCurvature(curve));
      assert.ok(curve.getPoint(0).distanceTo(anchor) < 1e-10);
      assert.ok(curve.getPoint(1).distanceTo(hardware.coilSocket) < 1e-10);
      assert.ok(curve.getTangent(1).dot(hardware.coilDirection) < -.9999, 'last section enters the neck axially');
      coil.update(curve);
      assert.ok(coil.geometry.attributes.position.array.every(Number.isFinite));
    };
    try {
      for (let i = 0; i < 360; i++) world.step();
      card.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
      for (let i = 0; i < 120; i++) { followBadgeDrag(card, target); world.step(); if (i % 4 === 0) inspect(); }
      card.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      releaseBadgeMotion(card, true);
      for (let i = 0; i < 600; i++) { updateBadgeYaw(card); world.step(); if (i % 4 === 0) inspect(); }
      // The former short fixed guide produces >390 radians/unit in these
      // trajectories, folding the axis back on itself inside the last coil.
      assert.ok(worst < 35, `excessive terminal curvature: ${worst}`);
    } finally { world.free(); coil.geometry.dispose(); dispose(hardware); }
  });
}

test('a fully compressed spring curve keeps its endpoint and finite wire buffers', () => {
  const point = new Vector3(0, 5, 0), up = new Vector3(0, 1, 0);
  const bodies = Array.from({ length: 6 }, () => ({ translation: () => point }));
  const curve = new SpringCurve(6).update(point, bodies, point, up), coil = createCoilGeometry();
  try {
    coil.update(curve);
    assert.ok(curve.getPoint(.5).distanceTo(point) < 1e-10);
    assert.ok(coil.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(coil.geometry.attributes.normal.array.every(Number.isFinite));
  } finally { coil.geometry.dispose(); }
});
