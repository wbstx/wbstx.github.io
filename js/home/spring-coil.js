import * as THREE from 'three';

const COIL_RADIUS = .15;
const WIRE_RADIUS = .024;
const TURNS = 11;

export function createCoilMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#080a0c', metalness: .48, roughness: .3,
    clearcoat: .28, clearcoatRoughness: .25, envMapIntensity: .75,
  });
}

// Transport a frame along the bending spring axis, then a second frame along
// its helical wire. Both buffers stay allocated while the spring deforms.
export function createCoilGeometry({ segments = 320, radialSegments = 10 } = {}) {
  const geometry = new THREE.BufferGeometry();
  const stride = radialSegments + 1;
  const positions = new Float32Array((segments + 1) * stride * 3);
  const normals = new Float32Array(positions.length);
  const centers = Array.from({ length: segments + 1 }, () => new THREE.Vector3());
  const indices = [];
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j, b = a + stride;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);

  const tangent = new THREE.Vector3();
  const previous = new THREE.Vector3();
  const across = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const transport = new THREE.Quaternion();

  function orient(first) {
    if (tangent.lengthSq() < 1e-12) {
      if (first) tangent.set(0, -1, 0);
      else tangent.copy(previous);
    }
    tangent.normalize();
    if (first) {
      across.set(Math.abs(tangent.x) < .9 ? 1 : 0, Math.abs(tangent.x) < .9 ? 0 : 1, 0);
    } else across.applyQuaternion(transport.setFromUnitVectors(previous, tangent));
    across.addScaledVector(tangent, -across.dot(tangent)).normalize();
    binormal.crossVectors(tangent, across).normalize();
    previous.copy(tangent);
  }

  function update(curve) {
    // Even spacing by arc length prevents the short terminal guide points
    // from bunching several turns into the final few millimeters.
    curve.updateArcLengths();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      curve.getPointAt(t, centers[i]);
      curve.getTangentAt(t, tangent);
      orient(i === 0);
      // Short straight ends seat inside the terminal instead of orbiting it.
      const end = Math.min(1, t / .065, (1 - t) / .065);
      const radius = COIL_RADIUS * end * end * (3 - 2 * end);
      const angle = t * Math.PI * 2 * TURNS;
      centers[i].addScaledVector(across, Math.cos(angle) * radius)
        .addScaledVector(binormal, Math.sin(angle) * radius);
    }
    for (let i = 0; i <= segments; i++) {
      tangent.subVectors(centers[Math.min(i + 1, segments)], centers[Math.max(i - 1, 0)]);
      orient(i === 0);
      for (let j = 0; j <= radialSegments; j++) {
        const angle = j / radialSegments * Math.PI * 2;
        normal.copy(across).multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle));
        const offset = (i * stride + j) * 3;
        normal.toArray(normals, offset);
        positions[offset] = centers[i].x + normal.x * WIRE_RADIUS;
        positions[offset + 1] = centers[i].y + normal.y * WIRE_RADIUS;
        positions[offset + 2] = centers[i].z + normal.z * WIRE_RADIUS;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
  }
  return { geometry, update };
}
