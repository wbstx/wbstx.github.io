import * as THREE from 'three';

// Dimensions are in the card's local frame. The eyelet is shared with the
// card cutout, and the folded strap seats on the D-ring's straight top bar.
export const CARD_EYELET = { y: 1.52, radius: .077 };
export const HARDWARE_ATTACHMENT = new THREE.Vector3(0, 2.84, 0);
export const SWIVEL_PIVOT = new THREE.Vector3(0, 2.43, 0);
export const STRAP_SEAT = HARDWARE_ATTACHMENT.clone().sub(SWIVEL_PIVOT);

const up = new THREE.Vector3(0, 1, 0);
const swivelAxis = new THREE.Vector3();

// The two halves share an axis and pivot, but only the lower hook inherits
// the card's twist. Swinging still tilts the D-ring with the loaded strap.
export function updateBadgeHardware(hardware, cardPosition, cardRotation) {
  const { suspension } = hardware;
  swivelAxis.copy(up).applyQuaternion(cardRotation);
  suspension.quaternion.setFromUnitVectors(up, swivelAxis);
  suspension.position.copy(SWIVEL_PIVOT).applyQuaternion(cardRotation).add(cardPosition);
}

function tube(points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 14, closed), material);
}

export function createBadgeHardware() {
  const hook = new THREE.Group();
  hook.name = 'Card-side spring hook';
  const eyelets = new THREE.Group();
  eyelets.name = 'Front and back eyelet rims';
  const suspension = new THREE.Group();
  suspension.name = 'Strap-side D-ring and swivel housing';
  const upper = new THREE.Group();
  upper.position.copy(SWIVEL_PIVOT).negate();
  suspension.add(upper);
  const nickel = new THREE.MeshPhysicalMaterial({ color: '#c8c3b6', metalness: .98, roughness: .23, clearcoat: .35, envMapIntensity: 1.8 });
  const brushed = new THREE.MeshStandardMaterial({ color: '#8c8a80', metalness: .9, roughness: .35, envMapIntensity: 1.5 });

  // Flat-topped D-ring: the black strap folds over its horizontal bar.
  const path = new THREE.CurvePath();
  const v = (x, y) => new THREE.Vector3(x, y, 0);
  path.add(new THREE.LineCurve3(v(-.245, 2.84), v(.245, 2.84)));
  path.add(new THREE.LineCurve3(v(.245, 2.84), v(.245, 2.69)));
  path.add(new THREE.QuadraticBezierCurve3(v(.245, 2.69), v(.245, 2.51), v(0, 2.51)));
  path.add(new THREE.QuadraticBezierCurve3(v(0, 2.51), v(-.245, 2.51), v(-.245, 2.69)));
  path.add(new THREE.LineCurve3(v(-.245, 2.69), v(-.245, 2.84)));
  upper.add(new THREE.Mesh(new THREE.TubeGeometry(path, 80, .028, 14, true), nickel));

  // The spindle and its two collars make the swivel visibly distinct from
  // both the ring and the spring hook.
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .16, 24), nickel);
  housing.position.set(0, 2.45, 0);
  upper.add(housing);
  const upperCollar = new THREE.Mesh(new THREE.CylinderGeometry(.074, .074, .035, 24), brushed);
  upperCollar.position.set(0, 2.50, 0);
  upper.add(upperCollar);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.047, .047, .14, 24), nickel);
  spindle.position.set(0, 2.37, 0);
  hook.add(spindle);
  const lowerCollar = new THREE.Mesh(new THREE.CylinderGeometry(.070, .070, .035, 24), brushed);
  lowerCollar.position.set(0, 2.34, 0);
  hook.add(lowerCollar);

  // A continuous loop links the card: front leg, straight passage through
  // the eyelet along Z, back leg, then the spring gate above the top edge.
  // Keep the through-hole section centered and perpendicular to the card;
  // both outside legs clear the card faces and the raised metal eyelet.
  const spine = tube([
    [0, 2.30, 0], [-.075, 2.23, .045], [-.15, 2.08, .13],
    [-.16, 1.88, .19], [-.14, 1.77, .20], [-.09, 1.60, .21],
    [-.02, 1.535, .205], [0, 1.515, .18], [0, 1.515, .09],
    [0, 1.515, 0], [0, 1.515, -.09], [0, 1.515, -.18],
    [.07, 1.63, -.20], [.115, 1.84, -.14],
  ], .038, nickel);
  spine.name = 'Continuous hook through the eyelet';
  hook.add(spine);
  const gate = tube([
    [0, 2.30, 0], [.067, 2.17, -.045], [.125, 1.99, -.105], [.115, 1.84, -.14],
  ], .024, nickel);
  gate.name = 'Spring gate';
  hook.add(gate);
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.048, .048, .075, 20), brushed);
  hinge.rotation.x = Math.PI / 2;
  hinge.position.set(0, 2.30, 0);
  hook.add(hinge);
  const thumbLever = new THREE.Mesh(new THREE.CapsuleGeometry(.031, .12, 4, 12), nickel);
  thumbLever.position.set(-.13, 2.235, .035);
  thumbLever.rotation.z = -.8;
  hook.add(thumbLever);

  for (const z of [-.058, .058]) {
    const eyelet = new THREE.Mesh(new THREE.TorusGeometry(.088, .018, 10, 40), brushed);
    eyelet.position.set(0, CARD_EYELET.y, z);
    eyelets.add(eyelet);
  }

  const strapEnd = new THREE.Mesh(new THREE.BoxGeometry(.41, .17, .038), new THREE.MeshStandardMaterial({ color: '#161719', roughness: 1 }));
  strapEnd.position.set(0, 2.84, .025);
  upper.add(strapEnd);
  // Two small stitches across the folded end, echoing the supplied hardware.
  const thread = new THREE.MeshBasicMaterial({ color: '#5b6068' });
  for (const y of [2.885, 2.90]) {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(.35, .006, .003), thread);
    seam.position.set(0, y, .046);
    upper.add(seam);
  }
  return { hook, eyelets, suspension };
}
