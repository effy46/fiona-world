# Codex Prompt — v5 (2D multi-view rebuild)

Branch: `v5-2d-rebuild`
Source of truth for the v5 full rebuild. Paste the section below verbatim to Codex.

---

Build a production-ready interactive isometric portfolio website. This is a full rebuild on the `v5-2d-rebuild` branch — start from the current branch state (assets only, no source code).

# Architecture decision
This is NOT a real-time 3D site. It is a 2D site that *feels* isometric and 3D by using pre-rendered isometric scene illustrations + a 2D character sprite + state-based view swapping. Monument Valley itself, under its fixed orthographic camera, is visually equivalent to a sequence of 2D views — we mimic that effect directly with images instead of real-time WebGL.

Do NOT introduce Three.js, React Three Fiber, drei, or any WebGL renderer. The site renders with HTML / CSS / SVG only.

# Research first (mandatory)
Before writing code, web-search the puzzle game **Monument Valley** (ustwo games, 2014). Study:
- Low-isometric camera angle (~30°)
- Flat per-face shaded illustration style
- Architectural language: vertical towers, pillars, arches, stepped platforms, narrow walkways
- The architectural-rotation mechanic: a small embedded mechanism on the wall is interacted with → an architectural substructure rotates around a fixed vertical axis → the path visually reconfigures → new traversal opens
- Dusty pastel palette, gradient skies, soft atmospheric fog
- Sound design: each character step plays a soft chime; each mechanism angle plays a different pitch

Document in NOTES.md what you studied and what you chose to capture vs avoid.

## Do NOT copy
- Specific level layouts from MV1/MV2/MV3
- Crow people, Totem, Storyteller, or any named MV character
- The MV music score
- Any text/dialogue from the games

Capture *vibe and engine principles*, not assets or levels.

# Existing assets in the repo (use these — do NOT regenerate)

```
public/
├── character.png            — Fiona sprite (silhouette color-block, transparent alpha, 256×256)
├── character-portrait.png   — Fiona detailed portrait (use ONLY in HTML hero / about / footer, NOT in scene)
├── resume.pdf               — placeholder PDF (already wired)
├── robots.txt               — already present
└── scenes/
    ├── entry-state-0.png    — Entry Tower, rotator angle 0, path to Projects BLOCKED
    ├── entry-state-1.png    — Entry Tower, rotator angle 90°, path to Projects OPEN
    ├── projects.png         — Projects Hall scene (static)
    ├── skills.png           — Skills Garden scene (static)
    ├── thoughts.png         — Thoughts Corridor scene (static)
    └── contact.png          — Contact Lighthouse scene (static)

references/
├── character-spec.png       — Fiona character design bible
├── mood-board.png           — MV style mood board (palette, section concepts, mechanism ideas, camera refs)
└── webpage-mockup.png       — Desktop / static / case study / mobile UI mockup

resume-src/resume.tex         — LaTeX source for resume.pdf (from v3, reuse)
.github/workflows/deploy.yml  — GitHub Pages workflow (from v3, reuse if compatible with new build)
```

Three scene PNGs (entry-state-0, entry-state-1, projects) contain a tiny pre-baked white silhouette figure inside the scene illustration. Ignore them visually — your Fiona sprite overlay will render on top.

# Owner
Fiona Feng, analytics / BI engineer growing toward data engineering.

# Audience
Recruiters, hiring managers, data/BI/analytics engineering peers.

# Required tech stack (locked — do not substitute without asking)
- Vite + React + TypeScript
- **vite-react-ssg** for static prerendering of every section route (NOT vite-ssg which is Vue-focused)
- **Zustand** for global state (active section, audio enabled, per-rotator state, character position, crank-solved flags)
- **Framer Motion** for view-transition animations (rotator state swap, page transitions, crank UI rotation)
- **lottie-react** OR plain CSS — for character idle bob and crank rotation. Lottie is optional, CSS animations are sufficient.
- **Tone.js** for opt-in musical audio (default muted), lazy-loaded
- **react-helmet-async** for per-route meta tags
- Cookieless analytics: Cloudflare Web Analytics OR GoatCounter
- Deploy: GitHub Pages via GitHub Actions, base path `/fiona-world/`

**Explicitly excluded**: Three.js, @react-three/fiber, @react-three/drei, leva, any WebGL or canvas-based 3D library.

# Required UX

## Scene rendering — multi-view 2D
Each section has its own scene container. Each scene has one or more rotator states. Each rotator state maps to a pre-rendered PNG already in `public/scenes/`.

```ts
type SceneId = 'entry' | 'projects' | 'skills' | 'thoughts' | 'contact'
type RotatorState = 0 | 1 | 2 | 3

type SceneView = {
  sceneId: SceneId
  state: RotatorState
  imageSrc: string         // /scenes/entry-state-0.png etc
  pathGraph: PathGraph     // walkable points + edges for THIS state
  hotspots: Hotspot[]      // clickable interactive objects in THIS state
}
```

When a rotator state changes:
1. Framer Motion plays a rotation/crossfade transition (~600ms, easeInOut)
2. Old SceneView image fades / rotates out
3. New SceneView image fades / rotates in
4. Path graph and hotspots update to the new state's data
5. Character sprite snaps to the equivalent waypoint in the new graph

Transition: use `rotate3d` or `rotateY` perspective in Framer Motion, with subtle motion blur or scale. NOT a hard cut.

## Character — 2D sprite with CSS motion
Render `/public/character.png` as a positioned `<img>` element (recommended: ~10% of scene height — so ~115px tall in a 1152px-tall scene).

Animate via CSS transforms only:
- Idle: subtle vertical bob (translateY ±2px, 2s ease-in-out infinite)
- Walk: Framer Motion `animate` to lerp position between waypoints (~400ms ease-out), with faster idle bob during transit
- Arrive: brief scale pulse on arrival (~scale 1.0 → 1.06 → 1.0 over 200ms)
- Interact: gentle tilt on hotspot click

This matches Monument Valley's actual character behavior — Ida glides between points, no walk cycle frames needed.

## Crank — embedded SVG mechanism
Visually small, architectural, inlaid into the scene (stone dial / wall handle). Rendered as inline SVG with CSS `transform: rotate()` driven by Zustand state.

- Click or drag to rotate
- Discrete snap states `[0°, 90°, 180°, 270°]`
- Drag is smooth; release snaps to nearest state
- Snap triggers Framer Motion view transition AND a chord chime
- Each snap state plays a different pitch (pentatonic mapping)

Position the crank visually on top of the scene PNG at hand-authored coordinates (in `scene-graph.ts`).

## State-based path connectivity
```ts
type Waypoint = { id: string; x: number; y: number; sceneId: SceneId; state?: RotatorState }
// x and y are PERCENTAGES of the image dimensions, so they survive image scaling

type Edge = {
  id: string
  from: string
  to: string
  enabledWhen?: { rotatorId: string; state: RotatorState }
}
```

Walkability derives from the edge being enabled in the current rotator state. NOT from pixel-level image data.

## V1 scope — one polished rotator only
Implement exactly one rotator mechanism for v1, located in the Entry Tower scene, connecting Entry Tower to Projects Hall. Default state: rotator at angle 0, path to Projects Hall blocked (use entry-state-0.png). After 90° rotation: path enabled (swap to entry-state-1.png).

Other inter-section transitions for v1 are static (always enabled).

Do NOT add additional rotators until the first one feels visually correct.

## Dual-path access
Persistent top header: brand + Explore dropdown (lists all 5 sections) + Resume button (opens /public/resume.pdf in new tab) + GitHub icon + LinkedIn icon + audio toggle + `?view=standard` link.

Every section reachable via header click WITHOUT solving any rotator.

## StaticView fallback
Same content rendered as a scrollable HTML page (text + section headings, optionally with thumbnail scene images). Served when:
- User appends `?view=standard`
- Image loading fails (fallback)
- `prefers-reduced-motion` is set
- Crawlers hit the prerendered route

## scene-graph.ts
Create `src/content/scene-graph.ts` with hand-authored waypoint coordinates and edges per state. For v1 use placeholder coordinates and document in NOTES.md that the user will refine them by visual inspection. Stub example:

```ts
export const sceneGraph: SceneGraphData = {
  waypoints: [
    { id: 'entry-platform-mid', x: 50, y: 60, sceneId: 'entry' },
    { id: 'entry-walkway-end', x: 80, y: 55, sceneId: 'entry', state: 0 },
    { id: 'entry-bridge-to-projects', x: 90, y: 55, sceneId: 'entry', state: 1 },
    // ...
  ],
  edges: [
    { id: 'walk-mid-to-end', from: 'entry-platform-mid', to: 'entry-walkway-end' },
    { id: 'bridge-to-projects', from: 'entry-walkway-end', to: 'projects-entrance',
      enabledWhen: { rotatorId: 'entry-rotator', state: 1 } },
  ],
  rotators: [
    { id: 'entry-rotator', sceneId: 'entry', x: 35, y: 45, currentState: 0, snapDegrees: 90 },
  ],
}
```

# Required sections (vertical architectural names)
1. **Entry Tower** (Home / bio)
2. **Projects Hall** (Projects)
3. **Skills Garden** (Skills)
4. **Thoughts Corridor** (Writing / case study)
5. **Contact Lighthouse** (Contact)

Resume is a header button → opens `/public/resume.pdf` in new tab.

# Design constraints (visual layer)
- All scene illustrations come from `public/scenes/`. Do NOT regenerate them in code.
- Palette: dusty pastels (peach, soft lavender, sage, dusty rose, cream, slate blue). No saturated primaries. No pure white. No pure black.
- All UI (header, panels, buttons, text) must match the dusty-pastel palette to harmonize with scene illustrations.
- Typography: clean modern sans-serif, generous spacing.

# Content (approved copy — use as-is; only TODO-marked items are placeholders)

## Hero (final)
- H1: `I turn data into clarity and impact`
- Subtitle: `Analytics engineer building trusted data products, validation frameworks, and AI-augmented workflows.`
- CTA buttons: `View My Work` (→ Projects Hall), `Download Resume` (→ /public/resume.pdf)

## Projects (final, 3 items)
1. **Cross-System Parity Validation Framework**
   - Kicker: Automated comparison harness catching regressions before they ship.
   - Tools: SQL, Python, dbt, Airflow, Snowflake
   - TODO: business impact line
   - TODO: architecture diagram

2. **Planning Platform Migration**
   - Kicker: Moving a fragile reporting surface into validated, testable data products.
   - Tools: SQL, dbt, Snowflake
   - TODO: business impact line
   - TODO: before/after architecture diagram

3. **AI-Augmented Analytics Workflow**
   - Kicker: Multi-agent loop (Claude + Codex + Cursor) for query authoring, review, and adversarial testing.
   - Tools: Claude Code, Codex CLI, Cursor, custom prompts
   - TODO: workflow diagram

## Case Study
- Title: `Case Study: Cross-System Parity Validation`
- Subtitle: `How we built a clean-day gate that blocked migration regressions before they hit prod.`
- Body: Context / Approach / Implementation / Impact / Takeaways — all TODO placeholders

## Skills (TODO placeholders)
SQL + Snowflake / Data modeling / Pipeline QA + validation / Dashboard systems / Python tooling / AI-augmented workflow tooling

## Section labels (final)
Entry Tower / Projects Hall / Skills Garden / Thoughts Corridor / Contact Lighthouse

## Nav
Brand: `FIONA FENG` + `Analytics Engineer` subtitle / `Explore` dropdown / `Resume` button / `GitHub` icon / `LinkedIn` icon / audio toggle / `?view=standard` link

## Contact (TODO)
TODO public email / TODO LinkedIn URL / TODO GitHub URL / TODO time-zone

## Do NOT include
- Proprietary system names ("Rx LP", "LP 2.0", "CLMS", "PUMA", "SHOP", "SC")
- Internal metrics, dashboard names, table names
- Specific dollar/percentage business impact unless approved as public-safe
- Co-worker names, manager names

# Audio (stretch — implement)
- Tone.js, opt-in (default muted), speaker toggle in header.
- Character step / arrive: soft musical chime (sine, short envelope, random pentatonic pitch).
- Crank rotation: per-angle pitch (each snap state maps to a chromatic or pentatonic note).
- Crank solve (target angle): chord layer (PolySynth) + subtle drone (AMSynth).
- All synthesized — no audio files.
- Lazy-load Tone.js on first audio enable.

# Accessibility (Tier 1+2 only)
- aria-labels on interactive hotspots and crank.
- Skip-to-content link.
- Visible focus rings (focus-visible).
- AA color contrast on all HTML text.
- `prefers-reduced-motion` respected (instant view swaps, no idle bob).
- Header nav fully keyboard accessible.
- Static view at `?view=standard` fully keyboard-navigable.

# SEO / Distribution
- vite-react-ssg prerenders one HTML file per section route.
- react-helmet-async sets per-route `<title>`, `<meta description>`, OG tags.
- robots.txt allows all crawlers (already at public/robots.txt — verify content).
- sitemap.xml generated at build.

# Engineering constraints
- `npm install`, `npm run dev`, `npm run build`, `npm run build:ssg`, `npm run preview` all work.
- Modular component structure.
- Shared content data (`portfolioSections`) powers nav, HTML panels, prerendered routes — single source of truth.
- Zustand store for cross-component state.
- Scene illustrations lazy-loaded via `<img loading="lazy">` or dynamic import. Preload only the active section's images.
- GitHub Pages workflow at `.github/workflows/deploy.yml` (already present from v3 — verify it's compatible with `npm run build:ssg` output; adjust if needed).
- Bundle: vendor-split Framer Motion / Lottie / Tone.

# Stop and ask user for
- Contact details (email, LinkedIn, GitHub) — currently TODO
- Final resume PDF (current /public/resume.pdf is placeholder)
- Skills section concrete entries with depth markers
- Case study body content
- Project business impact lines
- Project diagrams / screenshots
- Palette deviation if you want to push beyond dusty-pastel
- Any tech substitution from the locked stack

# Do NOT stop for
- File structure, component organization
- Default UI values within the stated palette
- Animation curves, easing constants
- Exact transition timings (recommend ~600ms)
- Stub waypoint coordinates in scene-graph.ts (use placeholder coords; user will refine)

# Deliverables
- Working codebase, deployable.
- README.md: setup, dev, build, prerender, deploy steps, asset pipeline documentation.
- NOTES.md: what MV elements you studied, what you captured, what you avoided, why 2D multi-view instead of real 3D, trade-offs, simplifications, review-needed list, next improvements.

# Success criteria
- Visitor understands who Fiona is within 10 seconds.
- Visitor can reach Projects, Resume, Contact via header without solving the rotator.
- Entry Tower scene has exactly one polished rotator. Default state shows entry-state-0.png with blocked path. After 90° rotation, swaps to entry-state-1.png with open path.
- View transition uses Framer Motion with rotation/perspective effect, NOT a hard cut.
- Character is a 2D sprite from /public/character.png with CSS-based motion on a predefined path graph.
- All scene illustrations load from /public/scenes/, none generated at runtime.
- No Three.js / R3F / WebGL anywhere in the bundle.
- Build succeeds for both SPA and SSG.
- Prerendered HTML at every route serves full section content (verifiable with view-source / curl).
- GitHub Pages deploy works.
- README and NOTES are honest about current state and document the "2D multi-view = MV equivalent" design rationale.

# Reference reading order
Before implementation, view in this order to align on direction:
1. `references/mood-board.png` — overall world style + palette + section concepts
2. `references/webpage-mockup.png` — UI layout, header, hero, panels, mobile responsive, case study
3. `references/character-spec.png` — Fiona character bible (use for context, but the rendered sprite is already at /public/character.png)
4. `public/scenes/*.png` — what the actual scenes look like
5. `public/character.png` and `public/character-portrait.png` — the two character renders

These are visual sources of truth alongside the written constraints in this prompt. If a reference image conflicts with a written constraint, the written constraint wins.
