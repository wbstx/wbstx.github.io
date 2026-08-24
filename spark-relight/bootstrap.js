const SCENE_SUMMARIES = [
  {
    id: "065a31a8",
    label: "League of Legends · Vi",
    detail: "616K splats · BVH / raster / prune comparison",
  },
  {
    id: "2826d2c0",
    label: "DIY Automated Rig Scan",
    detail: "44.5K splats · 10% · BVH / raster / prune comparison",
  },
  {
    id: "1a2d46fa",
    label: "The Dude · Electric Guitar",
    detail: "194K splats · 7 bakes · prune A/B",
  },
  {
    id: "12fa2893",
    label: "StarEngine X CF450",
    detail: "814K splats · SH3 · 6 visibility bakes",
  },
  {
    id: "0857edc2",
    label: "Husqvarna Svartpilen 401",
    detail: "1.43M splats · SH3 · 5 visibility bakes",
  },
  {
    id: "cbe96076",
    label: "Cicada Shell",
    detail: "653K splats · SH3 · 6 visibility bakes",
  },
];

const sceneList = document.getElementById("scene-list");
const sceneTotal = document.getElementById("scene-total");
const localSogInput = document.getElementById("local-sog-file");
const localRvisInput = document.getElementById("local-rvis-file");
const localSogName = document.getElementById("local-sog-name");
const localRvisName = document.getElementById("local-rvis-name");
const loadLocalSceneButton = document.getElementById("load-local-scene");
const localImportStatus = document.getElementById("local-import-status");
const assetStatus = document.getElementById("asset-status");
const statusText = document.getElementById("status-text");
const sceneSubtitle = document.getElementById("scene-subtitle");
const loadingLayer = document.getElementById("loading-layer");
const loadingSpinner = loadingLayer.querySelector(".loader");
const loadingDetail = document.getElementById("loading-detail");
let appPromise;

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

function fileLabel(file, fallback) {
  return file ? `${file.name} · ${formatFileSize(file.size)}` : fallback;
}

function selectedFile(input, extension) {
  const [file] = input.files ?? [];
  if (!file || file.name.toLowerCase().endsWith(extension)) return file;
  input.value = "";
  localImportStatus.classList.add("error");
  localImportStatus.textContent = `Choose a ${extension} file.`;
  return undefined;
}

function updateLocalControls() {
  if (globalThis.__sparkRelightReady) return;
  localImportStatus.classList.remove("error");
  const sog = selectedFile(localSogInput, ".sog");
  const rvis = selectedFile(localRvisInput, ".rvis");
  localSogName.textContent = fileLabel(sog, "Choose .sog");
  localRvisName.textContent = fileLabel(rvis, "Choose .rvis");
  loadLocalSceneButton.disabled = !sog || !rvis;
  if (localImportStatus.classList.contains("error")) return;
  if (sog && rvis) {
    localImportStatus.textContent =
      "Ready to open · files never leave this browser.";
  } else if (sog) {
    localImportStatus.textContent =
      "SOG selected · now choose its matching RVIS file.";
  } else if (rvis) {
    localImportStatus.textContent =
      "RVIS selected · now choose its matching SOG file.";
  } else {
    localImportStatus.textContent =
      "Choose a matching SOG + RVIS pair. Files stay in this browser.";
  }
}

function renderSceneList() {
  const fragment = document.createDocumentFragment();
  for (const scene of SCENE_SUMMARIES) {
    const button = document.createElement("button");
    button.className = "scene-option";
    button.type = "button";
    button.dataset.scene = scene.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", "false");
    const label = document.createElement("span");
    label.textContent = scene.label;
    const detail = document.createElement("small");
    detail.textContent = scene.detail;
    button.append(label, detail);
    fragment.append(button);
  }
  sceneList.replaceChildren(fragment);
  sceneTotal.value = `${SCENE_SUMMARIES.length} available`;
}

function showRendererLoading(detail) {
  assetStatus.classList.remove("ready", "error");
  statusText.textContent = "Starting renderer";
  sceneSubtitle.textContent = detail;
  loadingSpinner.hidden = false;
  loadingDetail.textContent = "Loading renderer · scenes remain on demand";
  loadingLayer.classList.remove("hidden");
}

function loadApp() {
  appPromise ??= import("./main.js").catch((error) => {
    console.error(error);
    appPromise = undefined;
    statusText.textContent = "Renderer failed";
    assetStatus.classList.add("error");
    loadingSpinner.hidden = true;
    loadingDetail.textContent =
      error instanceof Error ? error.message : String(error);
    loadingLayer.classList.add("hidden");
  });
  return appPromise;
}

sceneList.addEventListener("click", (event) => {
  if (globalThis.__sparkRelightReady) return;
  const button = event.target.closest("[data-scene]");
  if (!button) return;
  globalThis.__sparkRelightInitialSceneId = button.dataset.scene;
  showRendererLoading(
    `Preparing ${button.querySelector("span")?.textContent}…`,
  );
  void loadApp();
});

localSogInput.addEventListener("change", updateLocalControls);
localRvisInput.addEventListener("change", updateLocalControls);
loadLocalSceneButton.addEventListener("click", () => {
  if (globalThis.__sparkRelightReady) return;
  const sog = selectedFile(localSogInput, ".sog");
  const rvis = selectedFile(localRvisInput, ".rvis");
  if (!sog || !rvis) return;
  globalThis.__sparkRelightInitialLocalFiles = { sog, rvis };
  showRendererLoading(`Preparing ${sog.name}…`);
  void loadApp();
});

renderSceneList();
updateLocalControls();
