import * as THREE from "three";

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _normal = new THREE.Vector3();

export function createGroundGrid(scene, size = 1.6, divisions = 16) {
  const grid = new THREE.GridHelper(size, divisions, 0xff6666, 0x44aa44);
  grid.name = "groundGrid";
  grid.material.transparent = true;
  grid.material.opacity = 0.65;
  grid.material.depthTest = false;
  grid.material.depthWrite = false;
  grid.renderOrder = 998;
  grid.matrixAutoUpdate = false;
  grid.visible = false;
  scene.add(grid);
  return grid;
}

export function updateGroundGridFromReticle(grid, reticle, enabled) {
  if (!enabled || !reticle.visible) {
    grid.visible = false;
    return;
  }

  reticle.matrix.decompose(_position, _quaternion, _scale);

  // Lift the grid slightly along the plane normal to avoid z-fighting.
  _normal.set(0, 1, 0).applyQuaternion(_quaternion).normalize();
  _position.addScaledVector(_normal, 0.002);

  grid.matrix.compose(_position, _quaternion, new THREE.Vector3(1, 1, 1));
  grid.visible = true;
}
