import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createCardTextures } from './card-textures.js';
import { CARD_WIDTH, CARD_HEIGHT } from './card-dimensions.js';
import { BADGE_ATTACHMENT } from './lanyard.js';
import { CARD_EYELET, createBadgeHardware, updateBadgeHardware } from './hardware.js';
import { ENTRANCE_DURATION, startBadgeEntrance, updateEntranceDamping } from './entrance.js';
import { frameBadgeCamera } from './badge-viewport.js';
import { createFlipPeek } from './flip-peek.js';
import { createSpringRibbon, RIBBON_LENGTH } from './spring-ribbon.js';
import { createCoilGeometry, createCoilMaterial } from './spring-coil.js';
import { SpringCurve } from './spring-curve.js';
import { BADGE_PHYSICS_STEP, BADGE_SOLVER_ITERATIONS, followBadgeDrag, releaseBadgeMotion, updateBadgeYaw } from './badge-motion.js';

const stage = document.querySelector('#badge-stage');
const mount = document.querySelector('#badge-canvas');
const hero = stage.closest('.hero');
const column = stage.closest('.badge-column');
const desktopLayout = matchMedia('(min-width: 901px)');
const sideStatus = document.querySelector('#card-side');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

// Keep the existing publication previews local and load their animations only
// when they are visible. Reduced-motion visitors retain the still images.
const previews = new IntersectionObserver(entries => {
  for (const { isIntersecting, target } of entries) {
    if (!isIntersecting || motionPreference.matches) continue;
    const image = new Image();
    image.onload = () => { target.src = image.src; };
    image.src = target.dataset.animatedSrc;
    previews.unobserve(target);
  }
}, { rootMargin: '150px' });
document.querySelectorAll('[data-animated-src]').forEach(image => previews.observe(image));

function showFallback() {
  stage.classList.remove('is-ready');
  stage.setAttribute('aria-busy', 'false');
  mount.hidden = true;
  sideStatus.textContent = 'The interactive card is unavailable. Profile information is shown alongside it.';
}

function roundedShape(width, height, radius, slot = false) {
  const x = -width / 2, y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  if (slot) {
    const hole = new THREE.Path();
    hole.absarc(0, CARD_EYELET.y, CARD_EYELET.radius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

async function init(beforeReveal) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(THREE.MathUtils.clamp(devicePixelRatio, 2, 3));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const canvas = renderer.domElement;
  canvas.tabIndex = -1;
  canvas.setAttribute('role', 'button');
  canvas.setAttribute('aria-label', 'Turn Xiao Tang’s profile card');
  canvas.setAttribute('aria-pressed', 'false');
  canvas.setAttribute('aria-keyshortcuts', 'Enter Space R');
  canvas.setAttribute('aria-description', 'Press Enter or Space to turn over. Press R to return the card to its resting position.');
  mount.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 40);
  camera.position.set(0, 1.28, 10.8);
  camera.lookAt(0, 1.28, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .45;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#ffffff', '#627581', .75));
  const key = new THREE.DirectionalLight('#ffffff', 1.4);
  key.position.set(-4, 6, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#c2d9ec', 1.8);
  rim.position.set(5, 2, -3);
  scene.add(rim);

  const [textures, { default: RAPIER }] = await Promise.all([
    createCardTextures(renderer.capabilities.getMaxAnisotropy()),
    import('@dimforge/rapier3d-compat'),
  ]);
  await RAPIER.init();
  // Fetch and decode assets alongside the loader; start the entrance after its first cycle.
  await beforeReveal;
  const world = new RAPIER.World({ x: 0, y: -23, z: 0 });
  world.numSolverIterations = BADGE_SOLVER_ITERATIONS;
  world.timestep = BADGE_PHYSICS_STEP;

  const width = CARD_WIDTH, height = CARD_HEIGHT;
  const shape = roundedShape(width, height, .075, true);
  const card = new THREE.Group();
  scene.add(card);
  const edgeGeometry = new THREE.ExtrudeGeometry(shape, { depth: .05, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .017, bevelThickness: .017, curveSegments: 24 });
  const edgePosition = edgeGeometry.attributes.position;
  const edgeUV = edgeGeometry.attributes.uv;
  for (let i = 0; i < edgeUV.count; i++) edgeUV.setXY(i, (edgePosition.getX(i) + width / 2) / width, (edgePosition.getY(i) + height / 2) / height);
  // A gently varying thin film adds angle-dependent color only to the bevel.
  const filmThickness = new THREE.DataTexture(new Uint8Array([
    0, 0, 0, 255,       80, 80, 80, 255,
    175, 175, 175, 255, 255, 255, 255, 255,
  ]), 2, 2);
  filmThickness.minFilter = THREE.LinearFilter;
  filmThickness.magFilter = THREE.LinearFilter;
  filmThickness.needsUpdate = true;
  const edge = new THREE.Mesh(edgeGeometry, new THREE.MeshPhysicalMaterial({
    color: '#667078', metalness: .45, roughness: .25,
    clearcoat: .12, clearcoatRoughness: .22,
    iridescence: 1, iridescenceIOR: 1.45,
    iridescenceThicknessRange: [180, 480], iridescenceThicknessMap: filmThickness,
  }));
  edge.position.z = -.025;
  card.add(edge);
  const faceGeometry = new THREE.ShapeGeometry(shape, 32);
  const position = faceGeometry.attributes.position;
  const uv = faceGeometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (position.getX(i) + width / 2) / width, (position.getY(i) + height / 2) / height);
  const faces = textures.faces.map((map, index) => {
    // Printed matte stock: keep broad white reflections off the small type.
    const face = new THREE.Mesh(faceGeometry, new THREE.MeshPhysicalMaterial({ map, roughness: .94, metalness: 0, clearcoat: 0, specularIntensity: .08, envMapIntensity: .05 }));
    face.position.z = index === 0 ? .045 : -.045;
    face.rotation.y = index === 0 ? 0 : Math.PI;
    card.add(face);
    return face;
  });

  if (textures.portrait) {
    const photo = textures.portrait;
    const portrait = new THREE.Mesh(
      new THREE.PlaneGeometry(photo.width * width, photo.height * height),
      // A subdued photographic print. Preserve skin-tone detail independently of
      // the studio lights and ACES curve used by the card and metal hardware.
      new THREE.MeshBasicMaterial({ map: photo.map, color: '#e3e3e3', toneMapped: false }),
    );
    portrait.position.set(
      (photo.x + photo.width / 2 - .5) * width,
      (.5 - photo.y - photo.height / 2) * height,
      .001,
    );
    faces[1].add(portrait);
  }

  const hardware = createBadgeHardware();
  card.add(hardware.hook, hardware.eyelets);
  // The strap-side housing rotates independently around the swivel axis.
  scene.add(hardware.suspension);

  // An actual round-wire helix follows the damped spring chain. The number of
  // turns stays fixed while the spacing opens and closes with its extension.
  const coilGeometry = createCoilGeometry();
  const coil = new THREE.Mesh(coilGeometry.geometry, createCoilMaterial());
  coil.name = 'Black helical suspension spring';
  coil.frustumCulled = false;
  scene.add(coil);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const s = shadowCanvas.getContext('2d');
  const gradient = s.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#000000a0');
  gradient.addColorStop(.35, '#00000060');
  gradient.addColorStop(1, '#00000000');
  s.fillStyle = gradient; s.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false, opacity: .5 }));
  shadow.position.set(.18, -1.48, -.55);
  scene.add(shadow);

  const origin = { x: 0, y: 0, z: 0 };
  const anchorPosition = { x: 0, y: 4.98, z: 0 };
  const rest = { x: 0, y: anchorPosition.y - RIBBON_LENGTH - BADGE_ATTACHMENT.y, z: 0 };
  shadow.position.y = rest.y - height / 2 - .2;
  const rigidCard = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(rest.x, rest.y, rest.z).setLinearDamping(3.2).setAngularDamping(4.5));
  world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, height / 2, .045).setMass(1).setCollisionGroups(0), rigidCard);
  const springRibbon = createSpringRibbon({ RAPIER, world, anchor: anchorPosition, card: rigidCard, attachment: BADGE_ATTACHMENT });
  const { bodies, segmentLength } = springRibbon;

  let back = false;
  let pointerId = null;
  let down = null;
  let moved = false;
  let inView = true;
  let stopped = false;
  let previousTime = 0;
  let accumulator = 0;
  let frame = 0;
  let entranceElapsed = null;
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const dragPoint = new THREE.Vector3();
  const dragOffset = new THREE.Vector3();
  const dragTarget = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const curve = new SpringCurve(bodies.length);
  let cardClickPointer = null;
  const flipPeek = createFlipPeek({ disabled: motionPreference.matches });

  function setHover(hovered) {
    canvas.classList.toggle('is-hovered', hovered);
    hero.classList.toggle('is-badge-hovered', hovered);
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
  }

  function cardHit(event) {
    if (stopped || !inView || mount.hidden) return;
    const rect = canvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    setPointer(event);
    return raycaster.intersectObjects(faces, false)[0];
  }

  function updateTarget(event) {
    setPointer(event);
    if (!raycaster.ray.intersectPlane(dragPlane, dragPoint)) return;
    dragTarget.copy(dragPoint).sub(dragOffset);
    // Small screens keep the card in reach; desktop dragging uses the full page.
    if (!desktopLayout.matches) {
      const horizontal = Math.min(2.5, camera.aspect * 2.4);
      const damp = (value, min, max) => value < min ? min + Math.tanh(value - min) * .2 : value > max ? max + Math.tanh(value - max) * .2 : value;
      dragTarget.x = damp(dragTarget.x, -horizontal, horizontal);
      dragTarget.y = damp(dragTarget.y, .15, 3.3);
    }
    dragTarget.z = .35;
  }

  function endDrag(cancelled = false) {
    if (pointerId === null) return;
    const oldPointer = pointerId;
    pointerId = null;
    if (canvas.hasPointerCapture(oldPointer)) canvas.releasePointerCapture(oldPointer);
    canvas.classList.remove('is-dragging');
    hero.classList.remove('is-badge-dragging');
    setHover(false);
    rigidCard.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    const spatialThrow = moved && !cancelled && !motionPreference.matches;
    releaseBadgeMotion(rigidCard, spatialThrow);
    if (motionPreference.matches) resetPosition();
    if (!cancelled && !moved) flip(false);

  }

  function stopEntrance() {
    entranceElapsed = null;
    updateEntranceDamping(rigidCard, ENTRANCE_DURATION);
    stage.dataset.entrance = 'complete';
  }

  function resetPosition() {
    stopEntrance();
    rigidCard.setTranslation(rest, true);
    rigidCard.setLinvel(origin, true);
    rigidCard.setAngvel(origin, true);
    rigidCard.setRotation(quat.setFromEuler(euler.set(0, back ? Math.PI : -.08, 0)), true);
    springRibbon.reset();
  }

  function flip(instant = false) {
    flipPeek.cancel();
    stopEntrance();
    back = !back;
    canvas.setAttribute('aria-pressed', String(back));
    sideStatus.textContent = back ? 'Back of card: Xiao Tang, senior graphics engineer. Interests: computer graphics, 3D reconstruction, VR/AR and human-computer interaction. Education: Ph.D. at CUHK; B.Eng. at USTC.' : 'Front of card: Xiao Tang, senior graphics engineer at Huawei.';
    if (instant || motionPreference.matches) {
      rigidCard.setRotation(quat.setFromEuler(euler.set(0, back ? Math.PI : -.08, 0)), true);
      rigidCard.setAngvel(origin, true);
    } else rigidCard.wakeUp();
  }

  // The desktop canvas is transparent to DOM hit testing. Only a ray hit on the
  // card captures input, so links and scrolling still work through empty space.
  hero.addEventListener('pointerdown', event => {
    if (pointerId !== null || !event.isPrimary || event.button !== 0) return;
    cardClickPointer = null;
    const hit = cardHit(event);
    if (!hit) return;
    flipPeek.cancel();
    stopEntrance();
    event.preventDefault();
    event.stopPropagation();
    pointerId = event.pointerId;
    cardClickPointer = pointerId;
    down = { x: event.clientX, y: event.clientY };
    moved = false;
    dragPlane.constant = -hit.point.z;
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
    dragOffset.copy(dragPoint).sub(rigidCard.translation());
    dragTarget.copy(rigidCard.translation());
    rigidCard.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    canvas.setPointerCapture(pointerId);
    canvas.classList.add('is-dragging');
    hero.classList.add('is-badge-dragging');
    setHover(true);

  }, { capture: true });
  hero.addEventListener('pointermove', event => {
    if (pointerId !== null) {
      if (event.pointerId !== pointerId) return;
      moved ||= Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5;
      if (moved) updateTarget(event);
    } else {
      setHover(!!cardHit(event));
    }
  });
  hero.addEventListener('pointerup', event => { if (event.pointerId === pointerId) endDrag(); });
  hero.addEventListener('pointercancel', event => { if (event.pointerId === pointerId) endDrag(true); });
  canvas.addEventListener('lostpointercapture', () => endDrag(true));
  hero.addEventListener('pointerleave', () => { if (pointerId === null) setHover(false); });
  hero.addEventListener('click', event => {
    if (event.detail === 0 || event.pointerId !== cardClickPointer) return;
    // A card covering a link must not activate the link when released.
    event.preventDefault();
    event.stopPropagation();
    cardClickPointer = null;
  }, { capture: true });
  // Prevent scrolling only for a touch that actually grabs the card.
  hero.addEventListener('touchstart', event => { if (pointerId !== null && event.cancelable) event.preventDefault(); }, { passive: false, capture: true });
  hero.addEventListener('touchmove', event => { if (pointerId !== null && event.cancelable) event.preventDefault(); }, { passive: false, capture: true });
  canvas.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(true); }
    if (event.key === 'Escape') endDrag(true);
    if (event.key.toLowerCase() === 'r') { event.preventDefault(); flipPeek.cancel(); endDrag(true); resetPosition(); }
  });

  function resize() {
    endDrag(true);
    const viewport = mount.getBoundingClientRect();
    const { width: w, height: h } = viewport;
    if (!w || !h) return;
    // Supersample fine print even on 1× displays, and re-check density
    // when the window moves between displays or is zoomed.
    renderer.setPixelRatio(THREE.MathUtils.clamp(devicePixelRatio, 2, 3));
    renderer.setSize(w, h, false);
    frameBadgeCamera(camera, viewport, column.getBoundingClientRect(), desktopLayout.matches);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  window.addEventListener('resize', resize);
  resize();

  function draw() {
    card.position.copy(rigidCard.translation());
    card.quaternion.copy(rigidCard.rotation());
    updateBadgeHardware(hardware, card.position, card.quaternion, bodies.at(-2).translation());
    curve.update(anchorPosition, bodies, hardware.coilSocket, hardware.coilDirection);
    coilGeometry.update(curve);
    shadow.position.x = card.position.x * .55 + .12;
    shadow.material.opacity = THREE.MathUtils.clamp(.5 - (card.position.y - rest.y) * .16, .12, .5);
    renderer.render(scene, camera);
  }

  function animate(time) {
    frame = 0;
    if (stopped || !inView || document.hidden) return;
    const delta = previousTime ? Math.min((time - previousTime) / 1000, .05) : 1 / 60;
    previousTime = time;
    accumulator += delta;
    while (accumulator >= BADGE_PHYSICS_STEP) {
      if (entranceElapsed !== null) {
        entranceElapsed += BADGE_PHYSICS_STEP;
        updateEntranceDamping(rigidCard, entranceElapsed);
        if (entranceElapsed >= ENTRANCE_DURATION) stopEntrance();
      }
      if (pointerId !== null) {
        if (motionPreference.matches) rigidCard.setNextKinematicTranslation(dragTarget);
        else followBadgeDrag(rigidCard, dragTarget);
      }
      else if (!motionPreference.matches) {
        const velocity = rigidCard.angvel();
        const movement = rigidCard.linvel();
        const settled = entranceElapsed === null && !back
          && Math.hypot(movement.x, movement.y, movement.z) < .3
          && Math.hypot(velocity.x, velocity.y, velocity.z) < .45;
        const peek = flipPeek.step(BADGE_PHYSICS_STEP, settled);
        updateBadgeYaw(rigidCard, { back, peek });
      }
      if (!motionPreference.matches || pointerId !== null) world.step();
      accumulator -= BADGE_PHYSICS_STEP;
    }
    draw();
    frame = requestAnimationFrame(animate);
  }
  function resume() {
    if (frame || stopped || !inView || document.hidden) return;
    previousTime = 0;
    accumulator = 0;
    frame = requestAnimationFrame(animate);
  }
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (!inView) { endDrag(true); setHover(false); cancelAnimationFrame(frame); frame = 0; }
    else resume();
  });
  visibility.observe(stage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { endDrag(true); cancelAnimationFrame(frame); frame = 0; }
    else resume();
  });
  window.addEventListener('blur', () => endDrag(true));
  motionPreference.addEventListener('change', () => { flipPeek.cancel(); endDrag(true); resetPosition(); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    stopped = true;
    flipPeek.cancel();
    endDrag(true);
    cancelAnimationFrame(frame);
    showFallback();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    stopped = false;
    mount.hidden = false;
    resetPosition();
    draw();
    stage.classList.add('is-ready');
    stage.setAttribute('aria-busy', 'false');
    sideStatus.textContent = back ? 'Back of card: Xiao Tang, senior graphics engineer.' : 'Front of card: Xiao Tang, senior graphics engineer at Huawei.';
    resume();
  });

  resetPosition();
  if (!motionPreference.matches) {
    startBadgeEntrance({ bodies, rigidCard, anchor: anchorPosition, rest, segmentLength, narrow: (desktopLayout.matches ? column.clientWidth : mount.clientWidth) < 480 });
    entranceElapsed = 0;
    stage.dataset.entrance = 'playing';
  }
  draw();
  canvas.tabIndex = 0;
  sideStatus.textContent = 'Front of card: Xiao Tang, senior graphics engineer at Huawei.';
  stage.classList.add('is-ready');
  stage.setAttribute('aria-busy', 'false');

  resume();
}

export function initBadge(beforeReveal = Promise.resolve()) {
  return init(beforeReveal).catch(error => {
    console.error('The interactive card could not start:', error);
    showFallback();
  });
}
