// Phase 6 — build the THREE.Group hierarchy from an aggregation object
import * as THREE from "three";
import { createPartMesh } from "./createPartMesh.js";

export function createAssemblyGroup(aggregation) {
  const group = new THREE.Group();
  group.name = "aggregationGroup";

  const partObjects = new Map();

  for (const part of aggregation.parts) {
    const mesh = createPartMesh(part);
    group.add(mesh);
    partObjects.set(part.id, mesh);
  }

  const sequence = aggregation.sequence ?? aggregation.parts.map((p) => p.id);

  return { group, partObjects, sequence };
}
