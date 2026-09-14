import * as THREE from 'three';
import { createCoilMaterial } from './spring-coil.js';
import { CARD_HEIGHT } from './card-dimensions.js';

// Dimensions are in the card's local frame. The eyelet is shared with the
// card cutout. A black eye terminal links the spring to the D-ring's top bar.
// The metal was modeled around a 3.48-high card; move it with the top edge.
const hardwareOffset = CARD_HEIGHT / 2 - 1.74;
export const CARD_EYELET = { y: CARD_HEIGHT / 2 - .22, radius: .077 };
export const HARDWARE_ATTACHMENT = new THREE.Vector3(0, 2.84 + hardwareOffset, 0);
export const SWIVEL_PIVOT = new THREE.Vector3(0, 2.43 + hardwareOffset, 0);
export const STRAP_SEAT = HARDWARE_ATTACHMENT.clone().sub(SWIVEL_PIVOT);
export const COIL_SEAT = STRAP_SEAT.clone().add(new THREE.Vector3(0, .107, 0));
export const COIL_SWIVEL_SEAT = STRAP_SEAT.clone().add(new THREE.Vector3(0, .06, 0));
export const COIL_NECK_LENGTH = .047;

const up = new THREE.Vector3(0, 1, 0);
const swivelAxis = new THREE.Vector3();
const coilPivot = new THREE.Vector3();
const coilRotation = new THREE.Quaternion();

// The two halves share an axis and pivot, but only the lower hook inherits
// the card's twist. Swinging still tilts the D-ring with the loaded strap.
export function updateBadgeHardware(hardware, cardPosition, cardRotation, springPoint) {
  const { suspension, coilTerminal, coilSocket, coilDirection } = hardware;
  swivelAxis.copy(up).applyQuaternion(cardRotation);
  suspension.quaternion.setFromUnitVectors(up, swivelAxis);
  suspension.position.copy(SWIVEL_PIVOT).applyQuaternion(cardRotation).add(cardPosition);
  // A small ball joint lets the spring follow tension without inheriting the
  // card's tilt at its very last millimeters. The D-ring stays on its swivel.
  coilPivot.copy(COIL_SWIVEL_SEAT).applyQuaternion(suspension.quaternion).add(suspension.position);
  if (springPoint) coilDirection.copy(springPoint).sub(coilPivot);
  else coilDirection.copy(swivelAxis);
  if (coilDirection.lengthSq() < 1e-8) coilDirection.copy(swivelAxis);
  coilDirection.normalize();
  coilRotation.setFromUnitVectors(up, coilDirection);
  coilTerminal.quaternion.copy(suspension.quaternion).invert().multiply(coilRotation);
  coilSocket.copy(coilPivot).addScaledVector(coilDirection, COIL_NECK_LENGTH);
}

function tube(points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y + hardwareOffset, z)), closed, 'centripetal');
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

  // Flat-topped D-ring: the spring terminal loops around its horizontal bar.
  const path = new THREE.CurvePath();
  const v = (x, y) => new THREE.Vector3(x, y + hardwareOffset, 0);
  path.add(new THREE.LineCurve3(v(-.245, 2.84), v(.245, 2.84)));
  path.add(new THREE.LineCurve3(v(.245, 2.84), v(.245, 2.69)));
  path.add(new THREE.QuadraticBezierCurve3(v(.245, 2.69), v(.245, 2.51), v(0, 2.51)));
  path.add(new THREE.QuadraticBezierCurve3(v(0, 2.51), v(-.245, 2.51), v(-.245, 2.69)));
  path.add(new THREE.LineCurve3(v(-.245, 2.69), v(-.245, 2.84)));
  upper.add(new THREE.Mesh(new THREE.TubeGeometry(path, 80, .028, 14, true), nickel));

  // The spindle and its two collars make the swivel visibly distinct from
  // both the ring and the spring hook.
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .16, 24), nickel);
  housing.position.set(0, 2.45 + hardwareOffset, 0);
  upper.add(housing);
  const upperCollar = new THREE.Mesh(new THREE.CylinderGeometry(.074, .074, .035, 24), brushed);
  upperCollar.position.set(0, 2.50 + hardwareOffset, 0);
  upper.add(upperCollar);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.047, .047, .14, 24), nickel);
  spindle.position.set(0, 2.37 + hardwareOffset, 0);
  hook.add(spindle);
  const lowerCollar = new THREE.Mesh(new THREE.CylinderGeometry(.070, .070, .035, 24), brushed);
  lowerCollar.position.set(0, 2.34 + hardwareOffset, 0);
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
  hinge.position.set(0, 2.30 + hardwareOffset, 0);
  hook.add(hinge);
  const thumbLever = new THREE.Mesh(new THREE.CapsuleGeometry(.031, .12, 4, 12), nickel);
  thumbLever.position.set(-.13, 2.235 + hardwareOffset, .035);
  thumbLever.rotation.z = -.8;
  hook.add(thumbLever);

  for (const z of [-.058, .058]) {
    const eyelet = new THREE.Mesh(new THREE.TorusGeometry(.088, .018, 10, 40), brushed);
    eyelet.position.set(0, CARD_EYELET.y, z);
    eyelets.add(eyelet);
  }

  const black = createCoilMaterial();
  const terminalEye = new THREE.Mesh(new THREE.TorusGeometry(.053, .015, 10, 32), black);
  terminalEye.name = 'Black spring eye around D-ring';
  terminalEye.rotation.y = Math.PI / 2;
  terminalEye.position.set(0, 2.84 + hardwareOffset, 0);
  upper.add(terminalEye);
  const coilTerminal = new THREE.Group();
  coilTerminal.name = 'Spring terminal ball joint';
  coilTerminal.position.copy(COIL_SWIVEL_SEAT).add(SWIVEL_PIVOT);
  coilTerminal.add(new THREE.Mesh(new THREE.SphereGeometry(.032, 16, 12), black));
  const terminal = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, COIL_NECK_LENGTH, 20), black);
  terminal.name = 'Black spring terminal';
  terminal.position.y = COIL_NECK_LENGTH / 2;
  coilTerminal.add(terminal);
  upper.add(coilTerminal);
  return { hook, eyelets, suspension, coilTerminal, coilSocket: new THREE.Vector3(), coilDirection: up.clone() };
}
