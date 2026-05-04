# WebXR Wasp Assembly Prototype — Weekly Plan and Copilot Instructions

## 1. Prototype goal

The goal for this week is to evolve the current WebXR cube-placement sketch into a lightweight AR assembly viewer for Wasp aggregations.

By the end of the week, the app should:

1. Load a simple Wasp-exported aggregation JSON.
2. Convert the aggregation into a Three.js object hierarchy.
3. Place the whole aggregation once in AR as an `assemblyRoot`.
4. Step through the parts one by one with simple UI controls.
5. Keep the code modular enough to later add WebXR anchors, GLB assets, `webwaspjs`, or marker-based calibration.

The current app already provides a good base: Vite, Three.js, WebXR AR mode, hit-test, reticle, and tap-to-place cube behavior.

For the first prototype, avoid `webwaspjs`. The npm package appears to be out of sync with the GitHub repository, and the first milestone should avoid dependency risk. Use a minimal custom JSON format instead.

---

## 2. Main architectural decision

The most important shift is:

> Do not place every part independently in AR. Place one aggregation coordinate system, then step through children inside it.

The scene should work like this:

```txt
WebXR world
└── assemblyRoot
    └── aggregationGroup
        ├── part_000
        ├── part_001
        ├── part_002
        └── ...
```

The AR system only needs to locate `assemblyRoot` in the real world.

The Wasp aggregation already defines the relative transforms of its parts. Those transforms should remain local to `aggregationGroup`.

This keeps the mental model close to Wasp:

```txt
Wasp aggregation transform space
→ Three.js aggregation group
→ AR assemblyRoot
→ WebXR world
```

---

## 3. What to build first

The first milestone should be:

```txt
Wasp-style JSON
→ Three.js aggregation
→ one AR assembly root
→ step-through parts
```

Do not focus this week on:

- full `webwaspjs` integration,
- ArUco,
- marker tracking,
- complex mesh assets,
- React UI,
- backend/database logic,
- browser-side aggregation generation.

These can come later.

---

## 4. Suggested file structure

A clean structure would be:

```txt
src/
  main.js

  scene/
    createScene.js
    createRenderer.js

  xr/
    enableXR.js
    hitTest.js
    reticle.js
    placement.js

  assembly/
    loadAggregation.js
    createPartMesh.js
    createAssemblyGroup.js
    assemblyState.js
    stepAssembly.js

  ui/
    overlay.js

public/
  data/
    sample-aggregation.json
```

For speed, it is acceptable to keep the app in fewer files at first. However, keep the conceptual separation clear:

- XR logic should not parse Wasp data.
- Aggregation loading should not depend on WebXR.
- Step-through state should not depend on hit-test logic.
- UI should call explicit functions such as `nextStep()`, `previousStep()`, `resetAssembly()`.
- The AR transform should belong to `assemblyRoot`, not individual parts.

---

## 5. Weekly development plan

### Phase 1 — Preserve current WebXR behavior

Before refactoring heavily, confirm that the existing app still:

- starts in normal browser mode,
- shows the basic scene,
- enters AR,
- shows the hit-test reticle,
- places a cube or test object on tap.

Do not break the current working WebXR loop.

---

### Phase 2 — Replace “place many cubes” with “place one assembly root”

Create one hidden `THREE.Group`:

```js
const assemblyRoot = new THREE.Group();
assemblyRoot.name = "assemblyRoot";
assemblyRoot.visible = false;
scene.add(assemblyRoot);
```

Change the tap/select behavior from this:

```txt
tap → create cube in world
tap → create another cube in world
tap → create another cube in world
```

to this:

```txt
tap once → place assemblyRoot at reticle
```

Suggested placement function:

```js
export function placeAssemblyAtReticle(assemblyRoot, reticle) {
  if (!reticle.visible) return false;

  assemblyRoot.matrix.copy(reticle.matrix);
  assemblyRoot.matrixAutoUpdate = false;
  assemblyRoot.visible = true;

  return true;
}
```

Important:

- Do not create a new aggregation on every tap.
- Do not duplicate all parts on each placement.
- Repositioning should update `assemblyRoot.matrix`, not rebuild the aggregation.

---

### Phase 3 — Define a simple Wasp aggregation JSON

Use the default Wasp save export file uploaded.

Notes:

- `units` should be `"meters"` for WebXR compatibility.
- `matrix` is a 4x4 transform matrix stored as 16 numbers.
- `size` is only required for `type: "box"`.
- `sequence` defines the assembly order.
- Future formats may replace box geometry with GLB mesh references.

---

### Phase 4 — Load aggregation JSON

Implement a loader such as:

```js
export async function loadAggregation(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load aggregation JSON: ${url}`);
  }

  const data = await response.json();

  validateAggregation(data);

  return data;
}
```

Basic validation should check:

- `parts` exists and is an array.
- each part has an `id`.
- each part has a 16-number `matrix`.
- box parts have a 3-number `size`.
- if `sequence` is missing, default to the order of `parts`.

Do not over-engineer validation yet.

---

### Phase 5 — Convert aggregation parts to Three.js meshes

Implement a function such as:

```js
export function createPartMesh(part) {
  const geometry = new THREE.BoxGeometry(
    part.size[0],
    part.size[1],
    part.size[2]
  );

  const material = new THREE.MeshStandardMaterial({
    color: part.color ?? "#cccccc",
    transparent: true,
    opacity: 1.0
  });

  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = part.name ?? `part_${part.id}`;
  mesh.userData.partId = part.id;
  mesh.userData.partData = part;

  const matrix = new THREE.Matrix4();
  matrix.fromArray(part.matrix);
  mesh.applyMatrix4(matrix);

  return mesh;
}
```

Important:

- Keep part transforms local to the aggregation group.
- Do not apply AR reticle/world transforms to individual parts.
- The AR transform belongs only to `assemblyRoot`.

---

### Phase 6 — Create the aggregation group

Implement:

```js
export function createAssemblyGroup(aggregation) {
  const group = new THREE.Group();
  group.name = "aggregationGroup";

  const partObjects = new Map();

  for (const part of aggregation.parts) {
    const mesh = createPartMesh(part);
    group.add(mesh);
    partObjects.set(part.id, mesh);
  }

  const sequence = aggregation.sequence ?? aggregation.parts.map(part => part.id);

  return {
    group,
    partObjects,
    sequence
  };
}
```

Then in `main.js`:

```js
const aggregation = await loadAggregation("/data/sample-aggregation.json");

const {
  group: aggregationGroup,
  partObjects,
  sequence
} = createAssemblyGroup(aggregation);

assemblyRoot.add(aggregationGroup);
```

Test this outside AR first if possible.

---

### Phase 7 — Add step-through state

Create a small explicit state object:

```js
const assemblyState = {
  currentStep: 0,
  sequence: [],
  partObjects: new Map(),
  mode: "ghostFuture"
};
```

Implement:

```txt
nextStep()
previousStep()
setStep(index)
resetStep()
updatePartVisibility()
```

Visibility behavior:

```txt
previous parts:
  visible = true
  opacity = 1.0
  material = normal

current part:
  visible = true
  opacity = 1.0
  material = highlighted

future parts:
  if mode === "hiddenFuture":
    visible = false
  if mode === "ghostFuture":
    visible = true
    opacity = 0.15
```

This is where the prototype becomes an assembly app.

---

### Phase 8 — Add simple DOM overlay controls

Minimum controls:

```txt
Previous
Next
Reset Step
Reset Placement
Show All / Step Mode
Part 3 / 24
```

The UI should call assembly functions; it should not manipulate meshes directly.

Example:

```js
nextButton.addEventListener("click", () => {
  nextStep();
  updateOverlayText();
});
```

Suggested behavior:

Before placement:

- reticle is visible when hit-test finds a surface,
- assemblyRoot exists but is hidden,
- tapping/selecting places the assembly.

After placement:

- assemblyRoot becomes visible,
- reticle can be hidden,
- next/previous controls become active.

Reset placement:

- hide assemblyRoot,
- show reticle again,
- allow placing the same aggregation somewhere else.

---

### Phase 9 — Optional stretch: WebXR anchors

Only after the core assembly demo works.

The current app uses hit-test to get a reticle pose and places objects directly from that transform. A WebXR anchor could improve stability by letting the XR system maintain a pose as its understanding of the environment evolves.

Stretch goal:

```txt
when placing assemblyRoot:
  try to create an XRAnchor from the hit-test result
  update assemblyRoot pose from anchor pose each frame
fallback:
  keep current reticle matrix placement
```

This must be optional and feature-checked because support varies across browser/device combinations.

Do not block the prototype on anchors.

---

### Phase 10 — Parking lot: ArUco / marker tracking

Do not implement ArUco this week unless the core assembly viewer is already working.

Instead, prepare for it architecturally by keeping one clean transform function:

```js
setAssemblyRootTransform(matrix)
```

Later, the matrix could come from:

- WebXR hit-test,
- WebXR anchor,
- marker tracking,
- manual calibration,
- saved transform.

This keeps marker tracking as a calibration source, not as the core app architecture.

---

## 6. Priority table

| Priority | Task | Outcome |
|---|---|---|
| Must | Load simple aggregation JSON | Data pipeline exists |
| Must | Convert parts to Three.js objects | Aggregation appears in browser |
| Must | Place one assembly root in AR | Aggregation is spatially registered |
| Must | Add next/previous stepping | Assembly workflow is visible |
| Should | Add reset/reposition UI | Demo is usable |
| Should | Clean up file structure | Copilot/dev work becomes easier |
| Could | Try WebXR anchors | Improved stability |
| Later | ArUco / markers | Precision calibration |

---

# Copilot Instructions

## Project goal

Build a lightweight mobile WebXR prototype for displaying a Wasp aggregation in augmented reality.

The current app is a minimal Three.js + WebXR prototype. It can enter AR, use WebXR hit-test, show a reticle, and place cubes in real space. The next milestone is to evolve it into an AR assembly viewer:

1. Load a simple Wasp-exported aggregation JSON.
2. Convert the aggregation into a Three.js object hierarchy.
3. Place the whole aggregation once in AR as an `assemblyRoot`.
4. Step through the parts one by one using simple DOM overlay controls.
5. Keep the code simple and modular enough to later add WebXR anchors, GLB assets, or marker-based calibration.

Do not use `webwaspjs` for the first prototype. The npm package may be out of sync with the GitHub repo, and the first milestone should avoid dependency risk. Use a minimal custom JSON format for now.

---

## Technical stack

Use:

- Vite
- JavaScript ES modules
- Three.js
- WebXR through Three.js `ARButton`
- Plain HTML/CSS for DOM overlay controls

Avoid for now:

- React
- `webwaspjs`
- database/backend logic
- complex UI frameworks
- AR.js / MindAR
- ArUco integration
- browser-side Wasp aggregation generation

---

## Core architecture

The app should be structured around these concepts:

```txt
WebXR session
  └── hit-test reticle
        └── places assemblyRoot once

Three.js scene
  └── assemblyRoot
        └── aggregationGroup
              ├── part_000
              ├── part_001
              ├── part_002
              └── ...
```

Important rule:

Do not place every part independently in AR world space.

Instead:

1. Create one `THREE.Group` called `assemblyRoot`.
2. Place `assemblyRoot` from the reticle/hit-test pose.
3. Add all aggregation parts as children of `assemblyRoot`.
4. Step through children by changing visibility and materials.

This keeps AR registration separate from Wasp aggregation logic.

---

## Minimal aggregation JSON format

Use this format for the first prototype:

```json
{
  "units": "meters",
  "parts": [
    {
      "id": 0,
      "name": "part_000",
      "type": "box",
      "size": [0.12, 0.06, 0.06],
      "matrix": [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      "color": "#cccccc"
    }
  ],
  "sequence": [0]
}
```

Notes:

- `units` should be `"meters"` for WebXR compatibility.
- `matrix` is a 4x4 transform matrix stored as 16 numbers.
- `size` is only required for `type: "box"`.
- `sequence` defines the assembly order.
- Future formats may replace box geometry with GLB mesh references.

---

## Loading aggregation data

Implement a function similar to:

```js
export async function loadAggregation(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load aggregation JSON: ${url}`);
  }

  const data = await response.json();

  validateAggregation(data);

  return data;
}
```

Validation should be simple but useful:

- `parts` must be an array.
- each part must have an `id`.
- each part must have a 16-number `matrix`.
- box parts must have a 3-number `size`.
- if `sequence` is missing, default to the order of `parts`.

Do not over-engineer validation.

---

## Creating part meshes

Implement a function similar to:

```js
export function createPartMesh(part) {
  const geometry = new THREE.BoxGeometry(
    part.size[0],
    part.size[1],
    part.size[2]
  );

  const material = new THREE.MeshStandardMaterial({
    color: part.color ?? "#cccccc",
    transparent: true,
    opacity: 1.0
  });

  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = part.name ?? `part_${part.id}`;
  mesh.userData.partId = part.id;
  mesh.userData.partData = part;

  const matrix = new THREE.Matrix4();
  matrix.fromArray(part.matrix);
  mesh.applyMatrix4(matrix);

  return mesh;
}
```

Important:

- Keep all part transforms local to the aggregation group.
- Do not apply AR reticle/world transforms to individual parts.
- The AR transform belongs to `assemblyRoot`.

---

## Creating the assembly group

Implement a function similar to:

```js
export function createAssemblyGroup(aggregation) {
  const group = new THREE.Group();
  group.name = "aggregationGroup";

  const partObjects = new Map();

  for (const part of aggregation.parts) {
    const mesh = createPartMesh(part);
    group.add(mesh);
    partObjects.set(part.id, mesh);
  }

  const sequence = aggregation.sequence ?? aggregation.parts.map(part => part.id);

  return {
    group,
    partObjects,
    sequence
  };
}
```

---

## Assembly step-through state

Use a small explicit state object:

```js
const assemblyState = {
  currentStep: 0,
  sequence: [],
  partObjects: new Map(),
  mode: "ghostFuture"
};
```

Implement:

```txt
nextStep()
previousStep()
setStep(index)
resetStep()
updatePartVisibility()
```

Visibility/material behavior:

```txt
previous parts:
  visible = true
  opacity = 1.0
  color/material = normal

current part:
  visible = true
  opacity = 1.0
  color/material = highlight

future parts:
  if mode === "hiddenFuture":
    visible = false
  if mode === "ghostFuture":
    visible = true
    opacity = 0.15
```

Keep this simple. It is okay if all parts share basic box materials in the first version.

---

## AR placement behavior

Before placement:

- reticle is visible when hit-test finds a surface.
- assemblyRoot exists but is hidden.
- tapping/selecting places the assembly.

After placement:

- assemblyRoot becomes visible.
- assemblyRoot receives the reticle transform.
- reticle may be hidden.
- next/previous controls become active.

Suggested function:

```js
export function placeAssemblyAtReticle(assemblyRoot, reticle) {
  if (!reticle.visible) return false;

  assemblyRoot.matrix.copy(reticle.matrix);
  assemblyRoot.matrixAutoUpdate = false;
  assemblyRoot.visible = true;

  return true;
}
```

Important:

- Do not create a new aggregation on every tap.
- Do not duplicate all parts on each placement.
- Repositioning should update `assemblyRoot.matrix`, not rebuild the aggregation.

---

## UI overlay

Use plain DOM overlay controls.

Minimum controls:

```txt
Previous
Next
Reset Step
Reset Placement
Show All / Step Mode
Part 3 / 24
```

UI functions should call assembly functions; they should not manipulate meshes directly unless necessary.

Example:

```js
nextButton.addEventListener("click", () => {
  nextStep();
  updateOverlayText();
});
```

---

## Development sequence

Follow this sequence. Do not implement everything at once.

### Step 1 — Preserve current WebXR behavior

Confirm the existing app still:

- starts in browser mode,
- shows the basic scene,
- enters AR,
- shows the hit-test reticle,
- places a cube or test object on tap.

Only move on after this still works.

### Step 2 — Add `assemblyRoot`

Create one hidden `THREE.Group` named `assemblyRoot`.

Add it to the scene.

Change tap/select behavior from "place cube" to "place assemblyRoot at reticle".

At this stage the root may contain only one test cube.

### Step 3 — Add sample aggregation JSON

Create:

```txt
public/data/sample-aggregation.json
```

Use 3 to 10 box parts with simple transforms.

Keep dimensions small, e.g. 5–20 cm.

### Step 4 — Load JSON and render aggregation in non-AR mode

Before testing in AR, render the aggregation in normal browser mode.

Confirm:

- all parts appear,
- transforms are correct,
- scale is reasonable,
- no WebXR session is needed for loading.

### Step 5 — Attach aggregation to `assemblyRoot`

Add the aggregation group as a child of `assemblyRoot`.

Confirm that placing `assemblyRoot` moves the whole aggregation together.

### Step 6 — Add step-through logic

Implement `currentStep`, `nextStep`, `previousStep`, and visibility updates.

Confirm in normal browser mode first if possible.

Then confirm in AR.

### Step 7 — Add overlay controls

Add DOM buttons for:

- previous,
- next,
- reset step,
- reset placement.

Keep UI minimal.

### Step 8 — Polish placement behavior

Improve demo usability:

- hide reticle after placement,
- show placement status,
- allow reset/reposition,
- make current part visually obvious.

### Step 9 — Optional stretch: anchors

Only after the core assembly demo works, investigate WebXR anchors.

Add anchors behind a feature check and fallback gracefully to the current reticle matrix placement.

Do not block the prototype on anchors.

### Step 10 — Parking lot: marker tracking

Do not implement ArUco this week.

Prepare for it only by keeping a clean function boundary:

```js
setAssemblyRootTransform(matrix)
```

In the future, this matrix could come from:

- WebXR hit-test,
- WebXR anchor,
- marker tracking,
- manual calibration,
- saved transform.

---

## Coding style

Prefer:

- small named functions,
- clear comments around WebXR-specific concepts,
- simple data structures,
- explicit state,
- incremental testing.

Avoid:

- large rewrites,
- hidden global mutations,
- introducing frameworks too early,
- deeply nested logic,
- optimizing before the demo works.

When adding a function, include a short comment explaining:

1. what it does,
2. why it exists in the AR/Wasp assembly pipeline,
3. what part of the app calls it.

---

## Current priority

The current priority is not precision tracking.

The current priority is:

```txt
Wasp-style JSON
→ Three.js aggregation
→ one AR assembly root
→ step through parts
```

Once that works, precision and stability can be improved through anchors or marker calibration.
