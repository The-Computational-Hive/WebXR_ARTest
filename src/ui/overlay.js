// Phase 8 — DOM overlay controls for the assembly viewer.
// Wires up Previous / Next / Reset / Mode buttons to explicit callbacks.

export function initOverlay({
  onNext,
  onPrevious,
  onResetStep,
  onResetPlacement,
  onToggleMode,
}) {
  const nextBtn = document.getElementById("btn-next");
  const prevBtn = document.getElementById("btn-prev");
  const resetStepBtn = document.getElementById("btn-reset-step");
  const resetPlaceBtn = document.getElementById("btn-reset-placement");
  const modeBtn = document.getElementById("btn-toggle-mode");

  if (nextBtn) nextBtn.addEventListener("click", onNext);
  if (prevBtn) prevBtn.addEventListener("click", onPrevious);
  if (resetStepBtn) resetStepBtn.addEventListener("click", onResetStep);
  if (resetPlaceBtn) resetPlaceBtn.addEventListener("click", onResetPlacement);
  if (modeBtn) modeBtn.addEventListener("click", onToggleMode);
}

export function setOverlayEnabled(enabled) {
  const ids = [
    "btn-prev",
    "btn-next",
    "btn-reset-step",
    "btn-reset-placement",
    "btn-toggle-mode",
  ];

  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) {
      element.disabled = !enabled;
    }
  }
}

export function setModeButtonText(stepModeEnabled) {
  const modeBtn = document.getElementById("btn-toggle-mode");
  if (modeBtn) {
    modeBtn.textContent = stepModeEnabled ? "Show All" : "Step Mode";
  }
}

export function updateOverlayText(state, placed) {
  const label = document.getElementById("step-label");
  if (label) {
    if (!state || !state.sequence.length) {
      label.textContent = "Part 0 / 0";
    } else if (!placed) {
      label.textContent = "Tap in AR to place assembly";
    } else {
      label.textContent = `Part ${state.currentStep + 1} / ${state.sequence.length}`;
    }
  }
}
