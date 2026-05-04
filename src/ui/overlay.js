// Phase 8 — DOM overlay controls for the assembly viewer
// Wires up Previous / Next / Reset buttons to assembly state functions.

export function initOverlay({ onNext, onPrevious, onResetStep, onResetPlacement }) {
  const nextBtn = document.getElementById("btn-next");
  const prevBtn = document.getElementById("btn-prev");
  const resetStepBtn = document.getElementById("btn-reset-step");
  const resetPlaceBtn = document.getElementById("btn-reset-placement");

  if (nextBtn) nextBtn.addEventListener("click", onNext);
  if (prevBtn) prevBtn.addEventListener("click", onPrevious);
  if (resetStepBtn) resetStepBtn.addEventListener("click", onResetStep);
  if (resetPlaceBtn) resetPlaceBtn.addEventListener("click", onResetPlacement);
}

export function updateOverlayText(state) {
  const label = document.getElementById("step-label");
  if (label) {
    label.textContent = `Part ${state.currentStep + 1} / ${state.sequence.length}`;
  }
}
