import * as THREE from "three";

export function createScene() {
  const scene = new THREE.Scene();

  // Camera — FOV and aspect will be overridden by WebXR, but it must exist
  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  // Ambient light so materials are uniformly visible
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  scene.add(ambientLight);

  // Directional light for basic shading
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(1, 2, 1);
  scene.add(dirLight);

  return { scene, camera };
}

export function addStaticReferenceObject(scene) {
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
  const cube = new THREE.Mesh(geometry, material);
  // Place it 0.5 m in front of the origin so the default camera can see it
  cube.position.set(0, 0, -0.5);
  scene.add(cube);
  return cube;
}
