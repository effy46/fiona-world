# Next Agent Handoff: Fiona World Redesign

Date: 2026-05-29

## Task

Continue planning Fiona World redesign with Fiona. Do not implement until Fiona explicitly asks. Current mode is design interview / specification refinement.

Primary goal: help Fiona protect the visual and interaction feeling before narrowing scope too aggressively.

## Hard Instructions

- Do not commit or push.
- Keep output concise.
- Use Chinese by default unless drafting website UI copy.
- Avoid dramatic wording or pressure language.
- Avoid mixed English verbs/adjectives in Chinese. English is fine for proper nouns, code paths, product names, and UI copy drafts.
- Do not use: 必须, 锁死, 项目死, 翻车, 爆雷, 致命, 灾难, build 会坏.
- Prefer: 需要确认, 建议调整, 影响范围, 可能导致构建失败, 存在兼容性风险, 验证方式.
- Do not push the conversation back into page count or schedule too early.
- Do not suggest concrete work-project content inside the public site.

## Key Reference Files

- Main planning doc: `/Users/ffeng/Documents/Personal/fiona-world/docs/notebook-studio-redesign-notes.md`
- Reference video: `/Users/ffeng/Documents/Personal/fiona-world/references/01ea02e0ae18634a010370019e1b3e6029_258.mp4`
- Generated first-screen concept image: `/Users/ffeng/Documents/Personal/fiona-world/references/first-screen-concepts.png`
- Claude discussion export: `/Users/ffeng/Downloads/session-export-1779497475507.zip`
- Current app entry: `/Users/ffeng/Documents/Personal/fiona-world/src/App.tsx`
- Current portfolio content: `/Users/ffeng/Documents/Personal/fiona-world/src/content/portfolio.ts`
- Old direction rationale: `/Users/ffeng/Documents/Personal/fiona-world/docs/design-rationale.md`
- Package setup: `/Users/ffeng/Documents/Personal/fiona-world/package.json`

`references/` is gitignored. Do not assume files there are meant to be committed.

## Current Decisions

### Overall Concept

Working concept: **Fiona's Traveler's Notebook**.

The site is a personal creative artifact, not a standard resume site. It should show Fiona's:

- aesthetic judgment
- taste and standards
- tool orchestration
- interaction design thinking
- ability to bring an idea to completion

The site itself is the portfolio project. It should not expose concrete work details.

### Visual World

The world is a traveler's notebook on a warm desk. The notebook is partly open. A cat guide stands on the page. Visitors click objects, tabs, stamps, and paper scenes to explore.

Core motifs:

- traveler's notebook
- stamps / passport collection
- stationery
- paper-craft pop-up scenes
- travel / hiking / viewpoints
- gentle puzzle energy
- future hidden Fiona voice layer

Do not directly use K-pop or Harry Potter references in the first version. Their moods can influence later private ideas, but avoid visible direct IP cues.

### First Frame

Decision: **half-open desk notebook**.

First actionable frame should show:

- warm wood desk
- traveler's notebook partly open
- stationery objects around it
- stamps, tabs, tickets, washi tape, pen, coffee or tea
- cat guide already visible
- hint of a paper pop-up world

Do not start with a purely closed notebook as the main first frame. A closed notebook may appear briefly in loading or transition, but the first useful state should communicate exploration immediately.

Suggested micro-motion:

- camera gently pushes in
- cat looks toward visitor
- cat tail or scarf moves
- paper edge, leaf, or tape corner moves slightly

### Viewing Model

Claude observed that the generated concept image can be read as a progression:

1. closed notebook on desk
2. half-open page view with cat and flat page objects
3. pop-up page view where one local paper scene rises into 3D

Adopt a two-state viewing model:

- Page view: angled overhead view of the open notebook page. Cat walks on the flatter page surface. Stickers, stamps, photos, tabs are mostly flat.
- Pop-up view: camera moves closer to a selected area. Paper cutouts rise into a small 3D scene.

Important nuance: do not necessarily raise the entire page. Prefer local pop-up regions that become small paper theaters.

### Cat Guide

Cat stays. Earlier "no avatar" suggestion is obsolete.

Role:

- guide, not directly controlled player character
- attention pointer
- page-turn ritual actor
- stamp collection actor
- emotional anchor

User should not directly control cat walking. User clicks objects or tabs. Cat goes there and performs the relevant action.

Interaction examples:

- click object -> cat walks there -> camera follows -> content opens
- click tab -> cat walks to page edge -> page turns
- click cat -> cat gives a short line and maybe a light hint
- idle -> cat glances toward an unexplored object

### Cat Visual Direction

Current favorite:

- cream / white cat
- soft Japanese mascot energy, original design
- small green scarf
- small postal or crossbody bag
- stamp or tiny travel item attached

Best blend so far: Traveler Cat + Stamp Clerk Cat.

### Cat Voice

Language:

- English only for cat bubbles for now
- no Chinese cat bubbles

Tone:

- warm
- philosophical but a little absurd
- gentle, not sarcastic
- short, not frequent

Example direction:

- "Some doors are just stickers with ambition."
- "Every stamp is a tiny yes."
- "The map is pretending to be certain."
- "If the mountain moves, check the glue."

Advanced future idea: build a Fiona voice bank from her own social posts, then use it to generate lines that feel like Fiona without directly copying public posts. Keep this hidden in the first version.

### Page Turn Direction

Current proposed direction:

- First visit: user clicks a page tab, cat walks to the edge, pushes or pulls the page, page turns.
- Later visits: visited tabs get a small stamp. Clicking the stamp can use a faster stamp-transition jump.

This connects page turning with stamp collection without making the stamp mechanism too heavy.

Open nuance: Fiona was asked whether the page turn should feel like realistic paper or like the cat opening a new notebook chapter. Recommended direction was the latter: use paper motion, but prioritize cat action, paper layers, and stamp transition over physical realism.

## Open Questions

Continue from here. Ask one decision at a time.

High-priority next question:

- Should page turning feel more like realistic paper turning, or more like the cat opening a new notebook chapter?

Recommended answer:

- Cat opening a new notebook chapter. Reason: more charming, more aligned with the cat guide, easier to make stable, and less dependent on realistic paper simulation.

Other unresolved decisions:

- Exact tab design: side tabs, top tabs, dangling paper tags, or stamp labels
- Exact first page layout
- What first clickable object should be
- What the first pop-up scene should represent
- Stamp collection rules
- Resume sticker placement
- How much camera control the user has
- Mobile adaptation
- Whether standard view remains `?view=standard`, `/resume`, or both

## Recommended Next Conversation Flow

Use a focused interview. One question per turn. For each question, provide one recommended answer and a brief reason.

Do not ask broad questions like "what do you want?" Ask concrete branches.

Suggested next turn:

```markdown
Current read: First frame and cat-guide role are settled. Next decision is how page turning should feel.

Question: Should page turning feel like realistic paper, or like the cat opening a new notebook chapter?

Recommended answer: Cat opening a new notebook chapter. Use paper motion as flavor, but prioritize cat action, paper layers, and stamp transition. Reason: it fits the guide role and avoids making the experience depend on realistic paper simulation.
```

