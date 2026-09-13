import test from 'node:test';
import assert from 'node:assert/strict';
import { Quaternion, Vector3 } from 'three';
import { startBadgeEntrance } from '../js/home/entrance.js';
import { BADGE_ATTACHMENT } from '../js/home/lanyard.js';

function body() {
  return {
    position: new Vector3(), velocity: new Vector3(), rotation: new Quaternion(), spin: new Vector3(),
    setTranslation(v) { this.position.copy(v); },
    setLinvel(v) { this.velocity.copy(v); },
    setRotation(q) { this.rotation.copy(q); },
    setAngvel(v) { this.spin.copy(v); },
    setLinearDamping() {}, setAngularDamping() {},
  };
}

test('the spatial entrance preserves rope lengths, attachment, and joint velocity', () => {
  for (const narrow of [false, true]) {
    const anchor = new Vector3(0, 4.98, 0);
    const segmentLength = .56;
    const bodies = Array.from({ length: 3 }, body);
    const rigidCard = body();
    const rest = new Vector3(0, anchor.y - 3 * segmentLength - BADGE_ATTACHMENT.y, 0);
    startBadgeEntrance({ bodies, rigidCard, anchor, rest, segmentLength, narrow });
    let previous = anchor;
    for (const joint of bodies) {
      assert.ok(Math.abs(joint.position.distanceTo(previous) - segmentLength) < 1e-10);
      previous = joint.position;
    }
    const attachment = BADGE_ATTACHMENT.clone().applyQuaternion(rigidCard.rotation);
    assert.ok(attachment.clone().add(rigidCard.position).distanceTo(bodies[2].position) < 1e-10);
    const jointVelocity = new Vector3().crossVectors(rigidCard.spin, attachment).add(rigidCard.velocity);
    assert.ok(jointVelocity.distanceTo(bodies[2].velocity) < 1e-10);
    assert.ok(Math.abs(rigidCard.position.z) > .2, 'the swing starts out of the screen plane');
    assert.ok(Math.abs(rigidCard.velocity.z) > .2, 'the swing has depth momentum');
    assert.ok(Math.abs(rigidCard.spin.x) > 0 && Math.abs(rigidCard.spin.y) > 0);
    assert.ok(Math.abs(rigidCard.position.z) < .65, 'depth remains restrained');
  }
});
