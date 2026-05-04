export async function requestHitTestSource(renderer) {
  const session = renderer.xr.getSession();

  // 'viewer' space: a ray origin that always points where the device is looking
  const viewerSpace = await session.requestReferenceSpace("viewer");
  const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

  // Clean up when the session ends
  session.addEventListener("end", () => {
    hitTestSource.cancel();
  });

  return hitTestSource;
}

export function updateReticleFromHitTest(frame, hitTestSource, reticle, renderer) {
  if (!hitTestSource) return;

  const referenceSpace = renderer.xr.getReferenceSpace();
  const hitTestResults = frame.getHitTestResults(hitTestSource);

  if (hitTestResults.length > 0) {
    const hit = hitTestResults[0];
    const pose = hit.getPose(referenceSpace);
    reticle.visible = true;
    reticle.matrix.fromArray(pose.transform.matrix);
  }
}
