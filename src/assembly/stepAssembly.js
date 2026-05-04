// Phase 7 — next/previous/reset step logic and part visibility update

export function nextStep(state) {
  if (state.currentStep < state.sequence.length - 1) {
    state.currentStep += 1;
    updatePartVisibility(state);
  }
}

export function previousStep(state) {
  if (state.currentStep > 0) {
    state.currentStep -= 1;
    updatePartVisibility(state);
  }
}

export function setStep(state, index) {
  state.currentStep = Math.max(0, Math.min(index, state.sequence.length - 1));
  updatePartVisibility(state);
}

export function resetStep(state) {
  setStep(state, 0);
}

export function showAllParts(state) {
  state.partObjects.forEach((mesh) => {
    mesh.visible = true;
    mesh.material.opacity = 1.0;
    if (mesh.userData.baseColor) {
      mesh.material.color.copy(mesh.userData.baseColor);
    }
  });
}

export function updatePartVisibility(state) {
  state.sequence.forEach((partId, i) => {
    const mesh = state.partObjects.get(partId);
    if (!mesh) return;

    if (!mesh.userData.baseColor) {
      mesh.userData.baseColor = mesh.material.color.clone();
    }

    if (i < state.currentStep) {
      // Past part — fully visible
      mesh.visible = true;
      mesh.material.opacity = 1.0;
      mesh.material.color.copy(mesh.userData.baseColor);
    } else if (i === state.currentStep) {
      // Current part — fully visible, highlighted
      mesh.visible = true;
      mesh.material.opacity = 1.0;
      mesh.material.color.set("#ffcc00");
    } else {
      // Future part
      if (state.mode === "hiddenFuture") {
        mesh.visible = false;
      } else {
        mesh.visible = true;
        mesh.material.opacity = 0.15;
        mesh.material.color.copy(mesh.userData.baseColor);
      }
    }
  });
}
