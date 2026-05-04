import * as THREE from "three";

const _position = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _qYaw = new THREE.Quaternion();
const _qOut = new THREE.Quaternion();
const _normal = new THREE.Vector3();
const _unitScale = new THREE.Vector3(1, 1, 1);

export function createPlacementState() {
  return {
    position: new THREE.Vector3(),
    baseQuaternion: new THREE.Quaternion(),
    yaw: 0,
  };
}

// Lock placement origin from the current reticle pose.
export function beginPlacementAtReticle(reticle, placementState) {
  if (!reticle.visible) return false;

  reticle.matrix.decompose(_position, _quat, _scale);
  placementState.position.copy(_position);
  placementState.baseQuaternion.copy(_quat);
  placementState.yaw = 0;

  return true;
}

// Rotate around the locked reticle plane normal (local Z of the placement plane).
// Positive delta rotates clockwise when dragging finger downward.
export function rotatePlacement(placementState, deltaY, sensitivity = 0.025) {
  placementState.yaw += deltaY * sensitivity;
}

export function applyPlacementTransform(target, placementState) {
  // Reticle plane normal in local placement frame is +Y.
  // Convert that normal to world space from the locked base orientation,
  // then rotate around it so the drag feels local to the placed reticle.
  _normal.set(0, 1, 0).applyQuaternion(placementState.baseQuaternion).normalize();
  _qYaw.setFromAxisAngle(_normal, placementState.yaw);
  _qOut.copy(_qYaw).multiply(placementState.baseQuaternion);

  target.matrixAutoUpdate = false;
  target.matrix.compose(placementState.position, _qOut, _unitScale);
}
