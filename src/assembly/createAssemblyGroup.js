// Phase 6 — build the THREE.Group hierarchy from an aggregation object
import * as THREE from "three";
import { createPartMesh } from "./createPartMesh.js";

export function createAssemblyGroup(aggregation) {
  const group = new THREE.Group();
  group.name = "aggregationGroup";

  // Wasp/Rhino exports in Z-up space; Three.js is Y-up.
  // Rotating -90° around X maps Rhino Z (up) → Three Y (up)
  // and Rhino Y (forward) → Three -Z (into screen).
  group.rotation.x = -Math.PI / 2;

  const partObjects = new Map();

  for (const [index, part] of aggregation.parts.entries()) {
    const mesh = createPartMesh(part, index);
    group.add(mesh);
    partObjects.set(part.id, mesh);
  }

  const sequence = aggregation.sequence ?? aggregation.parts.map((p) => p.id);

  return { group, partObjects, sequence };
}
