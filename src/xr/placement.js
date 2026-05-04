import * as THREE from "three";

// Phase 1 — placeholder: place a test cube at the reticle.
// Phase 2 will replace this with placeAssemblyAtReticle().
export function placeCubeAtReticle(reticle, scene) {
  if (!reticle.visible) return;

  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const material = new THREE.MeshStandardMaterial({ color: 0xff6644 });
  const cube = new THREE.Mesh(geometry, material);

  // Read world position and rotation directly from the reticle's matrix
  cube.position.setFromMatrixPosition(reticle.matrix);
  cube.quaternion.setFromRotationMatrix(reticle.matrix);
  // Lift the cube so it sits on top of the surface rather than halfway through
  cube.position.y += 0.05;

  scene.add(cube);
}
