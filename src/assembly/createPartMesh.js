// Phase 5 — convert a single aggregation part to a Three.js mesh
import * as THREE from "three";

export function createPartMesh(part) {
  const geometry = new THREE.BoxGeometry(
    part.size[0],
    part.size[1],
    part.size[2]
  );

  const material = new THREE.MeshStandardMaterial({
    color: part.color ?? "#cccccc",
    transparent: true,
    opacity: 1.0,
  });

  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = part.name ?? `part_${part.id}`;
  mesh.userData.partId = part.id;
  mesh.userData.partData = part;

  // Apply the part's local transform (relative to the aggregation group)
  const matrix = new THREE.Matrix4();
  matrix.fromArray(part.matrix);
  mesh.applyMatrix4(matrix);

  return mesh;
}
