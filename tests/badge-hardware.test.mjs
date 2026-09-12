import test from 'node:test';
import assert from 'node:assert/strict';
import { CatmullRomCurve3, Euler, Quaternion, Vector3 } from 'three';
import { CARD_EYELET, HARDWARE_ATTACHMENT, STRAP_SEAT, SWIVEL_PIVOT, createBadgeHardware, updateBadgeHardware } from '../js/home/hardware.js';
import { STRAP_HALF_WIDTH, writeRibbonPositions } from '../js/home/lanyard.js';

test('the continuous hook crosses the eyelet, clearing the card on both faces', () => {
  const { hook } = createBadgeHardware();
  const spine = hook.getObjectByName('Continuous hook through the eyelet');
  const vertices = spine.geometry.attributes.position;
  let inHole = 0, front = 0, back = 0;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    assert([x, y, z].every(Number.isFinite));
    if (y >= 1.74) continue;
    if (z > .08) front++;
    if (z < -.08) back++;
    // Include the raised eyelet rims, which extend beyond the card faces.
    if (Math.abs(z) <= .077) {
      assert(Math.hypot(x, y - CARD_EYELET.y) < .070,
        `Hook intersects card or eyelet at ${[x, y, z]}`);
      inHole++;
    }
  }
  assert(inHole > 30, 'The hook must pass through the aperture');
  assert(front > 50 && back > 50, 'Both faces need an exposed hook leg');
  const path = spine.geometry.parameters.path;
  let crossings = 0;
  let previous = path.getPoint(0);
  for (let i = 1; i <= 1024; i++) {
    const point = path.getPoint(i / 1024);
    if (previous.z > 0 && point.z <= 0 && point.y < 1.74) crossings++;
    previous = point;
  }
  assert.equal(crossings, 1, 'One continuous metal section threads the hole');
});

test('flipping around the swivel leaves the D-ring and ribbon untwisted', () => {
  const hardware = createBadgeHardware();
  const pivot = new Vector3(.4, .3, -.2);
  const up = new Vector3(0, 1, 0);
  const segments = 48;
  const positions = new Float32Array((segments + 1) * 6);
  for (const tilt of [[0, 0], [.25, -.5], [-.45, .35], [.8, -.7]]) {
    const swing = new Quaternion().setFromEuler(new Euler(tilt[0], 0, tilt[1]));
    let referenceRotation, referenceRibbon;
    for (let step = 0; step <= 72; step++) {
      const twist = new Quaternion().setFromAxisAngle(up, step * Math.PI / 36);
      const cardRotation = swing.clone().multiply(twist);
      updateBadgeHardware(hardware, pivot, cardRotation);
      const suspension = hardware.suspension;
      const socket = STRAP_SEAT.clone().applyQuaternion(suspension.quaternion).add(suspension.position);
      const physicsSocket = HARDWARE_ATTACHMENT.clone().applyQuaternion(cardRotation).add(pivot);
      assert(socket.distanceTo(physicsSocket) < 1e-10);
      const lowerPivot = SWIVEL_PIVOT.clone().applyQuaternion(cardRotation).add(pivot);
      assert(lowerPivot.distanceTo(suspension.position) < 1e-10);
      if (!referenceRotation) referenceRotation = suspension.quaternion.clone();
      assert(1 - Math.abs(referenceRotation.dot(suspension.quaternion)) < 1e-12,
        'Card twist leaked into the D-ring');

      const curve = new CatmullRomCurve3([
        new Vector3(0, 4.98, 0), new Vector3(0, 4.42, 0),
        socket.clone().add(new Vector3(0, .7, 0)),
        new Vector3(0, .18, 0).applyQuaternion(suspension.quaternion).add(socket), socket,
      ]);
      writeRibbonPositions(curve, suspension.quaternion, positions, segments);
      if (!referenceRibbon) referenceRibbon = positions.slice();
      for (let i = 0; i < positions.length; i++) assert(Math.abs(positions[i] - referenceRibbon[i]) < 1e-6);
      for (let i = 0; i <= segments; i++) {
        const left = new Vector3().fromArray(positions, i * 6);
        const right = new Vector3().fromArray(positions, i * 6 + 3);
        assert(Math.abs(left.distanceTo(right) - STRAP_HALF_WIDTH * 2) < 1e-6);
        if (i === segments) assert(left.add(right).multiplyScalar(.5).distanceTo(socket) < 1e-6);
      }
    }
  }
});
