# Scene Generation Prompt v2 — For Video-Based Cinematic Workflow

Use in a single ChatGPT conversation. Generate 5 scene PNGs designed to support character-walking video overlays. Each scene must have clearly visible entry/exit points so the video AI tool can correctly position the character walking IN at the entry and OUT toward the next scene.

---

## Universal style anchor (locked across all 5 scenes)

Render each scene as an isometric architectural illustration in the style of Monument Valley (ustwo games). Apply these rules to EVERY scene with no deviation:

- **Camera**: locked 30° low isometric angle. ALL 5 scenes must share the exact same camera angle and viewing perspective. Outside-and-above view, looking down diagonally. NEVER first-person, NEVER vanishing-point perspective.
- **Palette**: dusty pastels — peach, soft lavender, sage green, dusty rose, cream, slate blue. No saturated primaries. No pure white. No pure black.
- **Atmosphere**: vertical gradient sky (warm dusk top → cool sage horizon). Soft atmospheric fog at the base / distance, desaturating the bottom 20% of canvas. Faint distant tower silhouettes barely visible in the fog (suggests a larger world).
- **Light**: soft, directional from upper-left. NO harsh shadows. NO realistic specular highlights.
- **Surface treatment**: smooth pale stone walls. Minimal ornamentation — at most one small geometric tile/medallion inlay per platform. NO carpets of patterns, NO heavy tessellation.
- **Vegetation**: SPARSE. AT MOST 2-3 tall slim cypress trees per scene as vertical accents. NO bushes, NO shrub clusters, NO grass patches.
- **Character**: NONE in any scene. The scene must be EMPTY of any human figure, hooded silhouette, or animal. A separate video tool will overlay the character. If the scene contains a baked figure, it will conflict with the overlay.
- **Aspect ratio**: 16:9, 2048×1152 pixels.
- **No text, no UI, no logos, no labels, no annotations, no arrows.**
- **No impossible geometry**. Penrose stairs, M.C. Escher tricks are out of scope.
- **Original design only** — do not copy any specific Monument Valley level layout.

## Path-design rules (critical for video overlay)

Each scene must have:

1. **A clear entry point** — a visible platform / step / arch where the character can be shown spawning or walking in.
2. **A clear walkable path** — a continuous architectural surface (walkway, stairs, bridge, terrace) connecting entry to interior.
3. **A clear exit point** — a visible doorway, archway, or bridge end that suggests onward travel.
4. **A "central rest" zone** — a focal platform where the character can stand idle to be displayed alongside the section content.

Entry, path, exit, and rest must be visually unambiguous so a video AI tool can correctly place the character at each.

Walkways should be wide enough (8-15% of canvas height) to accommodate a small character sprite without ambiguity about whether they're on or off the surface.

## Scene-specific specifications

### Scene 1: Entry Tower (Home)

```
Subject: a tall slender tower with a soft rose-pink dome on top, central architectural piece.
Layout from bottom to top:
  - Ground-level entry platform at lower-left with a small stairway leading up.
  - Mid-level walkway extending RIGHTWARD from the tower body, ending at an empty space (no bridge yet — leaves room for the "bridge appears" transition).
  - The tower itself has 3 visible faces: front, side, top.
  - On the front face of the tower, an embedded small stone dial / mechanism wheel.

Entry waypoint: small platform at bottom-left (where character first appears when arriving at the site).
Rest waypoint: mid-tower platform with arch (where character stands during idle).
Exit waypoint (toward Projects): rightmost end of the mid-level walkway (where character walks to before scene transition).

NOTE: this scene will be paired with a sibling "entry-with-bridge" scene where the same composition has an arched bridge + stairway extending from the walkway end (the "open" state).

Sky: peach top fading to sage horizon.
Add 2 small cypress trees flanking the ground-level platform.
```

### Scene 1b: Entry Tower (bridge-open variant)

```
Same composition as Scene 1 — IDENTICAL camera angle, identical tower position, identical palette.
The ONLY difference: from the rightmost end of the mid-level walkway, an arched stone bridge extends rightward, ending in a small staircase that leads off-canvas.
This represents the "path open" state after the dial is rotated.

Generate this AFTER Scene 1 in the same conversation to preserve visual consistency.
```

### Scene 2: Projects Hall

```
Subject: a wide rectangular MV-style architectural pavilion with multiple arched openings across the facade.
Layout:
  - Soft peach pitched roof.
  - 3 archways across the front face (the entry points to interior galleries).
  - Central stone staircase leading up from a small arrival platform to the main arched doorway.
  - Side wings with smaller arched windows.
  - 4 ornate floating picture frames suspended in mid-air around the building (gold or rose tones, each containing a tiny architectural vignette).
  - A subtle "return path" at the lower-left of the platform — a small stone door or arch suggesting the way back to Entry.

Entry waypoint: small arrival platform at bottom-right (where character walks in from the bridge in the Entry transition).
Rest waypoint: top of the central staircase, in front of the main archway (idle display position).
Exit waypoint: the small return-door at lower-left (for going back to Entry).

NO bushes, NO shrubs. 1-2 cypress trees as vertical accents at corners. Plain stone foundations.
Sky: peach top fading to soft sage horizon. Atmospheric fog at base.
```

### Scene 3: Skills Garden

```
Subject: a serene ceremonial stepped pyramid platform — Persian / Mughal courtyard vibe, NOT botanical garden.
Layout:
  - 3 stepped terraces with smooth pale stone walls.
  - Top terrace: a small shallow reflecting pool with a tall slim ornamental obelisk rising from the center.
  - Each terrace has at most ONE small decorative tile inlay (no mandala patterns, no carpets of detail).
  - A staircase on one side connecting bottom to top.
  - A small arrival platform at the lower-right where the character enters.
  - A small return-arch at the lower-left for going back.

Entry waypoint: arrival platform at lower-right.
Rest waypoint: top terrace beside the obelisk (next to the reflecting pool).
Exit waypoint: return-arch at lower-left.

AT MOST 3 small cypress trees placed sparingly at terrace corners as accents.
NO heavy plants, NO bushes, NO grass.
Sky: warm peach top fading to soft lavender / sage horizon.
```

### Scene 4: Thoughts Corridor

```
Subject: a long arched colonnade structure viewed from the OUTSIDE as a standalone isometric object on its own island.
Layout (CRITICAL — must be isometric exterior view, NOT first-person interior):
  - A long narrow rectangular open-air colonnade running horizontally across the composition.
  - A series of pointed arches forming an open walkway along the top of a stone plinth.
  - At one end of the colonnade (left side), a small enclosed alcove with a tiny writing desk visible through an open archway, warm light spilling out.
  - A few small pendant lamps suspended between the arches along the walkway.
  - An arrival platform at the lower-right (entry from outside).
  - A return-arch at the far end where the desk is.

Entry waypoint: arrival platform at lower-right.
Rest waypoint: midway along the colonnade walkway (under one of the arches).
Exit waypoint: return-arch at the alcove end (for going back to Entry).

VIEW EMPHASIS: this must be rendered as an OUTSIDE isometric view of the corridor, the way Monument Valley shows architectural structures. Camera viewing from outside-and-above. NOT a perspective interior shot looking down a hallway.

AT MOST 2 cypress trees as vertical accents at corners.
NO bushes, NO grass.
Sky: warm golden-hour peach top, sage horizon, soft warm glow from the alcove window.
```

### Scene 5: Contact Lighthouse

```
Subject: a slender tall lighthouse tower standing on a small isometric island, surrounded by calm water.
Layout:
  - Lighthouse: tall narrow tower body with a glass beacon at the top emitting soft warm amber light.
  - Island base: small ornate stone foundation with a few stepping stones leading to a small dock.
  - Water surrounds the island fully with gentle visible ripples and faint reflection of the tower.
  - A small dock at the lower-left for arrival.
  - A return-arch at the lower-right for going back.

Entry waypoint: dock at lower-left (where character arrives by foot from a stepping-stone path).
Rest waypoint: small platform at the base of the lighthouse tower (idle display).
Exit waypoint: return-arch at lower-right.

A faint crescent moon visible in the upper-left of the sky.
1-2 small cypress trees on the island as vertical accents.
NO heavy vegetation.
Sky: deep dusk peach top, cool slate-blue water below, faint stars beginning to show.
Atmospheric fog at the water horizon.
```

---

## Generation order + consistency tips

1. **One scene per response.** Generate Scene 1 first. Wait for "OK next" before generating Scene 1b. This preserves visual consistency.
2. **Always attach previous scenes when generating the next one** — give ChatGPT the visual context of what's already been established (palette, fog density, light direction).
3. **Resolution lock**: every scene must be EXACTLY 2048×1152. If a scene comes back at a different size, reject and regenerate.
4. **Character validation**: after generating each scene, verify there is no human/character figure baked in. If there is, regenerate with stronger "NO character figure, NO person, NO hooded silhouette" instruction.

## Output: 6 PNG files total

```
public/scenes/
├── entry-state-0.png   ← Scene 1 (bridge closed)
├── entry-state-1.png   ← Scene 1b (bridge open)
├── projects.png        ← Scene 2
├── skills.png          ← Scene 3
├── thoughts.png        ← Scene 4
└── contact.png         ← Scene 5
```

## After scenes are done — feeding to video AI

For each scene, the video AI tool (Veo / Sora / Runway / Kling) will need:

1. **The scene PNG** as the background plate
2. **The character sprite** as a foreground reference for identity (provide `public/character.png`)
3. **Entry/exit waypoint coordinates** as text instructions: "Place the character at point (x%, y%) and have them walk along the path to point (x%, y%) over 3 seconds"
4. **Camera lock instruction**: "Camera stays fixed. Only the character moves. Background is static (no parallax)."
5. **Pose instruction**: "Character is a small flat silhouette (~10% of canvas height), walking calmly, occasional subtle head bob, no walk cycle frames needed."

Generate one short video clip per transition:
- `home-to-projects.mp4` (~3-4 seconds, character walks from entry rest waypoint to bridge exit)
- `home-to-skills.mp4`
- `home-to-thoughts.mp4`
- `home-to-contact.mp4`
- `projects-to-home.mp4` (and 3 more "return" clips)
- Or simpler: one universal "return-to-home.mp4" that's section-agnostic

Total: ~5-9 short clips. Each ≤ 5MB at 720p.
