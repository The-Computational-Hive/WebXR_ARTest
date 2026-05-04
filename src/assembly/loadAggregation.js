// Phase 4 — load and validate aggregation JSON

export async function loadAggregation(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load aggregation JSON: ${url}`);
  }

  const data = await response.json();

  validateAggregation(data);

  return data;
}

function validateAggregation(data) {
  if (!Array.isArray(data.parts)) {
    throw new Error("Aggregation JSON must have a 'parts' array.");
  }

  for (const part of data.parts) {
    if (part.id === undefined) {
      throw new Error(`Part is missing required field 'id'.`);
    }
    if (!Array.isArray(part.matrix) || part.matrix.length !== 16) {
      throw new Error(`Part '${part.id}' must have a 'matrix' array of 16 numbers.`);
    }
    if (part.type === "box") {
      if (!Array.isArray(part.size) || part.size.length !== 3) {
        throw new Error(`Box part '${part.id}' must have a 'size' array of 3 numbers.`);
      }
    }
  }

  // Default sequence to part order if missing
  if (!data.sequence) {
    data.sequence = data.parts.map((p) => p.id);
  }
}
