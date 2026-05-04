// Phase 2 — modular entry point with assembly root placement.
// Loads the Wasp aggregation, builds the Three.js hierarchy, and places it
// once in AR on the first tap.

import * as THREE from "three";
import { createRenderer } from "./scene/createRenderer.js";
import { createScene, addStaticReferenceObject } from "./scene/createScene.js";
import { enableXRAndButton } from "./xr/enableXR.js";
import { requestHitTestSource, updateReticleFromHitTest } from "./xr/hitTest.js";
import { createReticle } from "./xr/reticle.js";
import {
  applyPlacementTransform,
  beginPlacementAtReticle,
  createPlacementState,
} from "./xr/placement.js";
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
let isAdjustingPlacement = false;
let reticleLocked = false;
let activeInputType = null; // "pointer" | "touch" | null
let activePointerId = null;
let activeTouchId = null;
let lastPointerY = 0;
let dragStartY = 0;
let dragStartYaw = 0;
const placementState = createPlacementState();
const DRAG_ROTATION_SENSITIVITY = 0.02; // radians per px

let assemblyState = null;
let stepModeEnabled = true;

function refreshOverlay() {
  updateOverlayText(assemblyState, placed, isAdjustingPlacement);
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
    isAdjustingPlacement = false;
    reticleLocked = false;
    activeInputType = null;
    activePointerId = null;
    activeTouchId = null;
    dragStartY = 0;
    dragStartYaw = 0;
    assemblyRoot.visible = false;
    if (assemblyRoot.matrixAutoUpdate === false) {
      assemblyRoot.matrix.identity();
    }

    // Resume live hit-test reticle tracking.
    reticle.visible = false;

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
  reticleLocked = false;
  hitTestSource = await requestHitTestSource(renderer);

  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  const commitPlacement = () => {
    if (!isAdjustingPlacement || placed) return;

    isAdjustingPlacement = false;
    activeInputType = null;
    activePointerId = null;
    activeTouchId = null;

    applyPlacementTransform(assemblyRoot, placementState);
    assemblyRoot.visible = true;
    placed = true;
    reticleLocked = true;

    // Keep reticle visible at the fixed/placed transform.
    reticle.visible = true;

    setOverlayEnabled(true);
    applyDisplayMode();
  };

  const cancelPlacementAdjust = () => {
    if (!isAdjustingPlacement || placed) return;

    activeInputType = null;
    activePointerId = null;
    activeTouchId = null;
    refreshOverlay();
  };

  const onPointerDown = (event) => {
    if (!renderer.xr.isPresenting || placed || !isAdjustingPlacement) return;
    if (activeInputType && activeInputType !== "pointer") return;

    activeInputType = "pointer";
    activePointerId = event.pointerId;
    lastPointerY = event.clientY;
    dragStartY = event.clientY;
    dragStartYaw = placementState.yaw;
    canvas.setPointerCapture?.(event.pointerId);

    if (event.cancelable) event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!renderer.xr.isPresenting || !isAdjustingPlacement || placed || activeInputType !== "pointer") return;
    if (activePointerId !== event.pointerId) return;

    const dragY = event.clientY - dragStartY;
    placementState.yaw = dragStartYaw + dragY * DRAG_ROTATION_SENSITIVITY;
    lastPointerY = event.clientY;
    applyPlacementTransform(reticle, placementState);

    if (event.cancelable) event.preventDefault();
  };

  const onPointerUp = (event) => {
    if (!renderer.xr.isPresenting || !isAdjustingPlacement || placed || activeInputType !== "pointer") return;
    if (activePointerId !== event.pointerId) return;

    commitPlacement();
  };

  const onPointerCancel = (event) => {
    if (!renderer.xr.isPresenting || !isAdjustingPlacement || placed || activeInputType !== "pointer") return;
    if (activePointerId !== event.pointerId) return;

    cancelPlacementAdjust();
  };

  const onTouchStart = (event) => {
    if (!renderer.xr.isPresenting || placed || !isAdjustingPlacement) return;
    if (activeInputType && activeInputType !== "touch") return;
    if (!event.changedTouches || event.changedTouches.length === 0) return;

    const touch = event.changedTouches[0];
    activeInputType = "touch";
    activeTouchId = touch.identifier;
    lastPointerY = touch.clientY;
    dragStartY = touch.clientY;
    dragStartYaw = placementState.yaw;
    event.preventDefault();
  };

  const onTouchMove = (event) => {
    if (!renderer.xr.isPresenting || !isAdjustingPlacement || placed || activeInputType !== "touch") return;
    if (!event.changedTouches || event.changedTouches.length === 0) return;

    let touch = null;
    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i].identifier === activeTouchId) {
        touch = event.changedTouches[i];
        break;
      }
    }
    if (!touch) return;

    const dragY = touch.clientY - dragStartY;
    placementState.yaw = dragStartYaw + dragY * DRAG_ROTATION_SENSITIVITY;
    lastPointerY = touch.clientY;
    applyPlacementTransform(reticle, placementState);
    event.preventDefault();
  };

  const onTouchEnd = (event) => {
    if (!renderer.xr.isPresenting || !isAdjustingPlacement || placed || activeInputType !== "touch") return;
    if (!event.changedTouches || event.changedTouches.length === 0) return;

    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i].identifier === activeTouchId) {
        commitPlacement();
        event.preventDefault();
        return;
      }
    }
  };

  const onTouchCancel = (event) => {
    if (!renderer.xr.isPresenting || !isAdjustingPlacement || placed || activeInputType !== "touch") return;
    if (!event.changedTouches || event.changedTouches.length === 0) return;

    for (let i = 0; i < event.changedTouches.length; i += 1) {
      if (event.changedTouches[i].identifier === activeTouchId) {
        cancelPlacementAdjust();
        event.preventDefault();
        return;
      }
    }
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchCancel, { passive: false });

  const session = renderer.xr.getSession();
  session.addEventListener("select", () => {
    if (!renderer.xr.isPresenting || placed || isAdjustingPlacement) return;
    if (!reticle.visible) return;

    const started = beginPlacementAtReticle(reticle, placementState);
    if (!started) return;

    // Freeze reticle at tapped pose; drag will now rotate this fixed reticle.
    applyPlacementTransform(reticle, placementState);
    reticle.visible = true;
    reticleLocked = true;

    isAdjustingPlacement = true;
    activeInputType = null;
    activePointerId = null;
    activeTouchId = null;

    setOverlayEnabled(false);
    refreshOverlay();
  });

  session.addEventListener("end", () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
    canvas.removeEventListener("touchcancel", onTouchCancel);
  });

  // Placement flow: XR select locks reticle position, drag rotates, release commits.
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
    if (!reticleLocked && !isAdjustingPlacement) {
      updateReticleFromHitTest(frame, hitTestSource, reticle, renderer);
    }
  } else {
    referenceCube.rotation.x += 0.01;
    referenceCube.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
});
