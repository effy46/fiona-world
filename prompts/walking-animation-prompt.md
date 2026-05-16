# Walking Animation Prompt (gpt-image-2)

Use this in a single ChatGPT conversation. Attach all 4 files from
`references/animation-inputs/` at the start. Generate frames one at a
time; reply "OK next" to advance.

---

Generate a 12-frame stop-motion animation sequence of a character walking in an isometric Monument-Valley-style scene.

# REFERENCE IMAGES (attached — treat as locked baseline)

- **01-scene-state-0.png** — EXACT starting architecture. Architecture, palette, sky gradient, fog, tower position — must match pixel-for-pixel across frames 1-5.
- **02-scene-state-1.png** — EXACT ending architecture (with arched bridge + stairs extension). Must match pixel-for-pixel across frames 8-12.
- **03-character-sprite.png** — EXACT character (Fiona — black hair, light blue T-shirt, cream wide-leg pants, brown shoulder bag, white sneakers). Flat color-block style, NO facial features, NO 3D shading.
- **04-storyboard-reference.png** — Reference for character scale (character is ~8-10% of canvas height) AND for walking-path trajectory (from point A on left platform to point B at end of walkway, then onto the new bridge).

# CONSISTENCY RULES (non-negotiable)

1. Camera angle: locked 30° low isometric, IDENTICAL across all 12 frames.
2. Palette, sky gradient, fog density: IDENTICAL across all frames.
3. Tower body + dome + base platforms: pixel-identical position in all 12 frames.
4. Character outfit + scale + style: identical in all 12 frames.
5. No extra elements added between frames (no birds, no clouds, no new trees, no UI labels). Only the new bridge in frames 6-7 changes.

# FRAME-BY-FRAME SPEC

- **Frame 1**: Character at point A — left platform near tower entrance, ground floor of central platform. Standing relaxed, just before walking. State-0 architecture (from 01-scene-state-0.png).
- **Frame 2**: Character takes first step. Right foot forward. Same state-0.
- **Frame 3**: Character ~25% up the diagonal walkway. Left foot forward. State-0.
- **Frame 4**: Character ~50% along walkway. Right foot forward. State-0.
- **Frame 5**: Character ~85% along walkway, approaching the red button at the end. Left foot forward. State-0.
- **Frame 6**: Character steps ON the red button. Both feet together. TRANSITION MOMENT — the arched bridge starts to materialize from the walkway end (translucent / half-formed, fading in).
- **Frame 7**: Character still on button. Arched bridge ~70% formed. Stairs partially visible underneath.
- **Frame 8**: New bridge fully formed (state-1 from 02-scene-state-1.png). Character takes first step onto the new bridge. Right foot forward.
- **Frame 9**: Character ~30% along the new bridge. State-1.
- **Frame 10**: Character at top of new stairs. State-1.
- **Frame 11**: Character descending stairs. State-1.
- **Frame 12**: Character at far end, about to exit frame toward Projects Hall (off-canvas right). State-1.

# WALKING POSE DETAIL

- Alternate left/right foot every frame
- Subtle head bob ±2px
- Bag sways slightly
- Hair shape stays consistent

# OUTPUT

- 12 separate 1024×576 PNG frames (16:9 aspect)
- Generate Frame 1 first
- After I confirm "OK next", generate Frame 2
- Repeat until all 12 done

# DO NOT

- Redraw architecture differently from 01- and 02- references
- Change camera angle / palette / fog
- Add new objects (birds, trees, clouds, UI)
- Modify character outfit or proportions
- Add facial features to the character
- Add motion blur or speed lines
- Skip frames

---

## After all 12 frames are done

Reply: `Now zip all 12 frames into a single archive and use Python to stitch them into an animated WebP at 8fps (125ms per frame), looping, output dimensions 1024×576.`
