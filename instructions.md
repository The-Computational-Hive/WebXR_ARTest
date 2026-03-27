# WebXR Prototype Learning Instructions

## Goal
Build a simple mobile WebXR AR prototype where tapping the screen places a cube in real space.

## Working method (important)
- Build incrementally, one function at a time.
- Before each coding step, explain:
  - what the function does,
  - why it is needed in the WebXR pipeline,
  - how it connects to previous steps.
- After adding each function, verify behavior before moving on.
- Avoid implementing the full app in one pass.

## Suggested function-by-function sequence
1. `createRenderer()`
   - Create a Three.js WebGL renderer and attach it to the page.
2. `createScene()`
   - Create scene, camera, and base lights.
3. `addStaticReferenceObject()`
   - Add one simple cube so rendering and material setup are validated.
4. `enableXRAndButton()`
   - Enable WebXR on the renderer and create the AR start button.
5. `requestHitTestSource()`
   - Request viewer and local reference spaces, then create a hit test source.
6. `updateReticleFromHitTest(frame)`
   - Read hit test results each XR frame and update a reticle pose.
7. `placeCubeAtReticle()`
   - On screen tap/select, clone or create a cube at the reticle transform.
8. `renderLoop(timestamp, frame)`
   - Drive per-frame updates and render scene through XR session.

## Notes
- Test on a compatible mobile browser (for example, Chrome on Android with WebXR AR support).
- Serve via HTTPS or localhost; WebXR does not run from plain file URLs.
- Keep geometry simple first (cube), then iterate.
