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
