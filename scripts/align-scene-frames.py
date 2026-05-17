#!/usr/bin/env python3
"""
Pad/crop entry-state-0.png so the tower sits at the same pixel position
as in entry-state-1.png. Without this, Kling sees the architecture
shifting between keyframes and animates a camera pan that shouldn't exist.

Strategy: take state-1's canvas as the reference (since it must include
the bridge to the right). Pad state-0 on the right with the dominant
background color to match width, preserving the tower's left-edge alignment.

Outputs:
    public/scenes/entry-state-0-aligned.png
    (entry-state-1.png is already the reference frame; copied for clarity)
"""
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SCENES = ROOT / "public" / "scenes"

scene_0 = Image.open(SCENES / "entry-state-0.png").convert("RGBA")
scene_1 = Image.open(SCENES / "entry-state-1.png").convert("RGBA")

W0, H0 = scene_0.size
W1, H1 = scene_1.size

print(f"state-0: {W0}×{H0}")
print(f"state-1: {W1}×{H1}")

# Target canvas = state-1 dimensions (it has the wider scene)
target_w = max(W0, W1)
target_h = max(H0, H1)

# Sample dominant sky color from the top edge of state-1 (it has more uniform sky)
top_strip = scene_1.crop((0, 0, W1, max(1, int(H1 * 0.05))))
stat = ImageStat.Stat(top_strip)
avg = tuple(int(c) for c in stat.mean[:3]) + (255,)
print(f"dominant top color (for padding): rgba{avg}")

# Sample dominant bottom (fog) color
bot_strip = scene_1.crop((0, int(H1 * 0.85), W1, H1))
bot_avg = tuple(int(c) for c in ImageStat.Stat(bot_strip).mean[:3]) + (255,)
print(f"dominant bottom color: rgba{bot_avg}")

# Build a vertical gradient background matching the sky → fog transition
bg = Image.new("RGBA", (target_w, target_h))
for y in range(target_h):
    t = y / max(1, target_h - 1)
    r = int(avg[0] * (1 - t) + bot_avg[0] * t)
    g = int(avg[1] * (1 - t) + bot_avg[1] * t)
    b = int(avg[2] * (1 - t) + bot_avg[2] * t)
    for x in range(target_w):
        bg.putpixel((x, y), (r, g, b, 255))

# Composite state-0 onto bg, anchored at its current LEFT edge (preserve tower position)
# If state-0 is narrower than target, the right side gets the gradient background
bg_0 = bg.copy()
bg_0.alpha_composite(scene_0, (0, 0))
bg_0.save(SCENES / "entry-state-0-aligned.png", "PNG", optimize=True)

# state-1 already at target, just normalize
bg_1 = bg.copy()
bg_1.alpha_composite(scene_1, (0, 0))
bg_1.save(SCENES / "entry-state-1-aligned.png", "PNG", optimize=True)

print()
print("Wrote:")
print(f"  {SCENES / 'entry-state-0-aligned.png'}")
print(f"  {SCENES / 'entry-state-1-aligned.png'}")
print(f"  Both {target_w}×{target_h}")
