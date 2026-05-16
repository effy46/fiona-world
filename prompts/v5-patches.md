# v5 Patch Specifications

Concrete patches to apply after Codex Goal mode finishes the v5 implementation.
Each patch is paste-ready: file paths, code snippets, test plan included.
Priority order (top = highest impact).

Source: Codex adversarial review, round 2. See also `prompts/codex-v5-prompt.md` (the build spec these patches refine).

---

## PATCH 1 — Transition rewrite (crossfade + scale-dip)

Replace all `rotateY` / `rotate3d` scene swaps. Duration: `0.35s`, easing: `easeInOut`. Old image exits while new enters simultaneously. Both hit `scale: 0.95` at midpoint.

File: `src/components/SceneView.tsx`

```tsx
const sceneVariants = {
  enter: { opacity: 0, scale: 1 },
  center: {
    opacity: 1,
    scale: [1, 0.95, 1],
    transition: { duration: 0.35, ease: 'easeInOut', times: [0, 0.5, 1] },
  },
  exit: {
    opacity: 0,
    scale: [1, 0.95, 1],
    transition: { duration: 0.35, ease: 'easeInOut', times: [0, 0.5, 1] },
  },
}

<AnimatePresence mode="sync" initial={false}>
  <motion.img
    key={activeView.imageSrc}
    src={activeView.imageSrc}
    className="scene-image"
    variants={sceneVariants}
    initial="enter"
    animate="center"
    exit="exit"
  />
</AnimatePresence>
```

Test: trigger rotator state swap; verify no 3D flip, smooth crossfade, slight scale pulse visible at midpoint.

---

## PATCH 2 — SSR hydration safety

File: `src/main.tsx` and `src/store/app-store.ts`

(a) LazyMotion wrapper:
```tsx
import { LazyMotion, domAnimation } from 'framer-motion'
root.render(<LazyMotion features={domAnimation} strict><App /></LazyMotion>)
```

(b) AnimatePresence suppression:
```tsx
<AnimatePresence initial={false} mode="sync">
  <SceneView key={viewKey} />
</AnimatePresence>
```

(c) Zustand hydration flag:
```ts
const useAppStore = create<AppState>()((set) => ({ hasHydrated: false }))
export const markHydrated = () => useAppStore.setState({ hasHydrated: true })
useEffect(() => markHydrated(), [])
```

SSG initial state must be: `activeSection: 'entry'`, `audioEnabled: false`, `rotators.entry: 0`, `characterWaypoint: 'entry-platform-mid'`. Before `hasHydrated`, render static default scene only — no persisted restore, no animation boot.

Test: build + preview via `vite-react-ssg`; open in browser with JS disabled; confirm no hydration mismatch console error.

---

## PATCH 3 — Crank double-render resolution

Choice: live SVG overlay covers baked PNG region. No PNG regeneration for v1.

File: `src/components/CrankControl.tsx` + `src/styles/crank.css`

```tsx
<div className="crank-slot">
  <div className="crank-cover" />
  <svg className="crank-svg" viewBox="0 0 96 96" aria-label="Rotate mechanism">
    <circle cx="48" cy="48" r="38" />
    <path d="M48 18v30l22 12" />
    <circle cx="48" cy="48" r="7" />
  </svg>
</div>
```

```css
.crank-slot { position:absolute; left:34.2%; top:43.1%; width:8.2%; aspect-ratio:1; z-index:5; }
.crank-cover { position:absolute; inset:-8%; background:#d8b7a1; border-radius:50%; filter:blur(0.5px); }
.crank-svg { position:absolute; inset:0; width:100%; height:100%; transform:rotate(var(--crank-deg)); }
```

Test: visually confirm PNG baked crank is fully occluded by cover layer; SVG crank rotates on interaction.

---

## PATCH 4 — Waypoint state-transition mapping

File: `src/data/scene-graph.ts`

```ts
export type Rotator = {
  id: string
  sceneId: SceneId
  x: number; y: number
  currentState: RotatorState
  snapDegrees: number
  stateTransitionMap?: Partial<Record<RotatorState, Record<string, string>>>
}

// example data
stateTransitionMap: {
  1: { 'entry-walkway-end-state-0': 'entry-bridge-to-projects-state-1' }
}
```

Resolution logic (file: `src/hooks/use-rotator.ts`):
```ts
const mapped = rotator.stateTransitionMap?.[nextState]?.[currentWaypointId]
const nextWaypoint = mapped ?? nearestWaypoint(currentWaypoint, nextState) ?? currentWaypointId
```

Fallback: no mapping → nearest waypoint in target state. If none → stay put. Never throw.

Test: trigger rotator with unmapped waypoint; confirm character lands on nearest valid node, no crash.

---

## PATCH 5 — Mobile responsive scene layout

Choice: fixed-aspect crop with letterboxing.

File: `src/styles/scene.css`

```css
.scene-shell {
  container-type: inline-size;
  width: min(100%, 1440px);
  margin-inline: auto;
  aspect-ratio: 16 / 9;
  background: var(--scene-dominant);
  overflow: hidden;
}
.scene-image { width:100%; height:100%; object-fit:contain; object-position:center; }
.character-sprite { position:absolute; height:clamp(72px, 10cqw, 115px); transform:translate(-50%,-100%); }

@media (max-width: 600px) {
  .scene-shell { width:100vw; aspect-ratio:4 / 5; }
}
```

At 375px viewport: sprite clamps to 72px, remains readable silhouette without covering path nodes.

Test: DevTools 375×667; confirm scene fills width, letterbox visible if needed, sprite at 72px.

---

## PATCH 6 — prefers-reduced-motion vs ?view=standard separation

File: `src/hooks/use-view-mode.ts`

```ts
if (query.view === 'standard') {
  // trigger: ?view=standard present (user intent override)
  // render: StaticView — full HTML sections + thumbnails
  // diff: overrides reduced/default; no game layer at all
} else if (prefersReducedMotion === true) {
  // trigger: OS reduce-motion pref, no query override
  // render: StaticView + direct nav; no AnimatePresence
  // diff: no crossfade, no sprite bob/walk, no crank anim
} else {
  // trigger: no standard query, no reduced-motion pref
  // render: animated SceneExperience
  // diff: crossfade scene swaps, sprite motion, optional Tone
}
```

`?view=standard` wins over motion prefs. Test: set OS reduce-motion, add `?view=standard` — gets static full view, not reduced animated.

---

## PATCH 7 — Tone.js init contract

File: `src/components/SpeakerToggle.tsx`

```ts
async function onSpeakerToggleClick() {
  const Tone = await import('tone')
  await Tone.start()
  if (Tone.context.state === 'suspended') {
    await Tone.context.resume()
  }
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.1, release: 0.25 },
  }).toDestination()
  useAppStore.setState({ audioEnabled: true })
  const now = Tone.now()
  synth.triggerAttackRelease(['C5', 'E5', 'G5'], '8n', now)
}
```

Mobile Safari path covered: `Tone.start()` inside gesture, explicit suspended-context resume before chime.

Test: on iOS Safari, tap speaker; confirm chime plays without `NotAllowedError`, `audioEnabled` flips true.

---

## PATCH 8 — Scene PNG loading state

File: `src/data/scene-graph.ts` — add per-view field:
```ts
dominantColor: '#d8b7a1' // entry
dominantColor: '#c9b7d9' // projects
dominantColor: '#b9c7a5' // skills
dominantColor: '#d6a9ad' // thoughts
dominantColor: '#9fb4c8' // contact
```

File: `src/components/SceneView.tsx`:
```tsx
<div className="scene-shell" style={{ '--scene-dominant': view.dominantColor } as React.CSSProperties}>
  {!loaded && <div className="scene-placeholder" />}
  <img src={view.imageSrc} onLoad={() => setLoaded(true)} />
</div>
```

File: `src/styles/scene.css`:
```css
.scene-placeholder { position:absolute; inset:0; background:var(--scene-dominant); }
```

Preload strategy — current + next scene only (file: `src/components/SceneHead.tsx`):
```tsx
<link rel="preload" as="image" href={currentView.imageSrc} />
<link rel="preload" as="image" href={nextView.imageSrc} />
```

Test: throttle network to Fast 3G; verify dominant-color fills before image, no flash of white.

---

## PATCH 9 — NOTES.md honest framing

Add under heading `## What 2D multi-view captures vs misses vs MV's actual mechanic`:

> This build captures the readable surface illusion: fixed orthographic framing, flat-shaded faces, soft architectural color, and state swaps that make a path feel newly connected. It can communicate the idea of a small mechanism changing architecture without paying the cost of real-time 3D. For a portfolio site, that is enough to create mood and a sense of interaction.

> It does not capture Monument Valley's actual spatial trick. The player in MV reads impossible geometry as navigable because paths, depth, and occlusion resolve inside one coherent interactive space. Here, the world is image replacement. The brain sees a before-and-after illustration, not a continuous object rotating through space.

> What is lost: trust in impossible depth. A 2D swap can fake surprise, but it cannot let the user test spatial assumptions while geometry moves. There is no parallax, no live occlusion, no camera-consistent volume, no real hinge. The mechanic becomes theatrical, not spatial. An observer who has played MV will immediately sense the difference; an observer who has not may not notice, which makes the result useful as aesthetic camouflage but not as an honest reproduction of the mechanic.

---

## PATCH 10 — Package version anchors

File: `package.json`

```json
{
  "dependencies": {
    "framer-motion": "12.23.24",
    "react": "19.1.1",
    "react-dom": "19.1.1",
    "react-helmet-async": "2.0.5",
    "tone": "15.1.22",
    "vite-react-ssg": "28.2.0",
    "zustand": "5.0.8"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "5.0.4",
    "typescript": "5.9.3",
    "vite": "7.1.10"
  }
}
```

No `^` or `~`. Pin exact. Re-pin after first `npm install` by running `npm shrinkwrap` or committing `package-lock.json`.

Test: `rm -rf node_modules && npm ci` — confirm no version drift warnings.
