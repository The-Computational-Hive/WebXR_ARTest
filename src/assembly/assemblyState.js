// Phase 7 — step-through state for the assembly viewer

export function createAssemblyState(sequence, partObjects) {
  return {
    currentStep: 0,
    sequence,
    partObjects,
    mode: "ghostFuture", // "ghostFuture" | "hiddenFuture"
  };
}
