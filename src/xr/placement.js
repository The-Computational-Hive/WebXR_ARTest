// Phase 2 — place the assembly root once at the reticle position.
// Returns true if placement succeeded, false if reticle is not visible.
export function placeAssemblyAtReticle(assemblyRoot, reticle) {
  if (!reticle.visible) return false;

  assemblyRoot.matrix.copy(reticle.matrix);
  assemblyRoot.matrixAutoUpdate = false;
  assemblyRoot.visible = true;

  return true;
}
