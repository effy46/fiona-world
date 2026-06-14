# 3D models

Two procedurally-built, web-ready models live here: `glasses.glb` and
`clip_stand.glb`. Both are generated from reference photos with the scripts in
`tools/` (no Blender required) — see the per-model sections below.

---

# Clip stand 3D model

`clip_stand.glb` — the TRAVELER'S COMPANY brass clip stand: an engraved arched
brass nameplate held by a folding binder-clip-style easel.

## What it contains

| Part | Material | Notes |
|------|----------|-------|
| Nameplate | brass + engraved decal | arched "signboard" shape; front carries the TRAVELER'S engraving (border + lettering) as an embedded texture |
| Clip body | dark brass | rounded channel gripping the plate's bottom edge |
| Pivot bosses (×2) | dark brass | round side rivets with centre pins |
| Handle-arms (×2) | brass | flat straps folded down into a 4-footed easel stand |

- glTF Y-up; the engraving faces `+Z`, the four feet rest on `y = 0`, and the
  plate leans back ~20°.
- 14 geometries, ~23k triangles, 4 PBR materials, one embedded PNG texture,
  ~500 KB. The engraving is a self-contained texture (no external files).
- Regenerate with `python tools/build_clip_stand.py`; preview with
  `python tools/render_clip.py`. The engraving image is rendered by
  `make_plate_texture()` and embedded into the GLB on export.

---

# Glasses 3D model

`glasses.glb` — a shape-accurate model of the reference black full-rim
eyeglasses, built for web display / 3D use (also exported as `glasses.obj`).

## What it contains

| Part | Material | Notes |
|------|----------|-------|
| Front rims (×2) | glossy black | large rounded-panto lens openings, slim rims |
| Bridge | glossy black | narrow, gently curved keyhole bridge |
| Gold accents (×2) | warm gold metal | small wedges at the top-outer hinge corners |
| Nose pads (×2) | clear translucent silicone | on thin metal support arms, tucked under the bridge |
| Temples (×2) | glossy black | slim, mostly straight, hooked down at the ear ends |
| Lenses (×2) | clear transparent | slightly domed, subtle reflectivity |

- glTF Y-up, right-handed. `+Z` points toward the wearer (temples extend `+Z`),
  `-Z` is the front face. Centered near the origin; ~13 units wide.
- 13 geometries, ~23k triangles, 5 PBR materials, ~320 KB. Double-sided
  materials so it renders cleanly from any angle without back-face culling.
- Scale is arbitrary — proportions match the photos, dimensions are not exact.

## Regenerating

The model is generated procedurally (no Blender required):

```bash
pip install numpy trimesh pygltflib matplotlib
python tools/build_glasses.py      # -> public/models/glasses.glb + .obj
python tools/render_preview.py     # -> previews/*.png (front/side/top/hero)
```

Tweak the shape constants near the top of `tools/build_glasses.py`
(`RX`, `RY_TOP`, `RY_BOT`, `SUPER_N`, `BASE_CURVE`, `RIM_THK`, …) to adjust
the silhouette, then re-render the previews to check it.

## Using in Three.js

```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
new GLTFLoader().load('/models/glasses.glb', (gltf) => scene.add(gltf.scene));
```
