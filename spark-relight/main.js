import {
  RVIS_FLAG_DIRECTIONAL_RASTER,
  RVIS_FLAG_SURFACE_SMOOTHING,
  RVIS_FLAG_SURFACE_V2,
  RVIS_MAX_ENVIRONMENT_LIGHTS,
  RVIS_MAX_POINT_LIGHTS,
  RvisDisplayMode,
  RvisGroundShadow,
  RvisGroundShadowLightType,
  RvisLightType,
  RvisLighting,
  RvisSurfaceColorMode,
  RvisSurfacePaintMode,
  RvisSurfacePaintTool,
  RvisSurfacePainter,
  SparkRenderer,
  SplatMesh,
  analyzeRvisEnvironment,
  loadRvis,
  parseRvis,
} from "@sparkjsdev/spark";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

const ASSET_BASE =
  "https://raw.githubusercontent.com/wbstx/wbstx.github.io/spark-relight-assets";

const HDRI_PRESETS = [
  {
    id: "studio_small_09",
    label: "Studio Small 09",
    detail: "Softbox studio",
    url: `${ASSET_BASE}/studio_small_09_2k.hdr`,
    source: "https://polyhaven.com/a/studio_small_09",
  },
  {
    id: "spruit_sunrise",
    label: "Spruit Sunrise",
    detail: "Warm hard sunlight",
    url: `${ASSET_BASE}/spruit_sunrise_2k.hdr`,
    source: "https://polyhaven.com/a/spruit_sunrise",
  },
  {
    id: "meadow_2",
    label: "Meadow 2",
    detail: "Clear outdoor sun",
    url: `${ASSET_BASE}/meadow_2_2k.hdr`,
    source: "https://polyhaven.com/a/meadow_2",
  },
  {
    id: "shanghai_bund",
    label: "Shanghai Bund",
    detail: "Colored city night",
    url: `${ASSET_BASE}/shanghai_bund_2k.hdr`,
    source: "https://polyhaven.com/a/shanghai_bund",
  },
];

const SCENES = [
  {
    id: "065a31a8",
    label: "League of Legends · Vi",
    detail: "616K splats · BVH / raster / prune comparison",
    sog: `${ASSET_BASE}/065a31a8.sog`,
    visibilityVariants: [
      {
        id: "bvh-before",
        label: "BVH · Before",
        detail: "32 dirs · no bias · estimated 20.2 s",
        rvis: `${ASSET_BASE}/065a31a8.rvis`,
      },
      {
        id: "raster-after",
        label: "Raster · After",
        detail: "Raster 1024 · 11.4 s · visibility MAE 0.0368",
        rvis: `${ASSET_BASE}/065a31a8-raster1024-32.rvis`,
      },
      {
        id: "prune-reference",
        label: "Prune · Ref",
        detail: "SPZ reference · 616,488 splats · same raster RVIS",
        sog: `${ASSET_BASE}/065a31a8-t005-full.spz`,
        rvis: `${ASSET_BASE}/065a31a8-raster1024-32.rvis`,
      },
      {
        id: "pruned-t005",
        label: "Pruned · 0.05",
        detail: "BVH ∩ raster · 545,311 splats · removed 71,177 (11.55%)",
        sog: `${ASSET_BASE}/065a31a8-t005-pruned.spz`,
        rvis: `${ASSET_BASE}/065a31a8-t005-pruned.rvis`,
      },
    ],
    defaultVisibilityVariant: "raster-after",
    background: 0x000000,
    position: [2.435713, 19.986647, 44.334667],
    target: [3.373088, 10.712549, -3.776106],
    lightCenter: [-0.374063, -13.753802, -0.041314],
    radius: 18.443381,
    fov: 75,
  },
  {
    id: "2826d2c0",
    label: "DIY Automated Rig Scan",
    detail: "44.5K splats · 10% · BVH / raster / prune comparison",
    sog: `${ASSET_BASE}/2826d2c0-10pct.sog`,
    visibilityVariants: [
      {
        id: "bvh-before",
        label: "BVH · Before",
        detail: "32 dirs · no bias · estimated 1.4 s",
        rvis: `${ASSET_BASE}/2826d2c0-10pct-bvh.rvis`,
      },
      {
        id: "raster-after",
        label: "Raster · After",
        detail: "Raster 1024 · 4.6 s · visibility MAE 0.0995",
        rvis: `${ASSET_BASE}/2826d2c0-10pct-raster1024-32.rvis`,
      },
      {
        id: "prune-reference",
        label: "Prune · Ref",
        detail: "SPZ reference · 44,541 splats · same raster RVIS",
        sog: `${ASSET_BASE}/2826d2c0-t005-full.spz`,
        rvis: `${ASSET_BASE}/2826d2c0-10pct-raster1024-32.rvis`,
      },
      {
        id: "pruned-t005",
        label: "Pruned · 0.05",
        detail: "BVH ∩ raster · 43,839 splats · removed 702 (1.58%)",
        sog: `${ASSET_BASE}/2826d2c0-t005-pruned.spz`,
        rvis: `${ASSET_BASE}/2826d2c0-t005-pruned.rvis`,
      },
    ],
    defaultVisibilityVariant: "raster-after",
    background: 0x000000,
    position: [-13.560485, 8.870821, -0.961301],
    target: [-0.105754, 0.900574, -0.836827],
    lightCenter: [0.437741, -2.261298, -0.892571],
    radius: 10.894672,
    fov: 75,
  },
  {
    id: "1a2d46fa",
    label: "The Dude · Electric Guitar",
    detail: "194K splats · 7 bakes · prune A/B",
    sog: `${ASSET_BASE}/1a2d46fa.sog`,
    visibilityVariants: [
      {
        id: "baseline",
        label: "Baseline",
        detail: "32 dirs · no bias",
        rvis: `${ASSET_BASE}/1a2d46fa.rvis`,
      },
      {
        id: "bias",
        label: "Bias 0.5%",
        detail: "64 dirs · 0.5% bias",
        rvis: `${ASSET_BASE}/1a2d46fa-bias0.005-64.rvis`,
      },
      {
        id: "smooth",
        label: "Smooth 0.5%",
        detail: "0.5% radius · 0.65 strength · 24 neighbors",
        rvis: `${ASSET_BASE}/1a2d46fa-bias0.005-64-smooth.rvis`,
      },
      {
        id: "thin-bias",
        label: "Thin Bias",
        detail: "64 dirs · 0.15% bias",
        rvis: `${ASSET_BASE}/1a2d46fa-bias0.0015-64.rvis`,
      },
      {
        id: "thin-smooth",
        label: "Thin Smooth",
        detail: "0.2% radius · 0.4 strength · 12 neighbors",
        rvis: `${ASSET_BASE}/1a2d46fa-bias0.0015-64-smooth0.002-s0.4-n12.rvis`,
      },
      {
        id: "strong-smooth",
        label: "BVH · Before",
        detail: "64 dirs · 0.5% bias · 3-pass normalized surface smoothing",
        rvis: `${ASSET_BASE}/1a2d46fa-bias0.005-64-surface-mix3-r0.005-s0.75-n32.rvis`,
      },
      {
        id: "raster-after",
        label: "Raster · After",
        detail: "Raster 1024 · 10.1 s · matched strong smoothing · MAE 0.0211",
        rvis: `${ASSET_BASE}/1a2d46fa-raster1024-bias0.005-64-strong-smooth.rvis`,
      },
      {
        id: "prune-reference",
        label: "Prune · Ref",
        detail: "SPZ reference · 194,369 splats · same raster RVIS",
        sog: `${ASSET_BASE}/1a2d46fa-t005-full.spz`,
        rvis: `${ASSET_BASE}/1a2d46fa-raster1024-bias0.005-64-strong-smooth.rvis`,
      },
      {
        id: "pruned-t005",
        label: "Pruned · 0.05",
        detail: "BVH ∩ raster · 194,075 splats · removed 294 (0.15%)",
        sog: `${ASSET_BASE}/1a2d46fa-t005-pruned.spz`,
        rvis: `${ASSET_BASE}/1a2d46fa-t005-pruned.rvis`,
      },
    ],
    defaultVisibilityVariant: "raster-after",
    background: 0xc0c0c0,
    position: [0.83327, 1.120123, 2.101312],
    target: [0.52372, 0.860791, 0.663514],
    lightCenter: [0.190995, -0.818271, -2.031079],
    radius: 2.676643,
    fov: 75,
  },
  {
    id: "12fa2893",
    label: "StarEngine X CF450",
    detail: "814K splats · SH3 · 6 visibility bakes",
    sog: `${ASSET_BASE}/12fa2893.sog`,
    visibilityVariants: [
      {
        id: "baseline",
        label: "Baseline",
        detail: "64 dirs · no bias",
        rvis: `${ASSET_BASE}/12fa2893-baseline-64.rvis`,
      },
      {
        id: "bias",
        label: "Ray Bias",
        detail: "64 dirs · 0.5% bias",
        rvis: `${ASSET_BASE}/12fa2893-bias0.005-64.rvis`,
      },
      {
        id: "smooth",
        label: "Smooth",
        detail: "64 dirs · surface-aware SH",
        rvis: `${ASSET_BASE}/12fa2893-bias0.005-64-smooth.rvis`,
      },
      {
        id: "surface-v2",
        label: "Surface v2",
        detail: "64 dirs · adaptive bias · tangent-plane filter",
        rvis: `${ASSET_BASE}/12fa2893-bias0.005-64-surface-v2.rvis`,
      },
      {
        id: "strong-smooth",
        label: "BVH · Before",
        detail: "64 dirs · 0.5% bias · 3-pass normalized surface smoothing",
        rvis: `${ASSET_BASE}/12fa2893-bias0.005-64-strong-smooth.rvis`,
      },
      {
        id: "raster-after",
        label: "Raster · After",
        detail: "Raster 1024 · 35.7 s · matched strong smoothing · MAE 0.0488",
        rvis: `${ASSET_BASE}/12fa2893-raster1024-bias0.005-64-strong-smooth.rvis`,
      },
      {
        id: "prune-reference",
        label: "Prune · Ref",
        detail: "SPZ reference · 814,343 splats · same raster RVIS",
        sog: `${ASSET_BASE}/12fa2893-t005-full.spz`,
        rvis: `${ASSET_BASE}/12fa2893-raster1024-bias0.005-64-strong-smooth.rvis`,
      },
      {
        id: "pruned-t005",
        label: "Pruned · 0.05",
        detail: "BVH ∩ raster · 812,382 splats · removed 1,961 (0.24%)",
        sog: `${ASSET_BASE}/12fa2893-t005-pruned.spz`,
        rvis: `${ASSET_BASE}/12fa2893-t005-pruned.rvis`,
      },
    ],
    defaultVisibilityVariant: "raster-after",
    background: 0x000000,
    position: [-2.080758, 1.264189, -3.159627],
    target: [-0.363998, 0.860582, -0.178044],
    lightCenter: [-0.021832, -0.913494, 0.158298],
    radius: 1.932707,
    fov: 45,
  },
  {
    id: "0857edc2",
    label: "Husqvarna Svartpilen 401",
    detail: "1.43M splats · SH3 · 5 visibility bakes",
    sog: `${ASSET_BASE}/0857edc2.sog`,
    visibilityVariants: [
      {
        id: "baseline",
        label: "Baseline",
        detail: "64 dirs · no bias",
        rvis: `${ASSET_BASE}/0857edc2-baseline-64.rvis`,
      },
      {
        id: "bias",
        label: "Ray Bias",
        detail: "64 dirs · 0.5% bias",
        rvis: `${ASSET_BASE}/0857edc2-bias0.005-64.rvis`,
      },
      {
        id: "smooth",
        label: "Smooth",
        detail: "64 dirs · surface-aware SH",
        rvis: `${ASSET_BASE}/0857edc2-bias0.005-64-smooth.rvis`,
      },
      {
        id: "strong-smooth",
        label: "BVH · Before",
        detail: "64 dirs · 0.5% bias · 3-pass normalized surface smoothing",
        rvis: `${ASSET_BASE}/0857edc2-bias0.005-64-strong-smooth.rvis`,
      },
      {
        id: "raster-after",
        label: "Raster · After",
        detail: "Raster 1024 · 54.9 s · matched strong smoothing · MAE 0.0644",
        rvis: `${ASSET_BASE}/0857edc2-raster1024-bias0.005-64-strong-smooth.rvis`,
      },
      {
        id: "prune-reference",
        label: "Prune · Ref",
        detail: "SPZ reference · 1,434,568 splats · same raster RVIS",
        sog: `${ASSET_BASE}/0857edc2-t005-full.spz`,
        rvis: `${ASSET_BASE}/0857edc2-raster1024-bias0.005-64-strong-smooth.rvis`,
      },
      {
        id: "pruned-t005",
        label: "Pruned · 0.05",
        detail: "BVH ∩ raster · 1,428,704 splats · removed 5,864 (0.41%)",
        sog: `${ASSET_BASE}/0857edc2-t005-pruned.spz`,
        rvis: `${ASSET_BASE}/0857edc2-t005-pruned.rvis`,
      },
    ],
    defaultVisibilityVariant: "raster-after",
    background: 0x000000,
    position: [16.467173, 5.040628, -3.482956],
    target: [1.689017, 2.992924, -1.220337],
    lightCenter: [-0.072435, -4.125355, -0.093791],
    radius: 11.868351,
    fov: 75,
  },
  {
    id: "cbe96076",
    label: "Cicada Shell",
    detail: "653K splats · SH3 · 6 visibility bakes",
    sog: `${ASSET_BASE}/cbe96076.sog`,
    visibilityVariants: [
      {
        id: "baseline",
        label: "Baseline",
        detail: "64 dirs · no bias",
        rvis: `${ASSET_BASE}/cbe96076-baseline-64.rvis`,
      },
      {
        id: "bias",
        label: "Bias 0.5%",
        detail: "64 dirs · 0.5% bias",
        rvis: `${ASSET_BASE}/cbe96076-bias0.005-64.rvis`,
      },
      {
        id: "smooth",
        label: "Smooth 0.5%",
        detail: "0.5% radius · 0.65 strength · 24 neighbors",
        rvis: `${ASSET_BASE}/cbe96076-bias0.005-64-smooth.rvis`,
      },
      {
        id: "thin-bias",
        label: "Thin Bias",
        detail: "64 dirs · 0.15% bias",
        rvis: `${ASSET_BASE}/cbe96076-bias0.0015-64.rvis`,
      },
      {
        id: "thin-smooth",
        label: "BVH · Before",
        detail: "0.2% radius · 0.4 strength · 12 neighbors",
        rvis: `${ASSET_BASE}/cbe96076-bias0.0015-64-smooth0.002-s0.4-n12.rvis`,
      },
      {
        id: "raster-after",
        label: "Raster · After",
        detail: "Raster 1024 · 38.3 s · matched thin smoothing · MAE 0.0825",
        rvis: `${ASSET_BASE}/cbe96076-raster1024-bias0.0015-64-thin-smooth.rvis`,
      },
      {
        id: "prune-reference",
        label: "Prune · Ref",
        detail: "SPZ reference · 652,804 splats · same raster RVIS",
        sog: `${ASSET_BASE}/cbe96076-t005-full.spz`,
        rvis: `${ASSET_BASE}/cbe96076-raster1024-bias0.0015-64-thin-smooth.rvis`,
      },
      {
        id: "pruned-t005",
        label: "Pruned · 0.05",
        detail: "BVH ∩ raster · 580,954 splats · removed 71,850 (11.01%)",
        sog: `${ASSET_BASE}/cbe96076-t005-pruned.spz`,
        rvis: `${ASSET_BASE}/cbe96076-t005-pruned.rvis`,
      },
    ],
    defaultVisibilityVariant: "raster-after",
    background: 0x1e1e1e,
    position: [-0.236086, 0.93743, -1.413392],
    target: [0.139904, 0.409013, 0.083489],
    lightCenter: [-0.162296, -0.545576, 0.061067],
    radius: 0.687296,
    fov: 33,
  },
];
const scenesById = new Map(SCENES.map((entry) => [entry.id, entry]));

function assetUrl(relativePath) {
  return new URL(relativePath, window.location.href).href;
}

function getVisibilityVariants(sceneConfig) {
  return (
    sceneConfig.visibilityVariants ?? [
      {
        id: "default",
        label: "Baked",
        detail: "Single RVIS bake",
        rvis: sceneConfig.rvis,
      },
    ]
  );
}

function resolveVisibilityVariant(sceneConfig, requestedId) {
  const variants = getVisibilityVariants(sceneConfig);
  return (
    variants.find((variant) => variant.id === requestedId) ??
    variants.find(
      (variant) => variant.id === sceneConfig.defaultVisibilityVariant,
    ) ??
    variants[0]
  );
}

function resolveVariantGeometry(sceneConfig, variant) {
  return variant?.sog ?? sceneConfig.sog;
}

const canvas = document.getElementById("canvas");
const fpsMeter = document.getElementById("fps-meter");
const fpsValue = document.getElementById("fps-value");
const loadingLayer = document.getElementById("loading-layer");
const loadingSpinner = loadingLayer.querySelector(".loader");
const loadingDetail = document.getElementById("loading-detail");
const sceneList = document.getElementById("scene-list");
const sceneSubtitle = document.getElementById("scene-subtitle");
const sceneTotal = document.getElementById("scene-total");
const localSogInput = document.getElementById("local-sog-file");
const localRvisInput = document.getElementById("local-rvis-file");
const localSogName = document.getElementById("local-sog-name");
const localRvisName = document.getElementById("local-rvis-name");
const loadLocalSceneButton = document.getElementById("load-local-scene");
const localImportStatus = document.getElementById("local-import-status");
const visibilityVariantSection = document.getElementById(
  "visibility-variant-section",
);
const visibilityVariantControl = document.getElementById(
  "visibility-variant-control",
);
const visibilityVariantValue = document.getElementById(
  "visibility-variant-value",
);
const visibilityVariantDescription = document.getElementById(
  "visibility-variant-description",
);
const modeDescription = document.getElementById("mode-description");
const assetStatus = document.getElementById("asset-status");
const statusText = document.getElementById("status-text");
const splatCount = document.getElementById("splat-count");
const viewportHint = document.querySelector(".viewport-hint");
const autoLightButton = document.getElementById("auto-light");
const addPointLightButton = document.getElementById("add-point-light");
const pointLightList = document.getElementById("point-light-list");
const pointLightCount = document.getElementById("point-light-count");
const directLightLabel = document.getElementById("direct-light-label");
const directColorDot = document.getElementById("direct-color-dot");
const lightEditor = document.getElementById("light-editor");
const hdriPresetList = document.getElementById("hdri-preset-list");
const hdriFileInput = document.getElementById("hdri-file");
const hdriRotationInput = document.getElementById("hdri-rotation");
const hdriRotationOutput = document.getElementById("hdri-rotation-value");
const hdriIntensityInput = document.getElementById("hdri-intensity");
const hdriIntensityOutput = document.getElementById("hdri-intensity-value");
const hdriBackgroundInput = document.getElementById("hdri-background");
const hdriStatus = document.getElementById("hdri-status");
const hdriCredit = document.getElementById("hdri-credit");
const groundPlaneToggle = document.getElementById("ground-plane-toggle");
const groundSwitchLabel =
  groundPlaneToggle.parentElement.querySelector("small");
const groundShadowControls = document.getElementById("ground-shadow-controls");
const groundPlaneColorInput = document.getElementById("ground-plane-color");
const groundShadowStrengthInput = document.getElementById(
  "ground-shadow-strength",
);
const groundShadowStrengthOutput = document.getElementById(
  "ground-shadow-strength-value",
);
const groundShadowSoftnessInput = document.getElementById(
  "ground-shadow-softness",
);
const groundShadowSoftnessOutput = document.getElementById(
  "ground-shadow-softness-value",
);
const groundShadowStatus = document.getElementById("ground-shadow-status");
const paintToggle = document.getElementById("paint-toggle");
const paintHelp = document.getElementById("paint-help");
const brushCursor = document.getElementById("brush-cursor");
const paintToolControl = document.getElementById("paint-tool");
const paintModeControl = document.getElementById("paint-mode");
const paintColorModeControl = document.getElementById("paint-color-mode");
const paintDescription = document.getElementById("paint-description");
const paintColorHueInput = document.getElementById("paint-color-hue");
const paintColorHueOutput = document.getElementById("paint-color-hue-value");
const paintColorSaturationInput = document.getElementById(
  "paint-color-saturation",
);
const paintColorSaturationOutput = document.getElementById(
  "paint-color-saturation-value",
);
const paintColorLightnessInput = document.getElementById(
  "paint-color-lightness",
);
const paintColorLightnessOutput = document.getElementById(
  "paint-color-lightness-value",
);
const paintFilters = {
  thickness: {
    label: "depth",
    toggle: document.getElementById("paint-thickness-filter-toggle"),
    state: document.getElementById("paint-thickness-filter-state"),
    controlSelector: ".paint-thickness-filter-only",
  },
  normal: {
    label: "normal",
    toggle: document.getElementById("paint-normal-filter-toggle"),
    state: document.getElementById("paint-normal-filter-state"),
    controlSelector: ".paint-normal-filter-only",
  },
  visibility: {
    label: "visibility",
    toggle: document.getElementById("paint-visibility-filter-toggle"),
    state: document.getElementById("paint-visibility-filter-state"),
    controlSelector: ".paint-visibility-filter-only",
  },
};

const coarsePointerMedia = window.matchMedia("(pointer: coarse)");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(
  Math.min(window.devicePixelRatio || 1, coarsePointerMedia.matches ? 1 : 1.5),
);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0e12);
const gizmoScene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.01,
  1000,
);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;

const spark = new SparkRenderer({
  renderer,
  lodSplatCount: coarsePointerMedia.matches ? 900_000 : undefined,
});
scene.add(spark);

let lighting;
let splat;
let groundPlane;
let groundShadowSplat;
let groundShadow;
let groundShadowSampleCount = 0;
let groundShadowDensityScale = 1;
let surfacePainter;
let activeScene;
let activeVisibilityVariant;
let sceneLoadToken = 0;
let visibilityLoadToken = 0;
let groundShadowLoadToken = 0;
let selectedLocalSogFile;
let selectedLocalRvisFile;
let sceneLoading = false;
let localImportError;
let currentMode = RvisDisplayMode.SHADOWED;
let currentLightType = RvisLightType.DIRECTIONAL;
const modelCenter = new THREE.Vector3();
let modelRadius = 1;
let autoLight = false;
let lastFrameTime = 0;
let fpsWindowStartedAt = performance.now();
let fpsWindowFrames = 0;
let smoothedFps;
let lightingUpdatePending = false;
let paintEnabled = false;
let paintDragging = false;
let paintPointerId = null;
let lastPaintClientX = Number.NaN;
let lastPaintClientY = Number.NaN;
let currentPaintMode = RvisSurfacePaintMode.COLOR;
let currentPaintColorMode = RvisSurfaceColorMode.TINT;
const PaintInteractionTool = Object.freeze({ VIEW: 0, BRUSH: 1, ERASER: 2 });
let currentPaintTool = PaintInteractionTool.VIEW;
let lastPaintTool = PaintInteractionTool.BRUSH;
const directionalLightConfig = {
  azimuth: 35,
  elevation: 48,
  color: "#ffe8c7",
  intensity: 1,
};
const hdrLoader = new HDRLoader().setDataType(THREE.FloatType);
const exrLoader = new EXRLoader().setDataType(THREE.FloatType);
const environmentConfig = {
  rotation: 0,
  intensity: 1,
};
let environmentTexture;
let environmentAnalysis;
let activeHdriPresetId;
let environmentLoadToken = 0;
const pointLightConfigs = [];
let nextPointLightId = 1;
let selectedPointLightId;
let hoveredPointLightId;
let draggedPointLightId;
const lightArrow = new THREE.ArrowHelper(
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(),
  1,
  0xf4b96a,
);
const pointSphereGeometry = new THREE.SphereGeometry(0.04, 18, 12);
const pointRingGeometry = new THREE.RingGeometry(0.055, 0.068, 40);
lightArrow.renderOrder = 1000;
gizmoScene.add(lightArrow);

const pointerRaycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const pointDragPlane = new THREE.Plane();
const pointDragOffset = new THREE.Vector3();
const pointDragWorld = new THREE.Vector3();
let pointDragPointerId = null;
let pointLightDragging = false;
const cameraKeys = new Set();
const cameraNavigationCodes = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyQ",
  "KeyE",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ShiftLeft",
  "ShiftRight",
]);
const worldUp = new THREE.Vector3(0, 1, 0);
const environmentUp = new THREE.Vector3(0, 1, 0);
const environmentInverseModelQuaternion = new THREE.Quaternion();
const cameraViewDirection = new THREE.Vector3();
const cameraActualUp = new THREE.Vector3();
const cameraMoveDirection = new THREE.Vector3();
const cameraRight = new THREE.Vector3();
const cameraTranslation = new THREE.Vector3();
const brushNormal = new THREE.Vector3();
const brushCameraPosition = new THREE.Vector3();
const brushAxis = new THREE.Vector3();
const brushHitLocal = new THREE.Vector3();
const lightingCameraPosition = new THREE.Vector3();
const groundWorldCenter = new THREE.Vector3();
const groundWorldScale = new THREE.Vector3();
const groundWorldQuaternion = new THREE.Quaternion();
const groundWorldDirection = new THREE.Vector3();
const groundSampleCenter = new THREE.Vector3();
const GROUND_SHADOW_MAX_SPLATS = 180_000;

const inputs = {
  azimuth: document.getElementById("azimuth"),
  elevation: document.getElementById("elevation"),
  distance: document.getElementById("distance"),
  shadow: document.getElementById("shadow-strength"),
  ambient: document.getElementById("ambient"),
  ambientColor: document.getElementById("ambient-color"),
  intensity: document.getElementById("intensity"),
  color: document.getElementById("light-color"),
  paintColor: document.getElementById("paint-color"),
  brushRoughness: document.getElementById("brush-roughness"),
  brushSpecular: document.getElementById("brush-specular"),
  brushRadius: document.getElementById("brush-radius"),
  brushThickness: document.getElementById("brush-thickness"),
  brushOpacity: document.getElementById("brush-opacity"),
  brushNormalAngle: document.getElementById("brush-normal-angle"),
  brushVisibility: document.getElementById("brush-visibility"),
};

const outputs = {
  azimuth: document.getElementById("azimuth-value"),
  elevation: document.getElementById("elevation-value"),
  distance: document.getElementById("distance-value"),
  shadow: document.getElementById("shadow-value"),
  ambient: document.getElementById("ambient-value"),
  intensity: document.getElementById("intensity-value"),
  mode: document.getElementById("mode-value"),
  brushRoughness: document.getElementById("brush-roughness-value"),
  brushSpecular: document.getElementById("brush-specular-value"),
  brushRadius: document.getElementById("brush-radius-value"),
  brushThickness: document.getElementById("brush-thickness-value"),
  brushOpacity: document.getElementById("brush-opacity-value"),
  brushNormalAngle: document.getElementById("brush-normal-angle-value"),
  brushVisibility: document.getElementById("brush-visibility-value"),
};

const modeNames = ["Original", "Visibility", "Shadowed", "Relit"];
const modeDescriptions = [
  "Unmodified color from the source SOG.",
  "Raw directional visibility reconstructed from SH3.",
  "Ambient tint plus visibility-shadowed direct light.",
  "Visibility, shortest-axis normals, and painted GGX material response.",
];
const paintDescriptions = [
  "Paints a non-destructive per-Gaussian color layer before lighting.",
  "Adds a per-Gaussian clearcoat with painted roughness and interactive highlights.",
];
const colorPaintDescriptions = {
  [RvisSurfaceColorMode.SOLID]:
    "Applies the selected color uniformly for graphic, flat coverage.",
  [RvisSurfaceColorMode.TINT]:
    "Colorizes the surface while preserving reconstructed luminance and SH detail.",
};

function sphericalDirection(azimuthDegrees, elevationDegrees) {
  const azimuth = THREE.MathUtils.degToRad(azimuthDegrees);
  const elevation = THREE.MathUtils.degToRad(elevationDegrees);
  const horizontal = Math.cos(elevation);
  return new THREE.Vector3(
    Math.sin(azimuth) * horizontal,
    Math.sin(elevation),
    Math.cos(azimuth) * horizontal,
  ).normalize();
}

function renderHdriPresets() {
  const fragment = document.createDocumentFragment();
  for (const preset of HDRI_PRESETS) {
    const button = document.createElement("button");
    button.className = "hdri-preset";
    button.type = "button";
    button.dataset.hdriPreset = preset.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    const label = document.createElement("span");
    label.textContent = preset.label;
    const detail = document.createElement("small");
    detail.textContent = preset.detail;
    button.append(label, detail);
    fragment.append(button);
  }
  hdriPresetList.replaceChildren(fragment);
}

function updateHdriPresetState(disabled = false) {
  for (const button of hdriPresetList.querySelectorAll("[data-hdri-preset]")) {
    button.disabled = disabled;
    button.setAttribute(
      "aria-selected",
      String(button.dataset.hdriPreset === activeHdriPresetId),
    );
  }
}

function hdriDisplayColor(color) {
  const display = color.clone();
  display.multiplyScalar(1 / Math.max(display.r, display.g, display.b, 1));
  return `#${display.getHexString()}`;
}

function syncEnvironmentBackground() {
  const useEnvironmentLighting = currentLightType === RvisLightType.ENVIRONMENT;
  renderer.toneMapping = useEnvironmentLighting
    ? THREE.ACESFilmicToneMapping
    : THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  const showEnvironment = Boolean(
    useEnvironmentLighting && environmentTexture && hdriBackgroundInput.checked,
  );
  scene.background = showEnvironment
    ? environmentTexture
    : new THREE.Color(activeScene?.background ?? 0x0c0e12);
  scene.backgroundIntensity = showEnvironment ? environmentConfig.intensity : 1;
  scene.backgroundRotation.y = showEnvironment
    ? THREE.MathUtils.degToRad(environmentConfig.rotation)
    : 0;
}

function updateEnvironmentLighting({ regenerate = true } = {}) {
  hdriRotationOutput.value = `${Math.round(environmentConfig.rotation)}°`;
  hdriIntensityOutput.value = environmentConfig.intensity.toFixed(2);
  syncEnvironmentBackground();
  if (!lighting || !splat || !environmentAnalysis) return;

  const count = Math.min(
    environmentAnalysis.lights.length,
    RVIS_MAX_ENVIRONMENT_LIGHTS,
  );
  splat
    .getWorldQuaternion(environmentInverseModelQuaternion)
    .invert()
    .normalize();
  for (let index = 0; index < RVIS_MAX_ENVIRONMENT_LIGHTS; index++) {
    const target = lighting.environmentLights[index];
    const source = environmentAnalysis.lights[index];
    if (source && index < count) {
      target.direction
        .copy(source.direction)
        .applyAxisAngle(
          environmentUp,
          THREE.MathUtils.degToRad(environmentConfig.rotation),
        )
        .applyQuaternion(environmentInverseModelQuaternion)
        .normalize();
      target.color.copy(source.color);
      target.intensity = source.intensity;
    } else {
      target.color.setRGB(0, 0, 0);
      target.intensity = 0;
    }
  }
  lighting.environmentLightCount = count;
  lighting.intensity = environmentConfig.intensity;
  if (regenerate) {
    lightingUpdatePending = true;
    updateGroundShadowLighting();
  }
}

async function loadHdriTexture(url, name, presetId, fileExtension) {
  const loadToken = ++environmentLoadToken;
  activeHdriPresetId = presetId;
  updateHdriPresetState(true);
  hdriStatus.classList.remove("error");
  hdriStatus.textContent = `Loading ${name}…`;
  try {
    const cleanUrl =
      fileExtension?.toLowerCase() ?? url.split(/[?#]/)[0].toLowerCase();
    const loader = cleanUrl.endsWith(".exr") ? exrLoader : hdrLoader;
    const texture = await loader.loadAsync(url);
    if (loadToken !== environmentLoadToken) {
      texture.dispose();
      return;
    }
    const { data, width, height } = texture.image;
    if (!(data instanceof Float32Array)) {
      texture.dispose();
      throw new Error("HDRI loader did not produce floating-point pixels");
    }
    const analysis = analyzeRvisEnvironment(data, width, height, {
      lightCount: RVIS_MAX_ENVIRONMENT_LIGHTS,
    });
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    environmentTexture?.dispose();
    environmentTexture = texture;
    environmentAnalysis = analysis;
    inputs.ambientColor.value = hdriDisplayColor(analysis.ambientColor);
    inputs.ambient.value = "0.08";
    environmentConfig.rotation = Number(hdriRotationInput.value);
    environmentConfig.intensity = Number(hdriIntensityInput.value);
    hdriStatus.textContent = `${name} · ${analysis.lights.length} RVIS lobes · ${width}×${height}`;
    updateHdriPresetState(false);
    updateLight({ readControls: false });
  } catch (error) {
    if (loadToken !== environmentLoadToken) return;
    console.error(error);
    activeHdriPresetId = undefined;
    updateHdriPresetState(false);
    hdriStatus.classList.add("error");
    hdriStatus.textContent =
      error instanceof Error ? error.message : String(error);
  }
}

function loadHdriPreset(preset) {
  hdriCredit.hidden = false;
  hdriCredit.href = preset.source;
  hdriCredit.textContent = `${preset.label} · CC0 Poly Haven ↗`;
  return loadHdriTexture(assetUrl(preset.url), preset.label, preset.id);
}

function createPointLightGizmo(id, color) {
  const helper = new THREE.Mesh(
    pointSphereGeometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  helper.visible = false;
  helper.renderOrder = 1002;
  helper.userData.pointLightId = id;

  const ring = new THREE.Mesh(
    pointRingGeometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.58,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  ring.visible = false;
  ring.renderOrder = 1001;
  ring.userData.pointLightId = id;

  const guidePositions = new Float32Array(6);
  const guideGeometry = new THREE.BufferGeometry();
  guideGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(guidePositions, 3),
  );
  const guide = new THREE.Line(
    guideGeometry,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  guide.visible = false;
  guide.frustumCulled = false;
  guide.renderOrder = 1000;
  gizmoScene.add(guide, ring, helper);
  return { helper, ring, guide, guidePositions };
}

function disposePointLightGizmo(gizmo) {
  gizmoScene.remove(gizmo.guide, gizmo.ring, gizmo.helper);
  gizmo.guide.geometry.dispose();
  gizmo.guide.material.dispose();
  gizmo.ring.material.dispose();
  gizmo.helper.material.dispose();
}

function syncPointGizmoVisibility() {
  const visible = Boolean(splat) && currentLightType === RvisLightType.POINT;
  for (const config of pointLightConfigs) {
    config.gizmo.helper.visible = visible;
    config.gizmo.ring.visible = visible;
    config.gizmo.guide.visible = visible;
  }
}

function activeLightConfig() {
  if (currentLightType === RvisLightType.ENVIRONMENT) return undefined;
  if (currentLightType !== RvisLightType.POINT) return directionalLightConfig;
  return (
    pointLightConfigs.find((entry) => entry.id === selectedPointLightId) ??
    pointLightConfigs[0]
  );
}

function readActiveLightControls() {
  const config = activeLightConfig();
  if (!config) return;
  config.azimuth = Number(inputs.azimuth.value);
  config.elevation = Number(inputs.elevation.value);
  config.color = inputs.color.value;
  config.intensity = Number(inputs.intensity.value);
  if (currentLightType === RvisLightType.POINT) {
    config.distance = Number(inputs.distance.value);
  }
}

function syncActiveLightControls() {
  const config = activeLightConfig();
  if (!config) return;
  inputs.azimuth.value = String(config.azimuth);
  inputs.elevation.value = String(config.elevation);
  inputs.color.value = config.color;
  inputs.intensity.value = String(config.intensity);
  directColorDot.style.backgroundColor = config.color;
  if (currentLightType === RvisLightType.POINT) {
    inputs.distance.value = String(config.distance);
    const index = pointLightConfigs.indexOf(config);
    directLightLabel.textContent = `Point light ${index + 1}`;
  } else {
    directLightLabel.textContent = "Directional light";
  }
}

function revealLightEditor() {
  requestAnimationFrame(() => {
    lightEditor.scrollIntoView({ block: "nearest" });
  });
}

function updatePointLightListState() {
  for (const item of pointLightList.querySelectorAll("[data-point-light]")) {
    const config = pointLightConfigs.find(
      (entry) => entry.id === item.dataset.pointLight,
    );
    item.setAttribute(
      "aria-selected",
      String(config?.id === selectedPointLightId),
    );
    const swatch = item.querySelector(".point-light-swatch");
    if (swatch && config) swatch.style.backgroundColor = config.color;
  }
}

function renderPointLightList() {
  const fragment = document.createDocumentFragment();
  pointLightConfigs.forEach((config, index) => {
    const item = document.createElement("div");
    item.className = "point-light-item";
    item.dataset.pointLight = config.id;
    item.setAttribute("role", "option");
    item.setAttribute(
      "aria-selected",
      String(config.id === selectedPointLightId),
    );

    const select = document.createElement("button");
    select.className = "point-light-select";
    select.type = "button";
    select.dataset.selectPointLight = config.id;
    const swatch = document.createElement("span");
    swatch.className = "point-light-swatch";
    swatch.style.backgroundColor = config.color;
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = `Point light ${index + 1}`;
    select.append(swatch, label);

    const remove = document.createElement("button");
    remove.className = "remove-light-button";
    remove.type = "button";
    remove.dataset.removePointLight = config.id;
    remove.disabled = pointLightConfigs.length === 1;
    remove.setAttribute("aria-label", `Remove point light ${index + 1}`);
    remove.textContent = "×";
    item.append(select, remove);
    fragment.append(item);
  });
  pointLightList.replaceChildren(fragment);
  pointLightCount.value = `${pointLightConfigs.length} / ${RVIS_MAX_POINT_LIGHTS} lights`;
  addPointLightButton.disabled =
    pointLightConfigs.length >= RVIS_MAX_POINT_LIGHTS;
}

function addPointLight({ switchToPoint = true, reveal = true } = {}) {
  if (pointLightConfigs.length >= RVIS_MAX_POINT_LIGHTS) return;
  const palette = ["#ffe8c7", "#9ed0ff", "#ff9ea9", "#baffad"];
  const index = pointLightConfigs.length;
  const id = `point-light-${nextPointLightId++}`;
  const config = {
    id,
    azimuth: 35 + index * 72,
    elevation: Math.max(18, 48 - index * 8),
    distance: 1.2,
    color: palette[index],
    intensity: index === 0 ? 1 : 0.65,
    gizmo: createPointLightGizmo(id, palette[index]),
  };
  pointLightConfigs.push(config);
  selectedPointLightId = id;
  renderPointLightList();
  if (switchToPoint && currentLightType !== RvisLightType.POINT) {
    setLightType(RvisLightType.POINT);
  } else {
    syncActiveLightControls();
    updateLight({ readControls: false });
  }
  if (reveal) revealLightEditor();
}

function removePointLight(id) {
  if (pointLightConfigs.length <= 1) return;
  const index = pointLightConfigs.findIndex((entry) => entry.id === id);
  if (index < 0) return;
  const [removed] = pointLightConfigs.splice(index, 1);
  disposePointLightGizmo(removed.gizmo);
  if (selectedPointLightId === id) {
    selectedPointLightId =
      pointLightConfigs[Math.min(index, pointLightConfigs.length - 1)].id;
  }
  if (hoveredPointLightId === id) {
    hoveredPointLightId = undefined;
    canvas.classList.remove("point-light-hover");
  }
  renderPointLightList();
  syncActiveLightControls();
  updateLight({ readControls: false });
  revealLightEditor();
}

function selectPointLight(id, { reveal = true } = {}) {
  if (!pointLightConfigs.some((entry) => entry.id === id)) return;
  selectedPointLightId = id;
  renderPointLightList();
  syncActiveLightControls();
  updateLight({ readControls: false });
  if (reveal) revealLightEditor();
}

function updateLight({ regenerate = true, readControls = true } = {}) {
  if (readControls) readActiveLightControls();

  outputs.azimuth.value = `${Math.round(Number(inputs.azimuth.value))}°`;
  outputs.elevation.value = `${Math.round(Number(inputs.elevation.value))}°`;
  outputs.distance.value = `${Number(inputs.distance.value).toFixed(2)}×`;
  outputs.shadow.value = `${Math.round(Number(inputs.shadow.value) * 100)}%`;
  outputs.ambient.value = `${Math.round(Number(inputs.ambient.value) * 100)}%`;
  outputs.intensity.value = Number(inputs.intensity.value).toFixed(2);
  updatePointLightListState();

  if (!lighting || !splat) return;
  syncPointGizmoVisibility();

  const directionalDirection = sphericalDirection(
    directionalLightConfig.azimuth,
    directionalLightConfig.elevation,
  );
  lighting.lightDirection.copy(directionalDirection);
  lighting.lightColor.set(directionalLightConfig.color);
  if (currentLightType !== RvisLightType.ENVIRONMENT) {
    lighting.intensity = directionalLightConfig.intensity;
  }
  lighting.pointLightCount = pointLightConfigs.length;
  pointLightConfigs.forEach((config, index) => {
    const pointLight = lighting.pointLights[index];
    pointLight.position
      .copy(modelCenter)
      .addScaledVector(
        sphericalDirection(config.azimuth, config.elevation),
        modelRadius * config.distance,
      );
    pointLight.color.set(config.color);
    pointLight.intensity = config.intensity;
  });
  lighting.ambientColor.set(inputs.ambientColor.value);
  lighting.shadowStrength = Number(inputs.shadow.value);
  lighting.ambient = Number(inputs.ambient.value);
  if (currentLightType === RvisLightType.ENVIRONMENT) {
    updateEnvironmentLighting({ regenerate: false });
  }

  const modelQuaternion = splat.getWorldQuaternion(new THREE.Quaternion());
  const worldDirection = directionalDirection
    .clone()
    .applyQuaternion(modelQuaternion)
    .normalize();
  const worldCenter = splat.localToWorld(modelCenter.clone());
  lightArrow.position.copy(worldCenter);
  lightArrow.setDirection(worldDirection);
  lightArrow.setLength(
    modelRadius * 0.38,
    modelRadius * 0.07,
    modelRadius * 0.035,
  );

  pointLightConfigs.forEach((config, index) => {
    const pointLight = lighting.pointLights[index];
    const { helper, ring, guide, guidePositions } = config.gizmo;
    helper.position.copy(splat.localToWorld(pointLight.position.clone()));
    ring.position.copy(helper.position);
    helper.material.color.copy(pointLight.color);
    ring.material.color.copy(pointLight.color);
    guide.material.color.copy(pointLight.color);
    worldCenter.toArray(guidePositions, 0);
    helper.position.toArray(guidePositions, 3);
    guide.geometry.attributes.position.needsUpdate = true;
  });
  updatePointGizmoAppearance();
  updateGroundShadowLighting();

  if (regenerate) lightingUpdatePending = true;
}

function updatePointGizmoAppearance() {
  for (const config of pointLightConfigs) {
    const { helper, ring } = config.gizmo;
    if (!helper.visible) continue;
    const isSelected = config.id === selectedPointLightId;
    const isHovered = config.id === hoveredPointLightId;
    const isDragging = config.id === draggedPointLightId;
    const distanceToCamera = camera.position.distanceTo(helper.position);
    const visibleWorldHeight =
      2 *
      distanceToCamera *
      Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const worldUnitsPerPixel =
      visibleWorldHeight / Math.max(canvas.clientHeight, 1);
    const interactionScale = isDragging ? 1.18 : isHovered ? 1.1 : 1;
    const gizmoScale = (worldUnitsPerPixel * 9 * interactionScale) / 0.04;
    helper.scale.setScalar(gizmoScale);
    ring.scale.setScalar(gizmoScale);
    ring.quaternion.copy(camera.quaternion);
    helper.material.opacity = isSelected ? 1 : 0.72;
    ring.material.opacity = isDragging
      ? 0.98
      : isHovered
        ? 0.82
        : isSelected
          ? 0.68
          : 0.3;
  }
}

function updatePointerRay(event) {
  const bounds = canvas.getBoundingClientRect();
  pointerNdc.set(
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
  );
  pointerRaycaster.setFromCamera(pointerNdc, camera);
}

function getSourceSplat(index) {
  return (
    splat?.packedSplats?.getSplat(index) ?? splat?.extSplats?.getSplat(index)
  );
}

function getShortestAxisNormal(scales, quaternion, target) {
  if (scales.z <= scales.x && scales.z <= scales.y) {
    target.set(0, 0, 1);
  } else if (scales.y <= scales.x) {
    target.set(0, 1, 0);
  } else {
    target.set(1, 0, 0);
  }
  return target.applyQuaternion(quaternion).normalize();
}

function updateBrushCursor(event, visible) {
  brushCursor.classList.toggle("visible", visible && paintEnabled);
  const erasing = currentPaintTool === PaintInteractionTool.ERASER;
  brushCursor.classList.toggle("eraser", erasing);
  if (!visible) return;
  const bounds = canvas.getBoundingClientRect();
  brushCursor.style.left = `${event.clientX - bounds.left}px`;
  brushCursor.style.top = `${event.clientY - bounds.top}px`;
  brushCursor.style.color = erasing
    ? "#ffffff"
    : currentPaintMode === RvisSurfacePaintMode.MATERIAL
      ? "#f4b96a"
      : inputs.paintColor.value;
}

function getActivePaintFilters() {
  return Object.values(paintFilters).filter(({ toggle }) => toggle.checked);
}

function getPaintFilterLabel() {
  const activeFilters = getActivePaintFilters();
  return activeFilters.length > 0
    ? activeFilters.map(({ label }) => label).join(" + ")
    : "off";
}

function updatePaintDescription() {
  const activeFilters = getActivePaintFilters();
  const filterDescription =
    activeFilters.length > 0
      ? `Active filters: ${activeFilters.map(({ label }) => label).join(", ")}.`
      : "All candidate filters are off; only brush radius and flow remain, so hidden and back splats can be painted.";
  const modeDescription =
    currentPaintMode === RvisSurfacePaintMode.COLOR
      ? colorPaintDescriptions[currentPaintColorMode]
      : paintDescriptions[currentPaintMode];
  paintDescription.textContent = `${modeDescription} ${filterDescription}`;
}

function updateSurfacePainterControls() {
  outputs.brushRoughness.value = `${Math.round(
    Number(inputs.brushRoughness.value) * 100,
  )}%`;
  outputs.brushSpecular.value = `${Math.round(
    Number(inputs.brushSpecular.value) * 100,
  )}%`;
  outputs.brushRadius.value = `${(
    Number(inputs.brushRadius.value) * 100
  ).toFixed(1)}%`;
  outputs.brushThickness.value = `${Math.round(
    Number(inputs.brushThickness.value) * 100,
  )}%`;
  outputs.brushOpacity.value = `${Math.round(
    Number(inputs.brushOpacity.value) * 100,
  )}%`;
  outputs.brushNormalAngle.value = `${Math.round(
    Number(inputs.brushNormalAngle.value),
  )}°`;
  outputs.brushVisibility.value = `${Math.round(
    Number(inputs.brushVisibility.value) * 100,
  )}%`;

  for (const filter of Object.values(paintFilters)) {
    const enabled = filter.toggle.checked;
    filter.state.textContent = enabled ? "On" : "Off";
    for (const control of document.querySelectorAll(filter.controlSelector)) {
      control.classList.toggle("filters-disabled", !enabled);
      const input = control.querySelector("input");
      if (input) input.disabled = !enabled;
    }
  }
  updatePaintDescription();

  if (!surfacePainter) return;
  surfacePainter.mode = currentPaintMode;
  surfacePainter.tool =
    currentPaintTool === PaintInteractionTool.ERASER
      ? RvisSurfacePaintTool.ERASER
      : RvisSurfacePaintTool.BRUSH;
  surfacePainter.thicknessFilterEnabled = paintFilters.thickness.toggle.checked;
  surfacePainter.normalFilterEnabled = paintFilters.normal.toggle.checked;
  surfacePainter.visibilityFilterEnabled =
    paintFilters.visibility.toggle.checked;
  surfacePainter.colorMode = currentPaintColorMode;
  surfacePainter.color.set(inputs.paintColor.value);
  surfacePainter.roughness = Number(inputs.brushRoughness.value);
  surfacePainter.specular = Number(inputs.brushSpecular.value);
  surfacePainter.radius = modelRadius * Number(inputs.brushRadius.value);
  surfacePainter.thickness =
    surfacePainter.radius * Number(inputs.brushThickness.value);
  surfacePainter.opacity = Number(inputs.brushOpacity.value);
  surfacePainter.normalAngle = Number(inputs.brushNormalAngle.value);
  surfacePainter.visibilityThreshold = Number(inputs.brushVisibility.value);
}

function hexColorToHsl(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return undefined;
  const packed = Number.parseInt(match[1], 16);
  const red = ((packed >> 16) & 0xff) / 255;
  const green = ((packed >> 8) & 0xff) / 255;
  const blue = (packed & 0xff) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  const lightness = (maximum + minimum) * 0.5;
  let hue = 0;
  let saturation = 0;

  if (delta > 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (maximum === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (maximum === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    hue: (hue + 360) % 360,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
}

function hslToHexColor(hue, saturation, lightness) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const normalizedSaturation = THREE.MathUtils.clamp(saturation / 100, 0, 1);
  const normalizedLightness = THREE.MathUtils.clamp(lightness / 100, 0, 1);
  const chroma =
    (1 - Math.abs(2 * normalizedLightness - 1)) * normalizedSaturation;
  const section = normalizedHue / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (section < 1) {
    red = chroma;
    green = secondary;
  } else if (section < 2) {
    red = secondary;
    green = chroma;
  } else if (section < 3) {
    green = chroma;
    blue = secondary;
  } else if (section < 4) {
    green = secondary;
    blue = chroma;
  } else if (section < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const offset = normalizedLightness - chroma * 0.5;
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + offset) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function syncPaintColorChannels() {
  const hsl = hexColorToHsl(inputs.paintColor.value);
  if (!hsl) return;
  const hue = Math.round(hsl.hue);
  const saturation = Math.round(hsl.saturation);
  const lightness = Math.round(hsl.lightness);
  paintColorHueInput.value = String(hue);
  paintColorSaturationInput.value = String(saturation);
  paintColorLightnessInput.value = String(lightness);
  paintColorHueOutput.textContent = `${hue}°`;
  paintColorSaturationOutput.textContent = `${saturation}%`;
  paintColorLightnessOutput.textContent = `${lightness}%`;
}

function updatePaintColorFromChannels() {
  const hue = Number(paintColorHueInput.value);
  const saturation = Number(paintColorSaturationInput.value);
  const lightness = Number(paintColorLightnessInput.value);
  inputs.paintColor.value = hslToHexColor(hue, saturation, lightness);
  paintColorHueOutput.textContent = `${Math.round(hue)}°`;
  paintColorSaturationOutput.textContent = `${Math.round(saturation)}%`;
  paintColorLightnessOutput.textContent = `${Math.round(lightness)}%`;
  updateSurfacePainterControls();
}

function setPaintColorMode(mode) {
  const nextMode = Number(mode);
  if (
    nextMode !== RvisSurfaceColorMode.SOLID &&
    nextMode !== RvisSurfaceColorMode.TINT
  ) {
    return;
  }
  currentPaintColorMode = nextMode;
  for (const button of paintColorModeControl.querySelectorAll("button")) {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.paintColorMode) === nextMode),
    );
  }
  if (surfacePainter) surfacePainter.colorMode = nextMode;
  updatePaintDescription();
}

function setPaintMode(mode) {
  currentPaintMode = Number(mode);
  const materialMode = currentPaintMode === RvisSurfacePaintMode.MATERIAL;
  for (const button of paintModeControl.querySelectorAll("button")) {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.paintMode) === currentPaintMode),
    );
  }
  for (const button of paintColorModeControl.querySelectorAll("button")) {
    button.disabled = materialMode;
  }
  for (const element of document.querySelectorAll(".color-paint-only")) {
    element.hidden = materialMode;
  }
  for (const element of document.querySelectorAll(".material-paint-only")) {
    element.hidden = !materialMode;
  }
  updatePaintDescription();
  if (surfacePainter) surfacePainter.mode = currentPaintMode;
  if (materialMode && currentMode !== RvisDisplayMode.RELIT) {
    setMode(RvisDisplayMode.RELIT);
  }
  updatePaintInteractionCopy();
}

function updatePaintInteractionCopy() {
  const filterLabel = getPaintFilterLabel();
  const materialMode = currentPaintMode === RvisSurfacePaintMode.MATERIAL;
  const targetLabel = materialMode ? "material" : "color";
  const toolLabel =
    currentPaintTool === PaintInteractionTool.BRUSH
      ? "Brush"
      : currentPaintTool === PaintInteractionTool.ERASER
        ? "Eraser"
        : "View";
  paintToggle.textContent = toolLabel;
  paintToggle.setAttribute("aria-pressed", String(paintEnabled));

  if (currentPaintTool === PaintInteractionTool.VIEW) {
    paintHelp.textContent =
      "View active · Press B to paint or X to erase. Camera and light controls are enabled.";
  } else if (currentPaintTool === PaintInteractionTool.ERASER) {
    paintHelp.textContent = `Drag to restore source ${targetLabel} · Filters: ${filterLabel}.`;
  } else {
    paintHelp.textContent = `Drag to paint ${targetLabel} · Filters: ${filterLabel}.`;
  }

  viewportHint.textContent = paintEnabled
    ? `${toolLabel} ${targetLabel} · Filters: ${filterLabel} · V returns to view`
    : currentLightType === RvisLightType.POINT
      ? "B brush · X eraser · V view · Select/drag light · WASD/QE move"
      : "B brush · X eraser · V view · WASD/QE move · Arrows look · 1–4 mode";
}

function setPaintEnabled(enabled) {
  paintEnabled = Boolean(enabled && surfacePainter && splat);
  canvas.classList.toggle("paint-enabled", paintEnabled);
  controls.enabled = !paintEnabled && !pointLightDragging;
  if (!paintEnabled) {
    const capturedPointerId = paintPointerId;
    paintDragging = false;
    paintPointerId = null;
    if (
      capturedPointerId !== null &&
      canvas.hasPointerCapture(capturedPointerId)
    ) {
      canvas.releasePointerCapture(capturedPointerId);
    }
    canvas.classList.remove("paint-dragging");
    brushCursor.classList.remove("visible");
    controls.enabled = Boolean(splat) && !pointLightDragging;
  }
  updatePaintInteractionCopy();
}

function setPaintTool(tool) {
  const nextTool = Number(tool);
  if (
    nextTool !== PaintInteractionTool.VIEW &&
    nextTool !== PaintInteractionTool.BRUSH &&
    nextTool !== PaintInteractionTool.ERASER
  ) {
    return;
  }
  if (nextTool !== PaintInteractionTool.VIEW && (!surfacePainter || !splat)) {
    return;
  }

  currentPaintTool = nextTool;
  if (nextTool !== PaintInteractionTool.VIEW) lastPaintTool = nextTool;
  if (surfacePainter) {
    surfacePainter.tool =
      nextTool === PaintInteractionTool.ERASER
        ? RvisSurfacePaintTool.ERASER
        : RvisSurfacePaintTool.BRUSH;
  }
  for (const button of paintToolControl.querySelectorAll("button")) {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.paintTool) === nextTool),
    );
  }
  brushCursor.classList.toggle(
    "eraser",
    nextTool === PaintInteractionTool.ERASER,
  );
  setPaintEnabled(nextTool !== PaintInteractionTool.VIEW);
}

function prepareBrushStamp(event) {
  if (!surfacePainter || !splat) return false;
  updatePointerRay(event);
  const hit = pointerRaycaster.intersectObject(splat, false)[0];
  if (!hit || !Number.isInteger(hit.splatIndex)) {
    updateBrushCursor(event, false);
    paintHelp.textContent = "No paintable surface under the pointer.";
    return false;
  }

  const sourceSplat = getSourceSplat(hit.splatIndex);
  if (!sourceSplat) return false;
  brushHitLocal.copy(hit.point);
  splat.worldToLocal(brushHitLocal);
  getShortestAxisNormal(
    sourceSplat.scales,
    sourceSplat.quaternion,
    brushNormal,
  );
  splat.worldToLocal(brushCameraPosition.copy(camera.position));
  brushAxis.copy(brushCameraPosition).sub(sourceSplat.center);
  if (brushNormal.dot(brushAxis) < 0) brushNormal.negate();

  surfacePainter.setBrush({
    center: brushHitLocal,
    normal: brushNormal,
    cameraPosition: brushCameraPosition,
  });
  updateBrushCursor(event, true);
  const action =
    currentPaintTool === PaintInteractionTool.ERASER ? "erase" : "paint";
  const target =
    currentPaintMode === RvisSurfacePaintMode.MATERIAL ? "material" : "color";
  paintHelp.textContent = `Surface ${hit.splatIndex.toLocaleString()} · ${action} ${target} · filters: ${getPaintFilterLabel()}`;
  return true;
}

function requestBrushStamp(event, force = false) {
  const pixelDistance = Math.hypot(
    event.clientX - lastPaintClientX,
    event.clientY - lastPaintClientY,
  );
  if (!force && pixelDistance < 3) return;
  if (!prepareBrushStamp(event)) return;
  lastPaintClientX = event.clientX;
  lastPaintClientY = event.clientY;
  surfacePainter.requestStamp();
}

function finishPaintDrag(event) {
  if (!paintDragging || event.pointerId !== paintPointerId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  paintDragging = false;
  paintPointerId = null;
  controls.enabled = !paintEnabled;
  canvas.classList.remove("paint-dragging");
}

function bindSurfacePainting() {
  paintToggle.addEventListener("click", () => {
    setPaintTool(
      currentPaintTool === PaintInteractionTool.VIEW
        ? lastPaintTool
        : PaintInteractionTool.VIEW,
    );
  });
  paintToolControl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-paint-tool]");
    if (button) setPaintTool(button.dataset.paintTool);
  });
  for (const { toggle } of Object.values(paintFilters)) {
    toggle.addEventListener("change", () => {
      updateSurfacePainterControls();
      setPaintMode(currentPaintMode);
      setPaintEnabled(paintEnabled);
    });
  }
  for (const button of paintModeControl.querySelectorAll("button")) {
    button.addEventListener("click", () =>
      setPaintMode(button.dataset.paintMode),
    );
  }
  for (const button of paintColorModeControl.querySelectorAll("button")) {
    button.addEventListener("click", () =>
      setPaintColorMode(button.dataset.paintColorMode),
    );
  }
  for (const input of [
    inputs.paintColor,
    inputs.brushRoughness,
    inputs.brushSpecular,
    inputs.brushRadius,
    inputs.brushThickness,
    inputs.brushOpacity,
    inputs.brushNormalAngle,
    inputs.brushVisibility,
  ]) {
    input.addEventListener("input", updateSurfacePainterControls);
  }
  inputs.paintColor.addEventListener("input", syncPaintColorChannels);
  for (const input of [
    paintColorHueInput,
    paintColorSaturationInput,
    paintColorLightnessInput,
  ]) {
    input.addEventListener("input", updatePaintColorFromChannels);
  }
  syncPaintColorChannels();
  setPaintColorMode(currentPaintColorMode);
  setPaintMode(currentPaintMode);
  setPaintTool(PaintInteractionTool.VIEW);

  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (
        !paintEnabled ||
        !surfacePainter ||
        event.button !== 0 ||
        !event.isPrimary
      ) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      paintDragging = true;
      paintPointerId = event.pointerId;
      lastPaintClientX = Number.NaN;
      lastPaintClientY = Number.NaN;
      controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("paint-dragging");
      requestBrushStamp(event, true);
    },
    { capture: true },
  );

  canvas.addEventListener(
    "pointermove",
    (event) => {
      if (!paintEnabled || !surfacePainter) return;
      if (paintDragging && event.pointerId === paintPointerId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestBrushStamp(event);
      } else {
        prepareBrushStamp(event);
      }
    },
    { capture: true },
  );

  canvas.addEventListener("pointerup", finishPaintDrag, { capture: true });
  canvas.addEventListener("pointercancel", finishPaintDrag, {
    capture: true,
  });
  canvas.addEventListener("lostpointercapture", finishPaintDrag, {
    capture: true,
  });
  canvas.addEventListener("pointerleave", () => {
    if (!paintDragging) brushCursor.classList.remove("visible");
  });
}

function disposeSurfacePainter() {
  if (!surfacePainter) return;
  surfacePainter.dispose();
  surfacePainter = undefined;
}

function intersectPointGizmo() {
  const targets = [];
  for (const config of pointLightConfigs) {
    config.gizmo.helper.updateMatrixWorld();
    config.gizmo.ring.updateMatrixWorld();
    targets.push(config.gizmo.helper, config.gizmo.ring);
  }
  return pointerRaycaster.intersectObjects(targets, false)[0]?.object.userData
    .pointLightId;
}

function syncPointLightConfigFromPosition(config, localPosition) {
  const offset = localPosition.clone().sub(modelCenter);
  const distance = Math.max(offset.length(), Number.EPSILON);
  const direction = offset.divideScalar(distance);
  config.azimuth = THREE.MathUtils.radToDeg(
    Math.atan2(direction.x, direction.z),
  );
  config.elevation = THREE.MathUtils.radToDeg(
    Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)),
  );
  config.distance = distance / modelRadius;
}

function setPointLightHovered(id) {
  if (hoveredPointLightId === id) return;
  hoveredPointLightId = id;
  canvas.classList.toggle("point-light-hover", Boolean(id));
  updatePointGizmoAppearance();
}

function finishPointLightDrag(event) {
  if (!pointLightDragging || event.pointerId !== pointDragPointerId) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
  pointDragPointerId = null;
  pointLightDragging = false;
  draggedPointLightId = undefined;
  controls.enabled = true;
  canvas.classList.remove("point-light-dragging");
  setPointLightHovered(undefined);
  updatePointGizmoAppearance();
}

function bindPointLightDrag() {
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.button !== 0 ||
        !event.isPrimary ||
        paintEnabled ||
        currentLightType !== RvisLightType.POINT ||
        pointLightDragging
      ) {
        return;
      }
      updatePointerRay(event);
      const pointLightId = intersectPointGizmo();
      if (!pointLightId) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      selectPointLight(pointLightId);
      autoLight = false;
      autoLightButton.setAttribute("aria-pressed", "false");
      pointLightDragging = true;
      draggedPointLightId = pointLightId;
      pointDragPointerId = event.pointerId;
      controls.enabled = false;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("point-light-dragging");

      const config = pointLightConfigs.find(
        (entry) => entry.id === pointLightId,
      );
      pointDragPlane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection(new THREE.Vector3()),
        config.gizmo.helper.position,
      );
      if (pointerRaycaster.ray.intersectPlane(pointDragPlane, pointDragWorld)) {
        pointDragOffset.copy(config.gizmo.helper.position).sub(pointDragWorld);
      } else {
        pointDragOffset.set(0, 0, 0);
      }
      updatePointGizmoAppearance();
    },
    { capture: true },
  );

  canvas.addEventListener(
    "pointermove",
    (event) => {
      updatePointerRay(event);
      if (pointLightDragging && event.pointerId === pointDragPointerId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (
          !pointerRaycaster.ray.intersectPlane(pointDragPlane, pointDragWorld)
        ) {
          return;
        }
        pointDragWorld.add(pointDragOffset);
        splat.updateWorldMatrix(true, false);
        const localPosition = splat.worldToLocal(pointDragWorld.clone());
        const localOffset = localPosition.sub(modelCenter);
        if (localOffset.lengthSq() <= Number.EPSILON) return;

        const minimumDistance = modelRadius * Number(inputs.distance.min);
        const maximumDistance = modelRadius * Number(inputs.distance.max);
        localOffset.setLength(
          THREE.MathUtils.clamp(
            localOffset.length(),
            minimumDistance,
            maximumDistance,
          ),
        );
        const config = pointLightConfigs.find(
          (entry) => entry.id === draggedPointLightId,
        );
        if (!config) return;
        syncPointLightConfigFromPosition(
          config,
          modelCenter.clone().add(localOffset),
        );
        syncActiveLightControls();
        updateLight({ readControls: false });
        return;
      }

      setPointLightHovered(intersectPointGizmo());
    },
    { capture: true },
  );

  canvas.addEventListener("pointerup", finishPointLightDrag, {
    capture: true,
  });
  canvas.addEventListener("pointercancel", finishPointLightDrag, {
    capture: true,
  });
  canvas.addEventListener("lostpointercapture", finishPointLightDrag, {
    capture: true,
  });
  canvas.addEventListener("pointerleave", () => {
    if (!pointLightDragging) setPointLightHovered(undefined);
  });
}

function setMode(mode) {
  currentMode = mode;
  if (lighting) lighting.mode = mode;
  outputs.mode.value = modeNames[mode];
  modeDescription.textContent = modeDescriptions[mode];
  for (const button of document.querySelectorAll("[data-mode]")) {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.mode) === mode),
    );
  }
  lightingUpdatePending = Boolean(lighting);
}

function setLightType(type) {
  currentLightType = type;
  if (lighting) lighting.lightType = type;
  for (const button of document.querySelectorAll("[data-light-type]")) {
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.lightType) === type),
    );
  }
  const isPoint = type === RvisLightType.POINT;
  const isEnvironment = type === RvisLightType.ENVIRONMENT;
  if (!isPoint) setPointLightHovered(undefined);
  for (const element of document.querySelectorAll(".point-only")) {
    element.hidden = !isPoint;
  }
  for (const element of document.querySelectorAll(".hdri-only")) {
    element.hidden = !isEnvironment;
  }
  for (const element of document.querySelectorAll(".local-light-only")) {
    element.hidden = isEnvironment;
  }
  autoLightButton.textContent = isEnvironment ? "Auto rotate" : "Auto orbit";
  lightArrow.visible = Boolean(splat) && type === RvisLightType.DIRECTIONAL;
  syncPointGizmoVisibility();
  syncEnvironmentBackground();
  if (!paintEnabled) {
    viewportHint.textContent = isPoint
      ? "Select or drag a light · WASD/QE move · Arrows look"
      : isEnvironment
        ? "Rotate HDRI to move highlights and baked self-shadow"
        : "WASD/QE move · Arrows look · Shift+←/→ roll · 1–4 mode";
  }
  syncActiveLightControls();
  updateLight({ readControls: false });
  if (isEnvironment && !environmentAnalysis) {
    loadHdriPreset(HDRI_PRESETS[0]);
  }
}

function isEditableTarget(target) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.matches("input, textarea, select, [role='textbox']"))
  );
}

function updateCameraNavigation(deltaSeconds) {
  if (!splat || pointLightDragging || paintEnabled || cameraKeys.size === 0) {
    return;
  }

  cameraViewDirection.copy(controls.target).sub(camera.position);
  const targetDistance = Math.max(cameraViewDirection.length(), 0.001);
  cameraViewDirection.divideScalar(targetDistance);

  const horizontalLookInput =
    Number(cameraKeys.has("ArrowLeft")) - Number(cameraKeys.has("ArrowRight"));
  const shifted = cameraKeys.has("ShiftLeft") || cameraKeys.has("ShiftRight");
  const yawInput = shifted ? 0 : horizontalLookInput;
  const rollInput = shifted ? horizontalLookInput : 0;
  const pitchInput =
    Number(cameraKeys.has("ArrowUp")) - Number(cameraKeys.has("ArrowDown"));
  const lookStep = THREE.MathUtils.degToRad(72) * deltaSeconds;
  if (yawInput !== 0 || pitchInput !== 0 || rollInput !== 0) {
    camera.rotateY(yawInput * lookStep);
    camera.rotateX(pitchInput * lookStep);
    camera.rotateZ(rollInput * lookStep);
    camera.getWorldDirection(cameraViewDirection);
    cameraActualUp.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    camera.up.copy(cameraActualUp);
    controls.target
      .copy(camera.position)
      .addScaledVector(cameraViewDirection, targetDistance);
  }

  const forwardInput =
    Number(cameraKeys.has("KeyW")) - Number(cameraKeys.has("KeyS"));
  const rightInput =
    Number(cameraKeys.has("KeyD")) - Number(cameraKeys.has("KeyA"));
  const verticalInput =
    Number(cameraKeys.has("KeyE")) - Number(cameraKeys.has("KeyQ"));
  if (forwardInput === 0 && rightInput === 0 && verticalInput === 0) return;

  cameraMoveDirection.copy(cameraViewDirection);
  cameraMoveDirection.y = 0;
  if (cameraMoveDirection.lengthSq() < 1e-8) {
    cameraMoveDirection.set(0, 0, -1);
  } else {
    cameraMoveDirection.normalize();
  }
  cameraRight.crossVectors(cameraMoveDirection, worldUp).normalize();
  cameraTranslation
    .set(0, 0, 0)
    .addScaledVector(cameraMoveDirection, forwardInput)
    .addScaledVector(cameraRight, rightInput)
    .addScaledVector(worldUp, verticalInput);
  if (cameraTranslation.lengthSq() > 1) cameraTranslation.normalize();

  const moveSpeed = modelRadius * (shifted ? 3.6 : 0.9);
  cameraTranslation.multiplyScalar(moveSpeed * deltaSeconds);
  camera.position.add(cameraTranslation);
  controls.target.add(cameraTranslation);
}

function fitCamera(sceneConfig) {
  modelCenter.fromArray(sceneConfig.lightCenter);
  modelRadius = sceneConfig.radius;
  worldUp.set(0, 1, 0);
  controls.target.fromArray(sceneConfig.target);
  camera.position.fromArray(sceneConfig.position);
  camera.up.copy(worldUp);
  camera.fov = sceneConfig.fov;
  camera.near = Math.max(modelRadius / 1000, 0.001);
  camera.far = 10_000;
  camera.updateProjectionMatrix();
  controls.minDistance = modelRadius * 0.12;
  controls.maxDistance = modelRadius * 6;
  controls.update();
  syncEnvironmentBackground();
}

function captureCameraView() {
  return {
    position: camera.position.clone(),
    up: camera.up.clone(),
    target: controls.target.clone(),
    fov: camera.fov,
    near: camera.near,
    far: camera.far,
    zoom: camera.zoom,
  };
}

function restoreCameraView(view) {
  camera.position.copy(view.position);
  camera.up.copy(view.up);
  controls.target.copy(view.target);
  camera.fov = view.fov;
  camera.near = view.near;
  camera.far = view.far;
  camera.zoom = view.zoom;
  camera.updateProjectionMatrix();
  controls.update();
}

function populateSceneList() {
  const fragment = document.createDocumentFragment();
  for (const sceneConfig of SCENES) {
    const button = document.createElement("button");
    button.className = "scene-option";
    button.type = "button";
    button.dataset.scene = sceneConfig.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");

    const label = document.createElement("span");
    label.textContent = sceneConfig.label;
    const detail = document.createElement("small");
    detail.textContent = sceneConfig.detail;
    button.append(label, detail);
    fragment.append(button);
  }
  sceneList.replaceChildren(fragment);
  sceneTotal.value = `${SCENES.length} available`;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${unit}`;
}

function localFileLabel(file, fallback) {
  return file ? `${file.name} · ${formatFileSize(file.size)}` : fallback;
}

function updateLocalImportControls() {
  localSogName.textContent = localFileLabel(
    selectedLocalSogFile,
    "Choose .sog",
  );
  localRvisName.textContent = localFileLabel(
    selectedLocalRvisFile,
    "Choose .rvis",
  );
  loadLocalSceneButton.disabled =
    sceneLoading || !selectedLocalSogFile || !selectedLocalRvisFile;
  if (localImportError) {
    localImportStatus.classList.add("error");
    localImportStatus.textContent = localImportError;
    return;
  }
  localImportStatus.classList.remove("error");
  if (sceneLoading) {
    localImportStatus.textContent = "A scene is currently loading…";
  } else if (selectedLocalSogFile && selectedLocalRvisFile) {
    localImportStatus.textContent =
      "Ready to open · files never leave this browser.";
  } else if (selectedLocalSogFile || selectedLocalRvisFile) {
    localImportStatus.textContent = "Choose the matching SOG and RVIS file.";
  } else {
    localImportStatus.textContent =
      "Files stay in this browser and are never uploaded.";
  }
}

function selectLocalFile(input, extension, assign) {
  localImportError = undefined;
  const [file] = input.files ?? [];
  if (file && !file.name.toLowerCase().endsWith(extension)) {
    assign(undefined);
    input.value = "";
    localImportError = `Choose a ${extension} file.`;
    updateLocalImportControls();
    return;
  }
  assign(file);
  updateLocalImportControls();
}

function createLocalSceneConfig(sogFile, rvisFile) {
  const label = sogFile.name.replace(/\.sog$/i, "") || "Local scene";
  return {
    id: `local:${label}`,
    label,
    detail: `Local · ${formatFileSize(sogFile.size + rvisFile.size)}`,
    visibilityVariants: [
      {
        id: "local",
        label: "Local RVIS",
        detail: rvisFile.name,
        rvis: "",
      },
    ],
    defaultVisibilityVariant: "local",
    background: 0x0c0e12,
    position: [0, 0.25, 2.4],
    target: [0, 0, 0],
    lightCenter: [0, 0, 0],
    radius: 1,
    fov: 60,
    localFiles: { sog: sogFile, rvis: rvisFile },
  };
}

function fitLocalSceneConfig(sceneConfig, mesh) {
  const bounds = mesh.getBoundingBox();
  if (bounds.isEmpty()) throw new Error("The local SOG contains no splats.");
  const localCenter = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  if (
    ![
      localCenter.x,
      localCenter.y,
      localCenter.z,
      size.x,
      size.y,
      size.z,
    ].every(Number.isFinite)
  ) {
    throw new Error("The local SOG has invalid bounds.");
  }
  const worldCenter = localCenter.clone().applyQuaternion(mesh.quaternion);
  const radius = Math.max(size.length() * 0.5, 0.001);
  mesh.position.copy(worldCenter).multiplyScalar(-1);
  sceneConfig.radius = radius;
  sceneConfig.target = [0, 0, 0];
  sceneConfig.lightCenter = localCenter.toArray();
  sceneConfig.position = [radius * 0.35, radius * 0.18, radius * 2.4];
}

function updateSceneListState(selectedId, disabled) {
  for (const button of sceneList.querySelectorAll("[data-scene]")) {
    button.disabled = disabled;
    button.setAttribute(
      "aria-selected",
      String(button.dataset.scene === selectedId),
    );
  }
}

function populateVisibilityVariants(sceneConfig, selectedId) {
  const variants = getVisibilityVariants(sceneConfig);
  visibilityVariantSection.hidden = variants.length < 2;
  const columns = variants.length > 4 ? 3 : variants.length;
  visibilityVariantControl.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  const fragment = document.createDocumentFragment();
  for (const variant of variants) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.visibilityVariant = variant.id;
    button.textContent = variant.label;
    button.title = variant.detail;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(variant.id === selectedId));
    button.setAttribute("aria-pressed", String(variant.id === selectedId));
    fragment.append(button);
  }
  visibilityVariantControl.replaceChildren(fragment);
  updateVisibilityVariantState(sceneConfig, selectedId, false);
}

function updateVisibilityVariantState(sceneConfig, selectedId, disabled) {
  const variant = resolveVisibilityVariant(sceneConfig, selectedId);
  visibilityVariantValue.value = variant.label;
  visibilityVariantDescription.textContent = variant.detail;
  for (const button of visibilityVariantControl.querySelectorAll(
    "[data-visibility-variant]",
  )) {
    const selected = button.dataset.visibilityVariant === variant.id;
    button.disabled = disabled;
    button.setAttribute("aria-selected", String(selected));
    button.setAttribute("aria-pressed", String(selected));
  }
}

function updateVisibilityVariantMetadata(variant, header) {
  const details = variant.detail ? [variant.detail] : [];
  details.push(`${header.sampleCount} directions`);
  if (header.rayOriginBias > 0) {
    details.push(`ray bias ${header.rayOriginBias.toPrecision(4)}`);
  } else {
    details.push("no ray bias");
  }
  if (header.spatialSmoothRadius > 0) {
    details.push(
      `smooth ${header.spatialSmoothRadius.toPrecision(4)}`,
      `${header.spatialSmoothNeighbors} neighbors`,
    );
  } else {
    details.push("no smoothing");
  }
  if ((header.flags & RVIS_FLAG_SURFACE_V2) !== 0) {
    details.push("adaptive surface v2");
  } else if ((header.flags & RVIS_FLAG_SURFACE_SMOOTHING) !== 0) {
    details.push("surface-aware smoothing");
  }
  details.unshift(
    (header.flags & RVIS_FLAG_DIRECTIONAL_RASTER) !== 0
      ? "directional raster"
      : "BVH ray tracing",
  );
  visibilityVariantValue.value = variant.label;
  visibilityVariantDescription.textContent = details.join(" · ");
}

function createSurfacePainter() {
  surfacePainter = new RvisSurfacePainter(splat, lighting, {
    renderer,
    radius: modelRadius * Number(inputs.brushRadius.value),
    thickness:
      modelRadius *
      Number(inputs.brushRadius.value) *
      Number(inputs.brushThickness.value),
    opacity: Number(inputs.brushOpacity.value),
    normalAngle: Number(inputs.brushNormalAngle.value),
    visibilityThreshold: Number(inputs.brushVisibility.value),
    visibilityFeather: 0.4,
    color: inputs.paintColor.value,
    roughness: Number(inputs.brushRoughness.value),
    specular: Number(inputs.brushSpecular.value),
    mode: currentPaintMode,
    colorMode: currentPaintColorMode,
  });
  updateSurfacePainterControls();
}

function groundSampleHash(index) {
  let value = index | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function disposeGroundReceiver() {
  groundShadowLoadToken += 1;
  if (groundPlane) {
    scene.remove(groundPlane);
    groundPlane.geometry.dispose();
    groundPlane.material.dispose();
    groundPlane = undefined;
  }
  if (groundShadowSplat) {
    scene.remove(groundShadowSplat);
    groundShadowSplat.dispose();
    groundShadowSplat = undefined;
  }
  groundShadow = undefined;
  groundShadowSampleCount = 0;
  groundShadowDensityScale = 1;
}

function groundShadowSourceLabel() {
  if (currentLightType === RvisLightType.POINT) {
    const selectedIndex = pointLightConfigs.findIndex(
      (entry) => entry.id === selectedPointLightId,
    );
    return `selected point light ${Math.max(selectedIndex, 0) + 1}`;
  }
  if (currentLightType === RvisLightType.ENVIRONMENT) {
    return "brightest HDRI lobe";
  }
  return "directional light";
}

function updateGroundShadowLighting() {
  groundShadowStrengthOutput.value = `${Math.round(
    Number(groundShadowStrengthInput.value) * 100,
  )}%`;
  groundShadowSoftnessOutput.value = `${(
    Number(groundShadowSoftnessInput.value) * 100
  ).toFixed(1)}%`;
  groundPlane?.material.color.set(groundPlaneColorInput.value);
  if (!groundShadow || !groundShadowSplat || !lighting || !splat) return;

  splat.getWorldQuaternion(groundWorldQuaternion).normalize();
  if (currentLightType === RvisLightType.POINT) {
    const pointIndex = Math.max(
      pointLightConfigs.findIndex((entry) => entry.id === selectedPointLightId),
      0,
    );
    groundShadow.lightType = RvisGroundShadowLightType.POINT;
    groundShadow.lightPosition.copy(lighting.pointLights[pointIndex].position);
    splat.localToWorld(groundShadow.lightPosition);
  } else {
    groundShadow.lightType = RvisGroundShadowLightType.DIRECTIONAL;
    if (
      currentLightType === RvisLightType.ENVIRONMENT &&
      lighting.environmentLightCount > 0
    ) {
      let brightestIndex = 0;
      let brightestEnergy = Number.NEGATIVE_INFINITY;
      for (let index = 0; index < lighting.environmentLightCount; index++) {
        const light = lighting.environmentLights[index];
        const luminance =
          light.color.r * 0.2126 +
          light.color.g * 0.7152 +
          light.color.b * 0.0722;
        const energy = luminance * light.intensity;
        if (energy > brightestEnergy) {
          brightestEnergy = energy;
          brightestIndex = index;
        }
      }
      groundWorldDirection.copy(
        lighting.environmentLights[brightestIndex].direction,
      );
    } else {
      groundWorldDirection.copy(lighting.lightDirection);
    }
    groundShadow.lightDirection
      .copy(groundWorldDirection)
      .applyQuaternion(groundWorldQuaternion)
      .normalize();
  }

  groundShadow.strength = Number(groundShadowStrengthInput.value);
  groundShadow.softness = Number(groundShadowSoftnessInput.value);
  groundShadowSplat.updateVersion();
  const densityLabel =
    groundShadowDensityScale < 10
      ? groundShadowDensityScale.toFixed(1)
      : Math.round(groundShadowDensityScale).toString();
  groundShadowStatus.textContent = `${groundShadowSampleCount.toLocaleString()} projected splats · ~1/${densityLabel} sample · ${groundShadowSourceLabel()}`;
}

async function createGroundReceiver() {
  disposeGroundReceiver();
  if (!groundPlaneToggle.checked || !splat || !activeScene) return;

  const sourceSplat = splat;
  const sourceScene = activeScene;
  const loadToken = ++groundShadowLoadToken;
  groundShadowStatus.classList.remove("error");
  groundShadowStatus.textContent = "Sampling splats and finding ground…";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (
    loadToken !== groundShadowLoadToken ||
    sourceSplat !== splat ||
    sourceScene !== activeScene
  ) {
    return;
  }

  sourceSplat.updateWorldMatrix(true, false);
  sourceSplat.getWorldScale(groundWorldScale);
  const worldScale = Math.max(
    Math.abs(groundWorldScale.x),
    Math.abs(groundWorldScale.y),
    Math.abs(groundWorldScale.z),
  );
  const sampleDensityScale = Math.max(
    1,
    sourceSplat.numSplats / GROUND_SHADOW_MAX_SPLATS,
  );
  const sampleHashThreshold = Math.min(
    0x1_0000_0000,
    Math.floor(0x1_0000_0000 / sampleDensityScale),
  );
  const sampledBottoms = [];
  let sampledCount = 0;
  const nextGroundShadow = new RvisGroundShadow();
  nextGroundShadow.densityScale = sampleDensityScale;
  nextGroundShadow.radiusScale = Math.max(
    1.15,
    Math.sqrt(sampleDensityScale) * 0.8,
  );

  const nextShadowSplat = new SplatMesh({
    maxSplats: Math.min(sourceSplat.numSplats, GROUND_SHADOW_MAX_SPLATS) + 2048,
    editable: false,
    raycastable: false,
    enableLod: false,
    worldModifier: nextGroundShadow.modifier,
    constructSplats: (target) => {
      sourceSplat.forEachSplat(
        (index, center, scales, quaternion, opacity, color) => {
          if (
            opacity < 0.015 ||
            groundSampleHash(index) >= sampleHashThreshold
          ) {
            return;
          }
          target.pushSplat(center, scales, quaternion, opacity, color);
          groundSampleCenter.copy(center).applyMatrix4(sourceSplat.matrixWorld);
          sampledBottoms.push(
            groundSampleCenter.y -
              Math.max(scales.x, scales.y, scales.z) * worldScale * 2.5,
          );
          sampledCount += 1;
        },
      );
    },
  });

  try {
    await nextShadowSplat.initialized;
    if (
      loadToken !== groundShadowLoadToken ||
      sourceSplat !== splat ||
      sourceScene !== activeScene ||
      !groundPlaneToggle.checked
    ) {
      nextShadowSplat.dispose();
      return;
    }
    if (sampledCount === 0) {
      throw new Error("No visible splats were available for the receiver");
    }

    sampledBottoms.sort((a, b) => a - b);
    const groundIndex = Math.min(
      sampledBottoms.length - 1,
      Math.floor(sampledBottoms.length * 0.01),
    );
    const groundHeight =
      sampledBottoms[groundIndex] - Math.max(modelRadius * 0.012, 0.0001);
    const planeSize = Math.max(modelRadius * 8, 0.01);
    sourceSplat.localToWorld(groundWorldCenter.copy(modelCenter));
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: groundPlaneColorInput.value,
      side: THREE.DoubleSide,
    });
    const nextPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(planeSize, planeSize),
      planeMaterial,
    );
    nextPlane.name = "RVIS ground receiver";
    nextPlane.rotation.x = -Math.PI / 2;
    nextPlane.position.set(
      groundWorldCenter.x,
      groundHeight,
      groundWorldCenter.z,
    );

    nextGroundShadow.groundHeight = groundHeight;
    nextGroundShadow.thickness = Math.max(modelRadius * 0.001, 0.00001);
    nextGroundShadow.surfaceOffset = Math.max(modelRadius * 0.0015, 0.000015);
    nextShadowSplat.name = "RVIS projected ground visibility";
    nextShadowSplat.position.copy(sourceSplat.position);
    nextShadowSplat.quaternion.copy(sourceSplat.quaternion);
    nextShadowSplat.scale.copy(sourceSplat.scale);
    nextShadowSplat.maxSh = 0;
    nextShadowSplat.updateGenerator();

    groundPlane = nextPlane;
    groundShadow = nextGroundShadow;
    groundShadowSplat = nextShadowSplat;
    groundShadowSampleCount = sampledCount;
    groundShadowDensityScale = sampleDensityScale;
    scene.add(groundPlane, groundShadowSplat);
    updateGroundShadowLighting();
  } catch (error) {
    console.error(error);
    if (groundShadowSplat !== nextShadowSplat) nextShadowSplat.dispose();
    if (loadToken === groundShadowLoadToken) {
      groundShadowStatus.classList.add("error");
      groundShadowStatus.textContent =
        error instanceof Error ? error.message : String(error);
    }
  }
}

function setGroundReceiverEnabled(enabled) {
  groundPlaneToggle.checked = enabled;
  groundShadowControls.hidden = !enabled;
  groundSwitchLabel.textContent = enabled ? "On" : "Off";
  if (enabled) {
    createGroundReceiver();
  } else {
    disposeGroundReceiver();
    groundShadowStatus.classList.remove("error");
    groundShadowStatus.textContent =
      "Enable to build a sampled Gaussian visibility receiver.";
  }
}

function disposeScene() {
  setPaintTool(PaintInteractionTool.VIEW);
  activeScene = undefined;
  activeVisibilityVariant = undefined;
  visibilityLoadToken += 1;
  pointLightDragging = false;
  hoveredPointLightId = undefined;
  draggedPointLightId = undefined;
  canvas.classList.remove("point-light-hover", "point-light-dragging");
  for (const config of pointLightConfigs) {
    config.gizmo.helper.visible = false;
    config.gizmo.ring.visible = false;
    config.gizmo.guide.visible = false;
  }
  lightArrow.visible = false;
  lightingUpdatePending = false;
  disposeGroundReceiver();
  disposeSurfacePainter();
  if (splat) {
    scene.remove(splat);
    splat.dispose();
    splat = undefined;
  }
  if (lighting) {
    lighting.dispose();
    lighting = undefined;
  }
}

function bindControls() {
  sceneList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scene]");
    const sceneConfig = button && scenesById.get(button.dataset.scene);
    if (!sceneConfig || sceneConfig.id === activeScene?.id) return;
    loadScene(sceneConfig);
  });
  localSogInput.addEventListener("change", () => {
    selectLocalFile(localSogInput, ".sog", (file) => {
      selectedLocalSogFile = file;
    });
  });
  localRvisInput.addEventListener("change", () => {
    selectLocalFile(localRvisInput, ".rvis", (file) => {
      selectedLocalRvisFile = file;
    });
  });
  loadLocalSceneButton.addEventListener("click", () => {
    if (!selectedLocalSogFile || !selectedLocalRvisFile || sceneLoading) return;
    loadScene(
      createLocalSceneConfig(selectedLocalSogFile, selectedLocalRvisFile),
    );
  });
  visibilityVariantControl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-visibility-variant]");
    if (
      button &&
      activeScene &&
      button.dataset.visibilityVariant !== activeVisibilityVariant?.id
    ) {
      loadVisibilityVariant(button.dataset.visibilityVariant);
    }
  });
  hdriPresetList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-hdri-preset]");
    const preset =
      button &&
      HDRI_PRESETS.find((entry) => entry.id === button.dataset.hdriPreset);
    if (preset && preset.id !== activeHdriPresetId) loadHdriPreset(preset);
  });
  hdriFileInput.addEventListener("change", async () => {
    const [file] = hdriFileInput.files ?? [];
    if (!file) return;
    const extension = file.name.toLowerCase().match(/\.(hdr|exr)$/)?.[0];
    if (!extension) {
      hdriStatus.classList.add("error");
      hdriStatus.textContent = "Choose a .hdr or .exr environment file.";
      hdriFileInput.value = "";
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    hdriCredit.hidden = true;
    try {
      await loadHdriTexture(objectUrl, file.name, undefined, extension);
    } finally {
      URL.revokeObjectURL(objectUrl);
      hdriFileInput.value = "";
    }
  });
  hdriRotationInput.addEventListener("input", () => {
    environmentConfig.rotation = Number(hdriRotationInput.value);
    updateEnvironmentLighting();
  });
  hdriIntensityInput.addEventListener("input", () => {
    environmentConfig.intensity = Number(hdriIntensityInput.value);
    updateEnvironmentLighting();
  });
  hdriBackgroundInput.addEventListener("change", () => {
    syncEnvironmentBackground();
  });
  groundPlaneToggle.addEventListener("change", () => {
    setGroundReceiverEnabled(groundPlaneToggle.checked);
  });
  for (const input of [
    groundPlaneColorInput,
    groundShadowStrengthInput,
    groundShadowSoftnessInput,
  ]) {
    input.addEventListener("input", updateGroundShadowLighting);
  }
  document.getElementById("mode-control").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (button) setMode(Number(button.dataset.mode));
  });
  document.getElementById("light-type").addEventListener("click", (event) => {
    const button = event.target.closest("[data-light-type]");
    if (button) {
      const type = Number(button.dataset.lightType);
      setLightType(type);
      if (type === RvisLightType.POINT) revealLightEditor();
    }
  });
  autoLightButton.addEventListener("click", (event) => {
    autoLight = !autoLight;
    event.currentTarget.setAttribute("aria-pressed", String(autoLight));
  });
  addPointLightButton.addEventListener("click", () => addPointLight());
  pointLightList.addEventListener("click", (event) => {
    const select = event.target.closest("[data-select-point-light]");
    if (select) {
      selectPointLight(select.dataset.selectPointLight);
      return;
    }
    const remove = event.target.closest("[data-remove-point-light]");
    if (remove) removePointLight(remove.dataset.removePointLight);
  });
  for (const input of Object.values(inputs)) {
    input.addEventListener("input", () => updateLight());
  }
  window.addEventListener("keydown", (event) => {
    if (isEditableTarget(event.target)) return;
    if (event.code === "KeyB") {
      event.preventDefault();
      setPaintTool(PaintInteractionTool.BRUSH);
    } else if (event.code === "KeyX") {
      event.preventDefault();
      setPaintTool(PaintInteractionTool.ERASER);
    } else if (event.code === "KeyV") {
      event.preventDefault();
      setPaintTool(PaintInteractionTool.VIEW);
    }
    if (cameraNavigationCodes.has(event.code)) {
      event.preventDefault();
      cameraKeys.add(event.code);
    }
    const mode = Number(event.key) - 1;
    if (mode >= RvisDisplayMode.ORIGINAL && mode <= RvisDisplayMode.RELIT) {
      setMode(mode);
    }
  });
  window.addEventListener("keyup", (event) => {
    cameraKeys.delete(event.code);
  });
  window.addEventListener("blur", () => cameraKeys.clear());
  bindPointLightDrag();
  bindSurfacePainting();
}

function updatePageUrl(sceneConfig, visibilityVariant) {
  const pageUrl = new URL(window.location.href);
  if (sceneConfig.localFiles) {
    pageUrl.searchParams.delete("scene");
    pageUrl.searchParams.delete("visibility");
    window.history.replaceState(null, "", pageUrl);
    return;
  }
  pageUrl.searchParams.set("scene", sceneConfig.id);
  if (getVisibilityVariants(sceneConfig).length > 1) {
    pageUrl.searchParams.set("visibility", visibilityVariant.id);
  } else {
    pageUrl.searchParams.delete("visibility");
  }
  window.history.replaceState(null, "", pageUrl);
}

async function loadVisibilityVariant(requestedId) {
  if (!activeScene || !splat || !lighting) return;
  const sceneConfig = activeScene;
  const variant = resolveVisibilityVariant(sceneConfig, requestedId);
  if (
    resolveVariantGeometry(sceneConfig, variant) !==
    resolveVariantGeometry(sceneConfig, activeVisibilityVariant)
  ) {
    await loadScene(sceneConfig, variant.id, { preserveCamera: true });
    return;
  }
  const loadToken = ++visibilityLoadToken;
  updateVisibilityVariantState(sceneConfig, variant.id, true);
  assetStatus.classList.remove("ready", "error");
  statusText.textContent = "Loading RVIS";
  loadingSpinner.hidden = false;
  loadingDetail.textContent = `Loading ${variant.label} visibility…`;
  loadingLayer.classList.remove("hidden");

  let nextLighting;
  try {
    const rvis = await loadRvis(assetUrl(variant.rvis));
    if (
      loadToken !== visibilityLoadToken ||
      activeScene !== sceneConfig ||
      !splat ||
      !lighting
    ) {
      return;
    }

    const previousLighting = lighting;
    nextLighting = new RvisLighting(rvis);
    setPaintTool(PaintInteractionTool.VIEW);
    disposeSurfacePainter();
    try {
      splat.objectModifiers = (splat.objectModifiers ?? []).filter(
        (modifier) => modifier !== previousLighting.modifier,
      );
      nextLighting.applyTo(splat);
      lighting = nextLighting;
      createSurfacePainter();
      setMode(currentMode);
      setLightType(currentLightType);
      updateLight();
    } catch (swapError) {
      disposeSurfacePainter();
      splat.objectModifiers = [
        ...(splat.objectModifiers ?? []).filter(
          (modifier) => modifier !== nextLighting.modifier,
        ),
        previousLighting.modifier,
      ];
      splat.updateGenerator();
      splat.updateVersion();
      lighting = previousLighting;
      createSurfacePainter();
      nextLighting.dispose();
      nextLighting = undefined;
      throw swapError;
    }
    activeVisibilityVariant = variant;
    previousLighting.dispose();
    nextLighting = undefined;
    sceneSubtitle.textContent = `${sceneConfig.id} · ${variant.label}`;
    updateVisibilityVariantMetadata(variant, rvis.header);
    statusText.textContent = "RVIS ready";
    assetStatus.classList.add("ready");
    loadingLayer.classList.add("hidden");
    resetFpsCounter();
    updatePageUrl(sceneConfig, variant);
  } catch (error) {
    console.error(error);
    nextLighting?.dispose();
    statusText.textContent = "RVIS load failed";
    assetStatus.classList.add("error");
    loadingDetail.textContent =
      error instanceof Error ? error.message : String(error);
    loadingSpinner.hidden = true;
    loadingLayer.classList.add("hidden");
  } finally {
    if (loadToken === visibilityLoadToken && activeScene === sceneConfig) {
      updateVisibilityVariantState(
        sceneConfig,
        activeVisibilityVariant?.id ?? variant.id,
        false,
      );
    }
  }
}

async function loadScene(
  sceneConfig,
  requestedVisibilityVariant,
  { preserveCamera = false } = {},
) {
  const localFiles = sceneConfig.localFiles;
  const visibilityVariant = resolveVisibilityVariant(
    sceneConfig,
    requestedVisibilityVariant,
  );
  const preservedCameraView = preserveCamera ? captureCameraView() : undefined;
  const loadToken = ++sceneLoadToken;
  sceneLoading = true;
  localImportError = undefined;
  updateLocalImportControls();
  cameraKeys.clear();
  controls.enabled = false;
  updateSceneListState(sceneConfig.id, true);
  assetStatus.classList.remove("ready", "error");
  statusText.textContent = "Loading scene";
  sceneSubtitle.textContent = `${localFiles ? sceneConfig.label : sceneConfig.id} · ${visibilityVariant.label}`;
  splatCount.textContent = "— splats";
  loadingSpinner.hidden = false;
  loadingDetail.textContent = `Loading ${sceneConfig.label}…`;
  loadingLayer.classList.remove("hidden");
  disposeScene();
  populateVisibilityVariants(sceneConfig, visibilityVariant.id);
  updateVisibilityVariantState(sceneConfig, visibilityVariant.id, true);

  const nextSplat = new SplatMesh({
    ...(localFiles
      ? {
          fileName: localFiles.sog.name,
          stream: localFiles.sog.stream(),
          streamLength: localFiles.sog.size,
        }
      : {
          url: assetUrl(resolveVariantGeometry(sceneConfig, visibilityVariant)),
        }),
    onProgress: (event) => {
      if (loadToken !== sceneLoadToken || !event.lengthComputable) return;
      loadingDetail.textContent = `Loading scene · ${Math.round((event.loaded / event.total) * 100)}%`;
    },
  });
  let nextLighting;
  let committed = false;

  try {
    const rvisPromise = localFiles
      ? localFiles.rvis.arrayBuffer().then(parseRvis)
      : loadRvis(assetUrl(visibilityVariant.rvis));
    const [rvis] = await Promise.all([rvisPromise, nextSplat.initialized]);
    if (loadToken !== sceneLoadToken) {
      nextSplat.dispose();
      return;
    }

    // Spark needs the raw SOG rotated into Three.js world space. SuperSplat's
    // saved camera is already expressed in that corrected world space.
    nextSplat.quaternion.set(1, 0, 0, 0);
    if (nextSplat.numSplats !== rvis.header.splatCount) {
      throw new Error(
        `SOG/RVIS splat count mismatch: ${nextSplat.numSplats.toLocaleString()} vs ${rvis.header.splatCount.toLocaleString()}`,
      );
    }
    if (localFiles) fitLocalSceneConfig(sceneConfig, nextSplat);
    nextLighting = new RvisLighting(rvis);
    nextLighting.applyTo(nextSplat);

    splat = nextSplat;
    lighting = nextLighting;
    activeScene = sceneConfig;
    activeVisibilityVariant = visibilityVariant;
    committed = true;
    scene.add(splat);
    fitCamera(sceneConfig);
    if (preservedCameraView) restoreCameraView(preservedCameraView);
    createSurfacePainter();
    setMode(currentMode);
    setLightType(currentLightType);
    updateLight();
    if (groundPlaneToggle.checked) createGroundReceiver();

    splatCount.textContent = `${rvis.header.splatCount.toLocaleString()} splats`;
    updateVisibilityVariantMetadata(visibilityVariant, rvis.header);
    statusText.textContent = "RVIS ready";
    assetStatus.classList.add("ready");
    loadingLayer.classList.add("hidden");
    resetFpsCounter();
    updatePageUrl(sceneConfig, visibilityVariant);
  } catch (error) {
    console.error(error);
    disposeSurfacePainter();
    if (committed) {
      disposeScene();
    } else {
      nextLighting?.dispose();
      nextSplat.dispose();
    }
    statusText.textContent = "Load failed";
    assetStatus.classList.add("error");
    loadingDetail.textContent =
      error instanceof Error ? error.message : String(error);
    if (localFiles) {
      localImportError = error instanceof Error ? error.message : String(error);
    }
    loadingSpinner.hidden = true;
    loadingLayer.classList.add("hidden");
  } finally {
    if (loadToken === sceneLoadToken) {
      sceneLoading = false;
      controls.enabled = true;
      updateSceneListState(activeScene?.id ?? sceneConfig.id, false);
      updateVisibilityVariantState(
        sceneConfig,
        activeVisibilityVariant?.id ?? visibilityVariant.id,
        false,
      );
      updateLocalImportControls();
    }
  }
}

function initialize() {
  addPointLight({ switchToPoint: false, reveal: false });
  populateSceneList();
  renderHdriPresets();
  updateSurfacePainterControls();
  bindControls();
  updateLocalImportControls();
  visibilityVariantSection.hidden = true;
  assetStatus.classList.remove("ready", "error");
  statusText.textContent = "Ready";
  sceneSubtitle.textContent = "Choose a scene to begin";
  splatCount.textContent = "— splats";
  viewportHint.textContent =
    "Choose an online scene or open a local SOG + RVIS pair";
  loadingLayer.classList.add("hidden");
}

function resetFpsCounter(time = performance.now()) {
  fpsWindowStartedAt = time;
  fpsWindowFrames = 0;
  smoothedFps = undefined;
  fpsValue.textContent = "—";
  delete fpsMeter.dataset.quality;
  fpsMeter.title = "Measuring frames per second";
}

function updateFpsCounter(time) {
  if (document.hidden) return;
  fpsWindowFrames += 1;
  const elapsed = time - fpsWindowStartedAt;
  if (elapsed < 500) return;

  const sampledFps = (fpsWindowFrames * 1000) / elapsed;
  smoothedFps =
    smoothedFps === undefined
      ? sampledFps
      : smoothedFps * 0.55 + sampledFps * 0.45;
  const roundedFps = Math.round(smoothedFps);
  fpsValue.textContent = String(roundedFps);
  fpsMeter.dataset.quality =
    roundedFps < 30 ? "low" : roundedFps < 50 ? "medium" : "high";
  fpsMeter.title = `${sampledFps.toFixed(1)} frames per second`;
  fpsWindowStartedAt = time;
  fpsWindowFrames = 0;
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio || 1,
      coarsePointerMedia.matches ? 1 : 1.5,
    ),
  );
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) resetFpsCounter();
});

renderer.setAnimationLoop((time) => {
  updateFpsCounter(time);
  const deltaSeconds = Math.min((time - lastFrameTime) / 1000, 0.1);
  lastFrameTime = time;
  if (autoLight && lighting) {
    if (currentLightType === RvisLightType.ENVIRONMENT) {
      let rotation = environmentConfig.rotation + deltaSeconds * 12;
      if (rotation > 180) rotation -= 360;
      environmentConfig.rotation = rotation;
      hdriRotationInput.value = String(rotation);
      updateEnvironmentLighting();
    } else {
      let azimuth = Number(inputs.azimuth.value) + deltaSeconds * 18;
      if (azimuth > 180) azimuth -= 360;
      inputs.azimuth.value = String(azimuth);
      updateLight();
    }
  }
  if (lightingUpdatePending && lighting && splat) {
    lighting.update(splat);
    lightingUpdatePending = false;
  }
  updateCameraNavigation(deltaSeconds);
  controls.update();
  updatePointGizmoAppearance();
  if (lighting && splat) {
    splat.worldToLocal(lightingCameraPosition.copy(camera.position));
    lighting.cameraPosition.copy(lightingCameraPosition);
  }

  renderer.autoClear = true;
  renderer.render(scene, camera);
  surfacePainter?.flush();
  renderer.autoClear = false;
  renderer.clearDepth();
  renderer.render(gizmoScene, camera);
  renderer.autoClear = true;
});

initialize();
