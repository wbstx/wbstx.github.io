import { CARD_WIDTH } from './card-dimensions.js';

// Fit the horizontal card to its column while keeping the full page interactive.
export function frameBadgeCamera(camera, viewport, column, desktop) {
  const { width, height } = viewport;
  camera.aspect = width / height;
  camera.position.z = (desktop ? column.width : width) < 480 ? 11.9 : 10.8;
  const framingAspect = (desktop ? column.width : width) / height;
  const fittingDistance = (CARD_WIDTH + .65) / (2 * Math.tan(camera.fov * Math.PI / 360) * framingAspect);
  camera.position.z = Math.max(camera.position.z, fittingDistance);
  if (desktop) {
    const center = column.left + column.width / 2 - viewport.left;
    camera.setViewOffset(width, height, width / 2 - center, 0, width, height);
  } else {
    camera.clearViewOffset();
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
