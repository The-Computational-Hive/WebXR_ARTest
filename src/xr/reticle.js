import * as THREE from "three";

export function createReticle(scene) {
  // Flat ring geometry to indicate where AR hit lands on a surface
  const geometry = new THREE.RingGeometry(0.06, 0.08, 32);
  // Rotate flat in XZ plane so it lies on horizontal surfaces
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const reticle = new THREE.Mesh(geometry, material);
  reticle.visible = false;
  scene.add(reticle);
  return reticle;
}
