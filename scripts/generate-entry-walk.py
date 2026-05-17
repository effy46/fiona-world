#!/usr/bin/env python3
"""
Generate the entry-tower walking animation as an animated WebP.

Composites the existing scene PNGs + character sprite into a deterministic
frame sequence. No AI, no drift. The character walks the user-defined path:
  base → stairs → mid platform → walkway-end → red button
  → [scene-0 crossfades to scene-1, bridge appears]
  → bridge-start → bridge-to-projects

Output: public/entry-walk.webp

Usage:
    cd <repo>
    python3 scripts/generate-entry-walk.py
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SCENES = PUBLIC / "scenes"
OUTPUT = PUBLIC / "entry-walk.webp"

# --- Load assets ------------------------------------------------------------
scene_0 = Image.open(SCENES / "entry-state-0.png").convert("RGBA")
scene_1 = Image.open(SCENES / "entry-state-1.png").convert("RGBA")
character = Image.open(PUBLIC / "character.png").convert("RGBA")

# Match canvas size of scene-0; if scene-1 differs, resize it.
W, H = scene_0.size
if scene_1.size != (W, H):
    scene_1 = scene_1.resize((W, H), Image.LANCZOS)

# Scale character to ~9% of canvas height. Keep aspect ratio.
char_h = int(H * 0.09)
char_w = max(1, int(character.width * char_h / character.height))
character = character.resize((char_w, char_h), Image.LANCZOS)

# --- Path waypoints ---------------------------------------------------------
# (x%, y%, state_blend)
#   x, y  → character position (% of canvas) — anchor is character's feet
#   blend → 0.0 = pure scene-0, 1.0 = pure scene-1, in between = crossfade
#
# Anchor positions sourced from src/content/scene-graph.ts and tuned to match
# the actual architecture in the rendered PNGs.
waypoints = [
    # ── State 0: walk from base up the walkway toward the red button ──
    (33.0, 87.0, 0.0),  # entry-base       — front-left platform
    (39.0, 83.0, 0.0),  # entry-stairs
    (48.0, 79.0, 0.0),  # entry-platform-mid
    (57.0, 76.0, 0.0),  # entry-walkway-end
    (62.6, 78.5, 0.0),  # entry-red-button — touches the trigger
    # ── Scene crossfades 0 → 1 while character pauses on the button ──
    (62.6, 78.5, 0.4),
    (62.6, 78.5, 0.8),
    (62.6, 78.5, 1.0),  # state-1 active, bridge has appeared
    # ── State 1: walk across the new arched bridge ──
    (63.2, 64.4, 1.0),  # entry-bridge-start — step onto bridge
    (66.7, 68.2, 1.0),  # mid-bridge
    (70.2, 72.0, 1.0),  # entry-bridge-to-projects — far end
]

FRAMES = 36              # total frames in the loop
HOLD_FIRST = 4           # extra frames at start so the loop reads as "she pauses, then walks"
HOLD_LAST = 5            # extra frames at end so the bridge view holds before looping
FRAME_DURATION_MS = 110  # ~9 fps; calm pacing


def lerp_waypoint(t: float) -> tuple[float, float, float]:
    """Sample the waypoint curve at progress t ∈ [0, 1]."""
    n = len(waypoints) - 1
    seg_f = t * n
    seg_i = min(int(seg_f), n - 1)
    seg_t = seg_f - seg_i
    a = waypoints[seg_i]
    b = waypoints[seg_i + 1]
    return (
        a[0] + (b[0] - a[0]) * seg_t,
        a[1] + (b[1] - a[1]) * seg_t,
        a[2] + (b[2] - a[2]) * seg_t,
    )


def render_frame(t: float, bob_step: int) -> Image.Image:
    x_pct, y_pct, blend = lerp_waypoint(t)

    # Compose background (crossfade between scenes)
    if blend <= 0.001:
        bg = scene_0.copy()
    elif blend >= 0.999:
        bg = scene_1.copy()
    else:
        bg = Image.blend(scene_0, scene_1, blend)

    # Place character — anchor at feet (x is center, y is bottom)
    bob = -2 if bob_step % 2 == 0 else 0  # subtle ±2px vertical bob
    cx = int(W * x_pct / 100.0) - char_w // 2
    cy = int(H * y_pct / 100.0) - char_h + bob

    bg.alpha_composite(character, (cx, cy))
    return bg


# --- Generate frames --------------------------------------------------------
frames: list[Image.Image] = []

# Hold first pose for a beat
for _ in range(HOLD_FIRST):
    frames.append(render_frame(0.0, 0))

# Animate through the path
for i in range(FRAMES):
    t = i / (FRAMES - 1)
    frames.append(render_frame(t, i))

# Hold final pose
for k in range(HOLD_LAST):
    frames.append(render_frame(1.0, k))

# --- Save ------------------------------------------------------------------
frames[0].save(
    OUTPUT,
    save_all=True,
    append_images=frames[1:],
    duration=FRAME_DURATION_MS,
    loop=0,
    quality=82,
    method=6,  # slowest, best WebP compression
)

total_ms = FRAME_DURATION_MS * len(frames)
size_kb = OUTPUT.stat().st_size / 1024
print(f"Wrote {OUTPUT.relative_to(ROOT)}")
print(f"  frames     : {len(frames)}")
print(f"  duration   : {total_ms / 1000:.2f}s loop")
print(f"  size       : {size_kb:.0f} KB")
print(f"  dimensions : {W}×{H}")
