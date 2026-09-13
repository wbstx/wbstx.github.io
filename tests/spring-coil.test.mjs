import test from 'node:test';
import assert from 'node:assert/strict';
import { CatmullRomCurve3, Vector3 } from 'three';
import { createCoilGeometry } from '../js/home/spring-coil.js';

function center(geometry, ring) {
  const positions = geometry.attributes.position;
  return new Vector3().fromBufferAttribute(positions, ring * 11)
    .add(new Vector3().fromBufferAttribute(positions, ring * 11 + 5)).multiplyScalar(.5);
}

test('the coil opens its pitch while keeping both terminals seated and its wire thickness constant', () => {
  const coil = createCoilGeometry();
  const positionBuffer = coil.geometry.attributes.position.array;
  for (const length of [.9, 1.57, 4.5]) {
    const start = new Vector3(0, 5, 0), end = new Vector3(0, 5 - length, 0);
    const curve = new CatmullRomCurve3([start, start.clone().lerp(end, .33), start.clone().lerp(end, .67), end]);
    coil.update(curve);
    assert.equal(coil.geometry.attributes.position.array, positionBuffer, 'Reuse the GPU buffer while moving');
    assert(center(coil.geometry, 0).distanceTo(start) < 1e-6);
    assert(center(coil.geometry, 320).distanceTo(end) < 1e-6);
    let totalAngle = 0, previousAngle;
    for (let i = 1; i < 320; i++) {
      const c = center(coil.geometry, i);
      const angle = Math.atan2(c.z, c.x);
      if (previousAngle !== undefined) totalAngle += Math.atan2(Math.sin(angle - previousAngle), Math.cos(angle - previousAngle));
      previousAngle = angle;
      const vertex = new Vector3().fromBufferAttribute(coil.geometry.attributes.position, i * 11);
      assert(Math.abs(vertex.distanceTo(c) - .024) < 1e-6, 'Wire thickness should not stretch');
      if (i > 24 && i < 296) assert(Math.abs(Math.hypot(c.x, c.z) - .15) < 1e-6);
    }
    assert(Math.abs(totalAngle / (Math.PI * 2) - 11) < .1, 'Stretching must preserve the number of coils');
  }
  coil.geometry.dispose();
});

test('spatial bends and compressed nodes keep coil positions and shading finite', () => {
  const coil = createCoilGeometry();
  for (const points of [
    [[0, 5, 0], [-2, 4.5, .3], [-4, 3.8, 1], [-3, 3, .4]],
    [[0, 5, 0], [.01, 5, .01], [.01, 5, .01], [0, 4.8, 0]],
    [[0, 5, 0], [0, 5, 0], [0, 5, 0], [0, 5, 0]],
  ]) {
    const curve = new CatmullRomCurve3(points.map(p => new Vector3(...p)));
    coil.update(curve);
    assert(coil.geometry.attributes.position.array.every(Number.isFinite));
    const normal = coil.geometry.attributes.normal;
    for (let i = 0; i < normal.count; i++) {
      assert(Math.abs(new Vector3().fromBufferAttribute(normal, i).length() - 1) < 1e-6);
    }
    assert(center(coil.geometry, 0).distanceTo(curve.points[0]) < 1e-6);
    assert(center(coil.geometry, 320).distanceTo(curve.points.at(-1)) < 1e-6);
  }
  coil.geometry.dispose();
});
