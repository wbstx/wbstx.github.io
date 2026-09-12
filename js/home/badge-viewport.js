// Expand the visible frustum without moving or scaling the hanging badge.
export function frameBadgeCamera(camera, viewport, column, desktop) {
  const { width, height } = viewport;
  camera.aspect = width / height;
  camera.position.z = (desktop ? column.width : width) < 480 ? 11.9 : 10.8;
  if (desktop) {
    const center = column.left + column.width / 2 - viewport.left;
    camera.setViewOffset(width, height, width / 2 - center, 0, width, height);
  } else {
    camera.clearViewOffset();
  }
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
