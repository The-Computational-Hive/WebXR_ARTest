// Converts a single aggregation part instance to a Three.js mesh.
// Geometry is built from the vertex/face data resolved by loadAggregation
// from the part catalog. The part transform is applied via matrix.set() with
// matrixAutoUpdate=false, mirroring waspjs transformFromData exactly.
import * as THREE from "three";

const CM_TO_M = 0.01;

// Colour palette cycled per part index so individual parts are distinguishable
const PART_COLOURS = [
  "#cccccc", "#aaaaee", "#eeaaaa", "#aaeebb",
  "#eeeaaa", "#bbaaee", "#aaeeee", "#eebbaa",
];

export function createPartMesh(part, index = 0) {
  let geometry;

  if (part.geometry && Array.isArray(part.geometry.vertices) && Array.isArray(part.geometry.faces)) {
    geometry = geometryFromData(part.geometry);
  } else {
    console.warn(`No geometry data for part ${part.id} (${part.partType}); using placeholder.`);
    geometry = new THREE.BoxGeometry(0.08, 0.04, 0.08);
  }

  const material = new THREE.MeshStandardMaterial({
    color: part.color ?? PART_COLOURS[index % PART_COLOURS.length],
    transparent: true,
    opacity: 1.0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = part.name ?? `part_${part.id}`;
  mesh.userData.partId = part.id;
  mesh.userData.partData = part;

  // Apply the part's local transform using matrix.set() (row-major), mirroring
  // waspjs transformFromData. matrixAutoUpdate=false prevents Three.js from
  // overwriting this with a recomposed position/quaternion/scale each frame.
  const m = part.matrix;
  mesh.matrix.set(
    m[0],  m[1],  m[2],  m[3],
    m[4],  m[5],  m[6],  m[7],
    m[8],  m[9],  m[10], m[11],
    m[12], m[13], m[14], m[15]
  );
  mesh.matrixAutoUpdate = false;

  return mesh;
}

// Build a BufferGeometry from Wasp vertex/face data.
// Vertices are [x, y, z] arrays in Rhino/Wasp units (cm).
// Convert to metres so geometry size matches WebXR world units.
function geometryFromData({ vertices, faces }) {
  const positions = [];
  const indices = [];

  for (const v of vertices) {
    positions.push(v[0] * CM_TO_M, v[1] * CM_TO_M, v[2] * CM_TO_M);
  }

  for (const f of faces) {
    if (f.length === 3) {
      indices.push(f[0], f[1], f[2]);
    } else if (f.length === 4) {
      // quad → two triangles
      indices.push(f[0], f[1], f[2], f[0], f[2], f[3]);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
