import { ARButton } from "three/addons/webxr/ARButton.js";

export function enableXRAndButton(renderer) {
  renderer.xr.enabled = true;

  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay"],
    domOverlay: { root: document.body },
  });
  button.id = "ar-button";
  document.body.appendChild(button);
}
