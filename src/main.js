// Phase 1 — modular entry point.
// Behaviour is identical to the original app.js; code is now split into modules.
// Subsequent phases will replace placeCubeAtReticle with assembly placement.

import { createRenderer } from "./scene/createRenderer.js";
import { createScene, addStaticReferenceObject } from "./scene/createScene.js";
import { enableXRAndButton } from "./xr/enableXR.js";
import { requestHitTestSource, updateReticleFromHitTest } from "./xr/hitTest.js";
import { createReticle } from "./xr/reticle.js";
import { placeCubeAtReticle } from "./xr/placement.js";

const renderer = createRenderer();
const { scene, camera } = createScene();
const referenceCube = addStaticReferenceObject(scene);
const reticle = createReticle(scene);

enableXRAndButton(renderer);

// matrixAutoUpdate must be off so we can set the matrix directly from the hit pose
reticle.matrixAutoUpdate = false;

let hitTestSource = null;

renderer.xr.addEventListener("sessionstart", async () => {
  referenceCube.visible = false;
  hitTestSource = await requestHitTestSource(renderer);

  // Place a cube on every tap/select while in AR (Phase 1 placeholder)
  const session = renderer.xr.getSession();
  session.addEventListener("select", () => {
    placeCubeAtReticle(reticle, scene);
  });
});

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Reload the page when AR session ends to restore the starting view
renderer.xr.addEventListener("sessionend", () => {
  referenceCube.visible = true;
  window.location.reload();
});

// Render loop — rotates reference cube in non-XR mode; updates reticle in XR
renderer.setAnimationLoop((timestamp, frame) => {
  if (frame) {
    updateReticleFromHitTest(frame, hitTestSource, reticle, renderer);
  } else {
    referenceCube.rotation.x += 0.01;
    referenceCube.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
});
