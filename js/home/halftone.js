// A flat triangular prism with a fixed halftone fill and stepped light.
// Its three edges still determine entry, refraction and spectral exit directions.
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = a => { const length = Math.hypot(...a); return a.map(v => v / length); };
const smoothstep = (start, end, value) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};
// Muted atomic-age print colors, ordered from warm to cool in the outgoing beam.
const SPECTRUM = [
  [210, 79, 63],   // Vermilion
  [237, 163, 57],  // Golden orange
  [240, 231, 196], // Paper cream
  [123, 163, 150], // Sage teal
];
const WHITE_LIGHT = [237, 240, 233];
const PRISM_INK = [201, 206, 200];
const STEP_DURATION = .12;
const ENTRY_STEPS = 6, INTERNAL_STEPS = 4, SPECTRUM_STEPS = 10;
const TOTAL_STEPS = ENTRY_STEPS + INTERNAL_STEPS + SPECTRUM_STEPS;
const HOLD_STEPS = 4;
const CYCLE_STEPS = TOTAL_STEPS + HOLD_STEPS;
export const PRISM_CYCLE_DURATION = CYCLE_STEPS * STEP_DURATION;
export const PRISM_STILL_TIME = TOTAL_STEPS * STEP_DURATION;
const SCALE = .76 / 6;
const CENTER = [.45, .53];

export function createPrismScene() {
  const width = 600, height = 420, spacing = 5, dots = [];
  const profile = [[0, 1.34], [-1.16, -.67], [1.16, -.67]];
  const planes = profile.map((a, i) => {
    const b = profile[(i + 1) % profile.length];
    const normal = unit([b[1] - a[1], a[0] - b[0], 0]);
    return { normal, offset: dot(normal, [...a, 0]) };
  });
  for (let row = 0, y = spacing / 2; y < height; row++, y += spacing) {
    for (let x = spacing / 2 + row % 2 * spacing / 2; x < width; x += spacing) {
      const point = [(x - width * CENTER[0]) / (width * SCALE), (height * CENTER[1] - y) / (width * SCALE), 0];
      const edgeDistance = Math.min(...planes.map(plane => plane.offset - dot(plane.normal, point))) * width * SCALE;
      if (edgeDistance > 0) {
        // Taper over almost three rows of dots, keeping the triangle flat and sharp inside.
        dots.push({ x, y, edgeCoverage: smoothstep(0, spacing * 2.8, edgeDistance) });
      }
    }
  }
  const scene = { width, height, spacing, planes, dots, light: traceLight(planes) };
  scene.internalPaths = (scene.light?.output ?? []).map(ray => {
    const points = ray.path.map(point => project(scene, point));
    const segments = points.slice(1).map((end, i) => {
      const start = points[i], dx = end[0] - start[0], dy = end[1] - start[1];
      return { start, dx, dy, length: Math.hypot(dx, dy) };
    });
    return { segments, length: segments.reduce((sum, segment) => sum + segment.length, 0), rgb: ray.rgb };
  });
  return scene;
}

function refract(direction, normal, ratio) {
  const cosine = -dot(direction, normal), k = 1 - ratio * ratio * (1 - cosine * cosine);
  return k < 0 ? null : unit(direction.map((value, i) => ratio * value + (ratio * cosine - Math.sqrt(k)) * normal[i]));
}

function traceLight(planes) {
  const origin = [-4, -.6, 0], direction = unit([1, .22, 0]);
  let near = 0, far = Infinity, face = -1;
  for (let i = 0; i < planes.length; i++) {
    const { normal, offset } = planes[i], denominator = dot(normal, direction), numerator = offset - dot(normal, origin);
    if (Math.abs(denominator) < 1e-8) { if (numerator < 0) return null; continue; }
    const t = numerator / denominator;
    if (denominator < 0 && t > near) { near = t; face = i; }
    else if (denominator > 0) far = Math.min(far, t);
  }
  if (face < 0 || near > far) return null;
  const entry = origin.map((value, i) => value + near * direction[i]);
  const output = SPECTRUM.map((color, index) => {
    const ior = 1.465 + index / (SPECTRUM.length - 1) * .075;
    let inside = refract(direction, planes[face].normal, 1 / ior), point = entry;
    const path = [entry];
    for (let bounce = 0; bounce < 4; bounce++) {
      const start = point.map((value, i) => value + inside[i] * .0001);
      let distance = Infinity, exitFace = -1;
      for (let i = 0; i < planes.length; i++) {
        const denominator = dot(planes[i].normal, inside);
        if (denominator <= 1e-8) continue;
        const t = (planes[i].offset - dot(planes[i].normal, start)) / denominator;
        if (t > 0 && t < distance) { distance = t; exitFace = i; }
      }
      if (exitFace < 0) return null;
      point = start.map((value, i) => value + distance * inside[i]);
      path.push(point);
      const normal = planes[exitFace].normal;
      const outgoing = refract(inside, normal.map(value => -value), ior);
      if (outgoing) return { point, direction: outgoing, color: `rgb(${color.join(',')})`, rgb: color, path };
      const cosine = dot(inside, normal);
      inside = inside.map((value, i) => value - 2 * cosine * normal[i]);
    }
    return null;
  }).filter(Boolean);
  return { entry, start: entry.map((value, i) => value - direction[i] * 2.65), output };
}

function project(scene, point) {
  return [scene.width * CENTER[0] + point[0] * scene.width * SCALE, scene.height * CENTER[1] - point[1] * scene.width * SCALE];
}

function beamVisible(point, planes) {
  return planes.some(plane => dot(plane.normal, point) >= plane.offset - .001);
}

function lightStep(seconds) {
  const step = ((Math.floor(seconds / STEP_DURATION + 1e-8) % CYCLE_STEPS) + CYCLE_STEPS) % CYCLE_STEPS;
  // Build the complete beam, hold it, then start the next preview cycle.
  return { head: Math.min(TOTAL_STEPS, step + 1) };
}

function segmentIntensity(position, light) {
  // The head still advances in discrete steps; only its spatial edge falls off.
  return smoothstep(0, .38, light.head - position);
}

function internalLight(point, paths, light) {
  let brightness = 0, totalWeight = 0;
  const color = [0, 0, 0];
  for (const path of paths) {
    let travelled = 0;
    for (const segment of path.segments) {
      const { start, dx, dy, length } = segment;
      if (length < 1e-6) continue;
      const vx = point.x - start[0], vy = point.y - start[1];
      const t = (vx * dx + vy * dy) / (length * length);
      if (t >= 0 && t <= 1) {
        const progress = (travelled + t * length) / path.length;
        const intensity = segmentIntensity(ENTRY_STEPS + progress * INTERNAL_STEPS, light);
        if (intensity > 0) {
          const distance = Math.abs(vx * dy - vy * dx) / length;
          const falloff = 1 - smoothstep(1.5, 6.5, distance);
          brightness = Math.max(brightness, falloff * intensity);
          // Overlapping rays stay white near entry; their own colors emerge toward exit.
          const separation = smoothstep(.35, .95, progress) * .85;
          const weight = Math.exp(-.5 * (distance / 1.15) ** 2) * falloff * intensity;
          totalWeight += weight;
          for (let channel = 0; channel < 3; channel++) {
            color[channel] += (WHITE_LIGHT[channel] + (path.rgb[channel] - WHITE_LIGHT[channel]) * separation) * weight;
          }
        }
      }
      travelled += length;
    }
  }
  return { brightness, color: totalWeight > 0 ? color.map(channel => channel / totalWeight) : WHITE_LIGHT };
}

function beamDots(scene, planes, start, end, color, circle, light) {
  const a = project(scene, start), b = project(scene, end);
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(1, Math.floor(length / 3.6));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const fade = smoothstep(0, .2, 1 - t) * segmentIntensity((1 - t) * ENTRY_STEPS, light);
    if (fade <= 0) continue;
    const point = start.map((value, axis) => value + (end[axis] - value) * t);
    if (!beamVisible(point, planes) || fade <= 0) continue;
    const [x, y] = project(scene, point);
    circle(x, y, 1.05 * Math.sqrt(fade), color);
  }
}

function spectrumDots(scene, planes, output, circle, light) {
  const bands = output.map(ray => {
    const end = ray.point.map((value, i) => value + ray.direction[i] * 3.15);
    const a = project(scene, ray.point), b = project(scene, end);
    const delta = [b[0] - a[0], b[1] - a[1]];
    return { ...ray, end, a, b, delta, lengthSquared: delta[0] ** 2 + delta[1] ** 2 };
  });
  if (!bands.length) return;
  const spacing = 3.5, margin = 10;
  const minX = Math.max(0, Math.min(...bands.flatMap(band => [band.a[0], band.b[0]])) - margin);
  const maxX = Math.min(scene.width, Math.max(...bands.flatMap(band => [band.a[0], band.b[0]])) + margin);
  const minY = Math.max(0, Math.min(...bands.flatMap(band => [band.a[1], band.b[1]])) - margin);
  const maxY = Math.min(scene.height, Math.max(...bands.flatMap(band => [band.a[1], band.b[1]])) + margin);
  // One print grid across every band: no intersecting rows or overprinted colors.
  for (let row = Math.floor(minY / spacing); row * spacing <= maxY; row++) {
    const y = row * spacing;
    for (let x = Math.floor(minX / spacing) * spacing + row % 2 * spacing / 2; x <= maxX; x += spacing) {
      let selected = null, nearest = Infinity;
      for (const band of bands) {
        const vx = x - band.a[0], vy = y - band.a[1];
        const t = (vx * band.delta[0] + vy * band.delta[1]) / band.lengthSquared;
        if (t < 0 || t > 1) continue;
        const intensity = segmentIntensity(ENTRY_STEPS + INTERNAL_STEPS + t * SPECTRUM_STEPS, light);
        if (intensity <= 0) continue;
        const distance = Math.abs(vx * band.delta[1] - vy * band.delta[0]) / Math.sqrt(band.lengthSquared);
        const halfWidth = .8 + t * 5.8;
        const relativeDistance = distance / halfWidth;
        if (relativeDistance >= 1.4 || relativeDistance >= nearest) continue;
        const point = band.point.map((value, i) => value + (band.end[i] - value) * t);
        if (!beamVisible(point, planes)) continue;
        nearest = relativeDistance;
        selected = { band, t, coverage: (1 - smoothstep(.15, 1.4, relativeDistance)) * intensity };
      }
      if (!selected) continue;
      const fade = smoothstep(0, .2, 1 - selected.t);
      const radius = 1.45 * Math.sqrt(selected.coverage * fade);
      if (radius > .05) circle(x, y, radius, selected.band.color);
    }
  }
}

function paintPrism(scene, seconds, circle) {
  const { planes, light } = scene;
  const step = lightStep(seconds);
  for (const point of scene.dots) {
    const illumination = internalLight(point, scene.internalPaths, step);
    const { brightness } = illumination;
    // Brighten existing halftone dots instead of laying a solid stripe over the fill.
    const radius = Math.sqrt(point.edgeCoverage * (1.05 ** 2 + brightness * (2 ** 2 - 1.05 ** 2)));
    const color = brightness > 0
      ? `rgb(${PRISM_INK.map((channel, i) => Math.round(channel + (illumination.color[i] - channel) * brightness)).join(',')})`
      : '#c9cec8';
    if (radius > .05) circle(point.x, point.y, radius, color);
  }
  if (light) {
    beamDots(scene, planes, light.entry, light.start, '#edf0e9', circle, step);
    spectrumDots(scene, planes, light.output, circle, step);
  }
}

export function drawPrism(context, scene, seconds) {
  context.clearRect(0, 0, scene.width, scene.height);
  paintPrism(scene, seconds, (x, y, radius, color) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  });
}

export function prismPoster(scene, seconds = 0) {
  const shapes = [], n = value => Number(value.toFixed(3));
  paintPrism(scene, seconds, (x, y, radius, color) => {
    shapes.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius)}" fill="${color}"/>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}">${shapes.join('')}</svg>\n`;
}
