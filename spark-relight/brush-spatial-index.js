import * as THREE from "three";

const BRUSH_PICK_GRID_RESOLUTION = 40;
const BRUSH_PICK_BUILD_CHUNK = 50_000;
const yieldToBrowser = () =>
  new Promise((resolve) => {
    if (typeof requestIdleCallback === "function")
      requestIdleCallback(resolve, { timeout: 40 });
    else setTimeout(resolve, 0);
  });

// Queries return borrowed storage, valid until the next query. Source splats
// must remain static; rebuild after editing positions, scales or opacity.
export class BrushSpatialIndex {
  constructor(mesh, bounds, offsets, indices, cellBounds) {
    this.mesh = mesh;
    this.bounds = bounds;
    this.offsets = offsets;
    this.indices = indices;
    this.cellBounds = cellBounds;
    this.occupiedCells = Uint32Array.from(
      offsets.subarray(0, -1),
      (_, i) => i,
    ).filter((cell) => offsets[cell] < offsets[cell + 1]);
    this.resolution = BRUSH_PICK_GRID_RESOLUTION;
    this.size = bounds.getSize(new THREE.Vector3());
    this.result = new Uint32Array(16_384);
    this.inverseMatrix = new THREE.Matrix4();
    this.localOrigin = new THREE.Vector3();
    this.localDirection = new THREE.Vector3();
  }

  static async build(mesh, isCurrent) {
    const splats = mesh.packedSplats ?? mesh.extSplats;
    if (!splats) return undefined;
    const bounds = new THREE.Box3();
    for (let base = 0; base < mesh.numSplats; base += BRUSH_PICK_BUILD_CHUNK) {
      const end = Math.min(mesh.numSplats, base + BRUSH_PICK_BUILD_CHUNK);
      for (let index = base; index < end; index += 1) {
        bounds.expandByPoint(splats.getSplat(index).center);
      }
      if (!isCurrent()) return undefined;
      await yieldToBrowser();
    }
    if (bounds.isEmpty()) return undefined;
    const initialSize = bounds.getSize(new THREE.Vector3());
    const padding = Math.max(initialSize.length() * 1e-5, 1e-5);
    bounds.min.addScalar(-padding);
    bounds.max.addScalar(padding);
    const size = bounds.getSize(new THREE.Vector3());

    const resolution = BRUSH_PICK_GRID_RESOLUTION;
    const cellCount = resolution ** 3;
    const counts = new Uint32Array(cellCount);

    const cellIndex = (center) => {
      const x = Math.min(
        resolution - 1,
        Math.max(
          0,
          Math.floor(((center.x - bounds.min.x) / size.x) * resolution),
        ),
      );
      const y = Math.min(
        resolution - 1,
        Math.max(
          0,
          Math.floor(((center.y - bounds.min.y) / size.y) * resolution),
        ),
      );
      const z = Math.min(
        resolution - 1,
        Math.max(
          0,
          Math.floor(((center.z - bounds.min.z) / size.z) * resolution),
        ),
      );
      return x + resolution * (y + resolution * z);
    };

    for (let base = 0; base < mesh.numSplats; base += BRUSH_PICK_BUILD_CHUNK) {
      const end = Math.min(mesh.numSplats, base + BRUSH_PICK_BUILD_CHUNK);
      for (let index = base; index < end; index += 1) {
        counts[cellIndex(splats.getSplat(index).center)] += 1;
      }
      if (!isCurrent()) return undefined;
      await yieldToBrowser();
    }

    const offsets = new Uint32Array(cellCount + 1);
    for (let cell = 0; cell < cellCount; cell += 1) {
      offsets[cell + 1] = offsets[cell] + counts[cell];
    }
    const cursors = offsets.slice(0, cellCount);
    const indices = new Uint32Array(mesh.numSplats);
    // Each occupied center cell bounds ALL of its ellipsoids, not just centers.
    // The radius also covers flattened disks and opacity > 1 in Spark's WASM
    // raycaster (rust/spark-rs/src/raycast.rs). No false-negative miss fallback.
    const cellBounds = new Float64Array(cellCount * 6);
    for (let cell = 0; cell < cellCount; cell++) {
      cellBounds.fill(Number.POSITIVE_INFINITY, cell * 6, cell * 6 + 3);
      cellBounds.fill(Number.NEGATIVE_INFINITY, cell * 6 + 3, cell * 6 + 6);
    }
    for (let base = 0; base < mesh.numSplats; base += BRUSH_PICK_BUILD_CHUNK) {
      const end = Math.min(mesh.numSplats, base + BRUSH_PICK_BUILD_CHUNK);
      for (let index = base; index < end; index += 1) {
        const { center, scales, opacity } = splats.getSplat(index);
        const cell = cellIndex(center);
        indices[cursors[cell]++] = index;
        const radius =
          Math.max(scales.x, scales.y, scales.z) *
            (Math.max(opacity, 1) * 4 - 3) +
          padding;
        const base = cell * 6;
        cellBounds[base] = Math.min(cellBounds[base], center.x - radius);
        cellBounds[base + 1] = Math.min(
          cellBounds[base + 1],
          center.y - radius,
        );
        cellBounds[base + 2] = Math.min(
          cellBounds[base + 2],
          center.z - radius,
        );
        cellBounds[base + 3] = Math.max(
          cellBounds[base + 3],
          center.x + radius,
        );
        cellBounds[base + 4] = Math.max(
          cellBounds[base + 4],
          center.y + radius,
        );
        cellBounds[base + 5] = Math.max(
          cellBounds[base + 5],
          center.z + radius,
        );
      }
      if (!isCurrent()) return undefined;
      await yieldToBrowser();
    }
    return new BrushSpatialIndex(mesh, bounds, offsets, indices, cellBounds);
  }

  query(worldRay) {
    this.inverseMatrix.copy(this.mesh.matrixWorld).invert();
    this.localOrigin.copy(worldRay.origin).applyMatrix4(this.inverseMatrix);
    this.localDirection
      .copy(worldRay.direction)
      .transformDirection(this.inverseMatrix);
    const origin = this.localOrigin;
    const direction = this.localDirection;
    const bounds = this.cellBounds;
    let resultCount = 0;
    for (const cell of this.occupiedCells) {
      let enter = 0;
      let exit = Number.POSITIVE_INFINITY;
      const base = cell * 6;
      for (let axis = 0; axis < 3; axis++) {
        const o = origin.getComponent(axis);
        const d = direction.getComponent(axis);
        if (d === 0) {
          if (o < bounds[base + axis] || o > bounds[base + axis + 3]) {
            exit = Number.NEGATIVE_INFINITY;
            break;
          }
        } else {
          let first = (bounds[base + axis] - o) / d;
          let last = (bounds[base + axis + 3] - o) / d;
          if (first > last) [first, last] = [last, first];
          enter = Math.max(enter, first);
          exit = Math.min(exit, last);
          if (exit < enter) break;
        }
      }
      if (exit < enter) continue;
      const start = this.offsets[cell];
      const end = this.offsets[cell + 1];
      const needed = resultCount + end - start;
      if (needed > this.result.length) {
        const grown = new Uint32Array(Math.max(needed, this.result.length * 2));
        grown.set(this.result.subarray(0, resultCount));
        this.result = grown;
      }
      this.result.set(this.indices.subarray(start, end), resultCount);
      resultCount = needed;
    }
    return this.result.subarray(0, resultCount);
  }

  querySphere(center, radius) {
    const resolution = this.resolution;
    const toCell = (value, axis) =>
      Math.min(
        resolution - 1,
        Math.max(
          0,
          Math.floor(
            ((value - this.bounds.min[axis]) / this.size[axis]) * resolution,
          ),
        ),
      );
    const minX = toCell(center.x - radius, "x");
    const minY = toCell(center.y - radius, "y");
    const minZ = toCell(center.z - radius, "z");
    const maxX = toCell(center.x + radius, "x");
    const maxY = toCell(center.y + radius, "y");
    const maxZ = toCell(center.z + radius, "z");
    let resultCount = 0;
    for (let z = minZ; z <= maxZ; z += 1) {
      for (let y = minY; y <= maxY; y += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const cell = x + resolution * (y + resolution * z);
          const start = this.offsets[cell];
          const end = this.offsets[cell + 1];
          const needed = resultCount + end - start;
          if (needed > this.result.length) {
            const grown = new Uint32Array(
              Math.max(needed, Math.ceil(this.result.length * 1.5)),
            );
            grown.set(this.result.subarray(0, resultCount));
            this.result = grown;
          }
          this.result.set(this.indices.subarray(start, end), resultCount);
          resultCount = needed;
        }
      }
    }
    return this.result.subarray(0, resultCount);
  }
}
