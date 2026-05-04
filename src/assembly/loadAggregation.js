// Loads a Wasp serialized aggregation JSON and converts it into the internal
// format used by createAssemblyGroup: { parts: [...], sequence: [...] }

const CM_TO_M = 0.01; // Wasp exports in centimetres; WebXR needs metres

export async function loadAggregation(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load aggregation JSON: ${url}`);
  }

  const raw = await response.json();

  if (!raw.aggregated_parts || typeof raw.aggregated_parts !== "object") {
    throw new Error("Invalid Wasp aggregation: missing 'aggregated_parts'.");
  }

  // Build a catalog: partName → geometry { vertices, faces }
  const catalog = {};
  if (Array.isArray(raw.parts)) {
    for (const def of raw.parts) {
      catalog[def.name] = def.geometry;
    }
  }

  const parts = Object.entries(raw.aggregated_parts).map(([key, wasp]) => ({
    id: Number(key),
    name: `${wasp.name}_${key}`,
    partType: wasp.name,
    geometry: catalog[wasp.name] ?? null,
    matrix: waspTransformToRowMajorArray(wasp.transform, CM_TO_M),
    parent: wasp.parent,
    children: wasp.children,
  }));

  const sequence = Array.isArray(raw.aggregated_parts_sequence)
    ? raw.aggregated_parts_sequence
    : parts.map((p) => p.id);

  return { parts, sequence };
}

// ---------------------------------------------------------------------------
// Convert Wasp's named transform keys (M00..M33) to a flat array using the
// same row-major convention as waspjs transformFromData / matrix.set():
//   [M00, M01, M02, M03*scale,  M10, M11, M12, M13*scale,
//    M20, M21, M22, M23*scale,  M30, M31, M32, M33]
//
// THREE.Matrix4.set() takes row-major arguments — this matches exactly.
// scale is applied only to the translation column (M03, M13, M23).
// ---------------------------------------------------------------------------
function waspTransformToRowMajorArray(t, scale = 1) {
  return [
    t.M00, t.M01, t.M02, t.M03 * scale,
    t.M10, t.M11, t.M12, t.M13 * scale,
    t.M20, t.M21, t.M22, t.M23 * scale,
    t.M30, t.M31, t.M32, t.M33,
  ];
}
