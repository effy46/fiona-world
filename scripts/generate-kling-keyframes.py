#!/usr/bin/env python3
"""Generate two keyframes for Kling AI start-end interpolation.

Tweak START_X, START_Y, END_X, END_Y below (percent of canvas, anchored
at character's feet) and rerun. Lower Y = higher in image.
"""
import sys
from pathlib import Path
from PIL import Image

# === EDIT THESE TWO COORDINATES ===
# Cinematic shortened: just the walk along the existing walkway in state-0.
# Bridge reveal happens after, outside this Kling clip.
#   START — walkway left end (near tower)
#   END   — walkway right end (on the red button)
START_X, START_Y = 40.0, 59.0   # walkway left end, near tower wall
END_X,   END_Y   = 57.0, 59.0   # walkway right end, on/at the red button
# Both frames now use state-0 (no bridge in either):
END_USES_STATE_1 = False
# Optional CLI override:  python3 ... 58 56 77 58
if len(sys.argv) == 5:
    START_X, START_Y, END_X, END_Y = map(float, sys.argv[1:5])

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SCENES = PUBLIC / "scenes"
OUT = ROOT / "references" / "kling-keyframes"
OUT.mkdir(parents=True, exist_ok=True)

scene_0 = Image.open(SCENES / "entry-state-0.png").convert("RGBA")
scene_1 = Image.open(SCENES / "entry-state-1.png").convert("RGBA")
character = Image.open(PUBLIC / "character.png").convert("RGBA")

W, H = scene_0.size
if scene_1.size != (W, H):
    scene_1 = scene_1.resize((W, H), Image.LANCZOS)

# Character scaled to ~9% canvas height
char_h = int(H * 0.09)
char_w = max(1, int(character.width * char_h / character.height))
character = character.resize((char_w, char_h), Image.LANCZOS)


def composite(bg: Image.Image, x_pct: float, y_pct: float) -> Image.Image:
    out = bg.copy()
    cx = int(W * x_pct / 100.0) - char_w // 2
    cy = int(H * y_pct / 100.0) - char_h
    out.alpha_composite(character, (cx, cy))
    return out.convert("RGB")


frame_a = composite(scene_0, START_X, START_Y)
frame_b = composite(scene_1 if END_USES_STATE_1 else scene_0, END_X, END_Y)

a_path = OUT / "kling-start.png"
b_path = OUT / "kling-end.png"
frame_a.save(a_path, "PNG", optimize=True)
frame_b.save(b_path, "PNG", optimize=True)

print("Wrote:")
print(f"  Start frame: {a_path}")
print(f"  End frame:   {b_path}")
print(f"  Dimensions:  {W}×{H}")
