import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { frameBadgeCamera } from '../js/home/badge-viewport.js';

function camera() {
  const result = new THREE.PerspectiveCamera(30, 1, .1, 40);
  result.position.set(0, 1.28, 10.8);
  result.lookAt(0, 1.28, 0);
  return result;
}

function screenPoint(camera, viewport, point) {
  const ndc = new THREE.Vector3(...point).project(camera);
  return [viewport.left + (ndc.x + 1) * viewport.width / 2, (1 - ndc.y) * viewport.height / 2];
}

test('full-page projection preserves the column badge size and resting position', () => {
  const viewport = { left: 0, width: 1280, height: 900 };
  const column = { left: 500, width: 680, height: 900 };
  const oldCamera = camera();
  const fullCamera = camera();
  frameBadgeCamera(oldCamera, column, column, false);
  frameBadgeCamera(fullCamera, viewport, column, true);
  for (const point of [[0, 1.5, 0], [-1.24, -.2, .045], [1.24, 3.2, -.045]]) {
    const before = screenPoint(oldCamera, column, point);
    const after = screenPoint(fullCamera, viewport, point);
    before.forEach((value, i) => assert.ok(Math.abs(value - after[i]) < 1e-8));
  }
});

test('a card over the text column stays visible and can be raycast at its screen position', () => {
  const viewport = { left: 0, width: 1280, height: 900 };
  const fullCamera = camera();
  frameBadgeCamera(fullCamera, viewport, { left: 500, width: 680 }, true);
  const card = new THREE.Mesh(new THREE.PlaneGeometry(2.48, 3.48), new THREE.MeshBasicMaterial());
  card.position.set(-4, 1.5, .35);
  card.updateMatrixWorld();
  const center = card.position.clone().project(fullCamera);
  assert.ok(center.x > -1 && center.x < 0, 'card center is in the visible left half');
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(center.x, center.y), fullCamera);
  assert.equal(raycaster.intersectObject(card).length, 1);
  card.geometry.dispose();
  card.material.dispose();
});

test('switching to mobile clears the desktop offset and recenters the badge', () => {
  const result = camera();
  frameBadgeCamera(result, { left: 0, width: 1440, height: 900 }, { left: 600, width: 750 }, true);
  const mobile = { left: 0, width: 390, height: 600 };
  frameBadgeCamera(result, mobile, mobile, false);
  assert.equal(result.view.enabled, false);
  assert.equal(result.position.z, 11.9);
  assert.ok(Math.abs(screenPoint(result, mobile, [0, 1.5, 0])[0] - 195) < 1e-8);
});
