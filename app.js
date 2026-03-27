import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
  return renderer;
}

function createScene() {
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

function addStaticReferenceObject(scene) {
  const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const material = new THREE.MeshStandardMaterial({ color: 0x4488ff });
  const cube = new THREE.Mesh(geometry, material);
  // Place it 0.5 m in front of the origin so the default camera can see it
  cube.position.set(0, 0, -0.5);
  scene.add(cube);
  return cube;
}

function enableXRAndButton(renderer) {
  renderer.xr.enabled = true;

  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
  });
  button.id = "ar-button";
  document.body.appendChild(button);
}

async function requestHitTestSource(renderer) {
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

function createReticle(scene) {
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

function updateReticleFromHitTest(frame, hitTestSource, reticle, renderer) {
  if (!hitTestSource) return;

  const referenceSpace = renderer.xr.getReferenceSpace();
  const hitTestResults = frame.getHitTestResults(hitTestSource);

  if (hitTestResults.length > 0) {
    const hit = hitTestResults[0];
    const pose = hit.getPose(referenceSpace);
    reticle.visible = true;
    reticle.matrix.fromArray(pose.transform.matrix);
  } else {
    reticle.visible = false;
  }
}

function placeCubeAtReticle(reticle, scene) {
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

  // Place a cube on every tap/select while in AR
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

// Render loop — rotates cube in non-XR mode; in XR, updates reticle from hit test
renderer.setAnimationLoop((timestamp, frame) => {
  if (frame) {
    updateReticleFromHitTest(frame, hitTestSource, reticle, renderer);
  } else {
    referenceCube.rotation.x += 0.01;
    referenceCube.rotation.y += 0.01;
  }
  renderer.render(scene, camera);
});
