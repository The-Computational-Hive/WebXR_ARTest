// Phase 2 — modular entry point with assembly root placement.
// Loads the Wasp aggregation, builds the Three.js hierarchy, and places it
// once in AR on the first tap.

import * as THREE from "three";
import { createRenderer } from "./scene/createRenderer.js";
import { createScene, addStaticReferenceObject } from "./scene/createScene.js";
import { enableXRAndButton } from "./xr/enableXR.js";
import { requestHitTestSource, updateReticleFromHitTest } from "./xr/hitTest.js";
import { createReticle } from "./xr/reticle.js";
import { placeAssemblyAtReticle } from "./xr/placement.js";
import { loadAggregation } from "./assembly/loadAggregation.js";
import { createAssemblyGroup } from "./assembly/createAssemblyGroup.js";
import { createAssemblyState } from "./assembly/assemblyState.js";
import {
  nextStep,
  previousStep,
  resetStep,
  showAllParts,
  updatePartVisibility,
} from "./assembly/stepAssembly.js";
import {
  initOverlay,
  updateOverlayText,
  setOverlayEnabled,
  setModeButtonText,
} from "./ui/overlay.js";

const renderer = createRenderer();
const { scene, camera } = createScene();
const referenceCube = addStaticReferenceObject(scene);
const reticle = createReticle(scene);

enableXRAndButton(renderer);
reticle.matrixAutoUpdate = false;

// --- Assembly root (hidden until first tap) ---------------------------------
const assemblyRoot = new THREE.Group();
assemblyRoot.name = "assemblyRoot";
assemblyRoot.visible = false;
scene.add(assemblyRoot);

let hitTestSource = null;
let placed = false;

let assemblyState = null;
let stepModeEnabled = true;

function refreshOverlay() {
  updateOverlayText(assemblyState, placed);
  setModeButtonText(stepModeEnabled);
}

function applyDisplayMode() {
  if (!assemblyState) return;

  if (stepModeEnabled) {
    updatePartVisibility(assemblyState);
  } else {
    showAllParts(assemblyState);
  }

  refreshOverlay();
}

initOverlay({
  onNext: () => {
    if (!assemblyState || !stepModeEnabled || !placed) return;
    nextStep(assemblyState);
    refreshOverlay();
  },
  onPrevious: () => {
    if (!assemblyState || !stepModeEnabled || !placed) return;
    previousStep(assemblyState);
    refreshOverlay();
  },
  onResetStep: () => {
    if (!assemblyState || !placed) return;
    resetStep(assemblyState);
    applyDisplayMode();
  },
  onResetPlacement: () => {
    placed = false;
    assemblyRoot.visible = false;
    if (assemblyRoot.matrixAutoUpdate === false) {
      assemblyRoot.matrix.identity();
    }

    setOverlayEnabled(false);
    refreshOverlay();
  },
  onToggleMode: () => {
    if (!assemblyState || !placed) return;
    stepModeEnabled = !stepModeEnabled;
    applyDisplayMode();
  },
});

setOverlayEnabled(false);
refreshOverlay();

// Load aggregation and attach to assemblyRoot immediately (before AR starts)
async function buildAssembly() {
  const aggregation = await loadAggregation("/data/Sample_Aggregation.json");
  const {
    group: aggregationGroup,
    partObjects,
    sequence,
  } = createAssemblyGroup(aggregation);

  assemblyRoot.add(aggregationGroup);

  assemblyState = createAssemblyState(sequence, partObjects);
  updatePartVisibility(assemblyState);
  refreshOverlay();
}
buildAssembly().catch((err) => console.error("Failed to build assembly:", err));

renderer.xr.addEventListener("sessionstart", async () => {
  referenceCube.visible = false;
  hitTestSource = await requestHitTestSource(renderer);

  const session = renderer.xr.getSession();
  session.addEventListener("select", () => {
    if (!placed) {
      placed = placeAssemblyAtReticle(assemblyRoot, reticle);
      if (placed) {
        reticle.visible = false;
        setOverlayEnabled(true);
        applyDisplayMode();
      }
    }
  });
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

renderer.xr.addEventListener("sessionend", () => {
  referenceCube.visible = true;
  placed = false;
  window.location.reload();
});

renderer.setAnimationLoop((timestamp, frame) => {
  if (frame) {
    if (!placed) {
      updateReticleFromHitTest(frame, hitTestSource, reticle, renderer);
    }
  } else {
    referenceCube.rotation.x += 0.01;
    referenceCube.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
});
