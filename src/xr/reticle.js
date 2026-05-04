import * as THREE from "three";

export function createReticle(scene) {
  const reticle = new THREE.Group();

  // Flat placement plane
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.18),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false,
    })
  );
  plane.rotateX(-Math.PI / 2);
  plane.renderOrder = 999;
  reticle.add(plane);

  // X axis (red) in placement plane
  const xAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.001, 0),
      new THREE.Vector3(0.12, 0.001, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0xff0000, depthTest: false, depthWrite: false })
  );
  xAxis.renderOrder = 1000;
  reticle.add(xAxis);

  // Y axis (green) in placement plane (mapped to Three +Z on horizontal surface)
  const yAxis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.001, 0),
      new THREE.Vector3(0, 0.001, 0.12),
    ]),
    new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false })
  );
  yAxis.renderOrder = 1000;
  reticle.add(yAxis);

  // small center marker
  const center = new THREE.Mesh(
    new THREE.CircleGeometry(0.007, 16),
    new THREE.MeshBasicMaterial({ color: 0xffff00, depthTest: false, depthWrite: false })
  );
  center.rotateX(-Math.PI / 2);
  center.renderOrder = 1001;
  reticle.add(center);

  reticle.visible = false;
  scene.add(reticle);
  return reticle;
}
