# Fiona World Redesign Notes

Date: 2026-05-22

## Source References

- Reference video: `/Users/ffeng/Documents/Personal/fiona-world/references/01ea02e0ae18634a010370019e1b3e6029_258.mp4`
- First-screen concept comparison image: `/Users/ffeng/Documents/Personal/fiona-world/references/first-screen-concepts.png`
- Claude session export: `/Users/ffeng/Downloads/session-export-1779497475507.zip`
- Current app entry: `/Users/ffeng/Documents/Personal/fiona-world/src/App.tsx`
- Current portfolio content data: `/Users/ffeng/Documents/Personal/fiona-world/src/content/portfolio.ts`
- Existing design rationale for old direction: `/Users/ffeng/Documents/Personal/fiona-world/docs/design-rationale.md`
- Package setup: `/Users/ffeng/Documents/Personal/fiona-world/package.json`

## Why Redesign

The current Fiona World direction drifted toward a Monument Valley-inspired static illustration site. The original desire was closer to the reference video: an explorable, playful personal website with a small character, interactive points, modal details, and a living 3D world.

The redesign should not be a normal online resume. It should be a public personal project that can sit on a resume because it shows:

- Fiona's aesthetic judgment
- Personal taste and standards
- Ability to orchestrate tools and agents
- Interaction design thinking
- Completion quality

The site should avoid exposing specific work details. It should not read as a work case-study dump.

## Core Concept

Working concept: **Fiona's Traveler's Notebook**

A large traveler's notebook sits on a warm desk. The notebook is partly open. A small cat guide stands on the page and leads visitors through paper-like scenes, stamps, tabs, notes, and hidden interactions.

The world combines:

- Traveler's notebook / journaling
- Stamp collecting
- Travel memories
- Hiking and viewpoints
- Gentle puzzle energy
- A future private language layer based on Fiona's writing style

Do not use direct K-pop or Harry Potter references in the first version. Magic-map-like movement, footprints, ink reveal, and puzzle mood can inspire later pages, but avoid direct intellectual-property cues.

## First Frame

Decision: **half-open desk notebook**

First frame should show:

- Warm wood desk
- Traveler's notebook partly open
- Stickers, stamps, tickets, tabs, washi tape, pen, coffee or tea, small stationery objects
- Cat guide already visible on the paper
- A hint of a paper pop-up world, but not a fully expanded scene yet

Reason:

- More inviting than a closed notebook
- More immediate than an opening sequence
- Makes the site feel explorable in the first second
- Keeps the personal-object feeling of a desk setup

Suggested first-frame motion:

- Camera gently pushes in
- Cat looks toward visitor
- Cat tail or scarf moves subtly
- A paper edge, leaf, or tape corner moves slightly
- Small paper world feels alive without becoming noisy

## Cat Guide

Decision: cat guide stays. Earlier "no avatar" advice is superseded.

Role:

- Guide, not player character
- Attention pointer
- Ritual trigger for page turns and stamp collection
- Emotional anchor

User should not directly control cat movement. User clicks objects, tabs, signs, stamps, or page areas. Cat walks or hops to the target, looks at it, points at it, stamps it, or triggers the page turn.

Why:

- Keeps game feeling without adding heavy player-control burden
- Easier for desktop and future mobile
- Avoids keyboard or touch joystick requirements
- Better for short recruiter visits

Cat behavior:

- Click object -> cat goes there -> camera follows -> content opens
- Click tab -> cat goes to page edge -> page turns
- Click cat -> cat says one short line and may give a light hint
- Idle -> cat may glance toward an unexplored object

## Cat Visual Direction

Current favorite:

- Cream or white cat
- Soft Japanese mascot energy, but original
- Small green scarf
- Small crossbody or postal-style bag
- Stamp or tiny travel item attached to bag

Potential variants:

- Traveler Cat: scarf, bag, tiny stamp notebook
- Stamp Clerk Cat: small cap, postal bag, stamp tool
- Mountain Cat: light backpack, tiny hiking detail
- Map Mage Cat: small cape, map and pen, only if kept away from direct IP cues
- Desk Studio Cat: stationery apron or sleeve covers, more studio-like than adventure-like

Recommended blend: Traveler Cat + Stamp Clerk Cat.

## Cat Voice

Language:

- English only for now
- No Chinese on cat bubbles
- Short lines only

Personality:

- Warm
- Philosophical in a slightly absurd way
- Gentle, not sarcastic
- Memorable but not too talkative

Example tone:

- "Some doors are just stickers with ambition."
- "Every stamp is a tiny yes."
- "The map is pretending to be certain."
- "If the mountain moves, check the glue."

Advanced future idea:

Build a Fiona voice bank from Fiona's own social posts, especially observations and humorous complaints. Use it to generate cat lines that feel like Fiona's voice without directly copying public posts. Keep this hidden in the experience at first; do not explain it on the page.

## Interaction Model

Decision: semi-automatic guided exploration.

User does:

- Clicks objects
- Clicks page tabs
- Clicks stamps
- Clicks cat for a light hint
- Maybe rotates or nudges camera slightly

Cat does:

- Moves to the clicked object
- Leads attention
- Opens details
- Turns pages
- Stamps progress

Avoid:

- Full free-roam controls
- Keyboard-only movement
- Touch joystick as first requirement
- Making visitors learn a game before seeing the site

## Page And World Structure

Do not lock page count yet. Feeling first, scope later.

Useful page categories:

- Cover / desk / table of contents
- Making log: how the site was made, tool orchestration, decision points, before/after
- Travel or hiking page: paper mountains, viewpoints, stamps
- Stamp passport page: progress and collectibles
- Puzzle page: small hidden interactions
- Resume link: visible but not intrusive

Important constraint:

- Do not add concrete work details or internal work examples.
- The site itself is the project.
- The making log can describe process, tools, decisions, and standards.

## Resume Entry

Resume path should be direct and visible without breaking immersion.

Preferred:

- A resume sticker or note on the first desk scene
- A second resume/about-author link at the end of the making log

Avoid:

- Making recruiter search inside the game world for basic resume access
- A large conventional header that weakens the world feeling

## Technical Direction

Current likely stack:

- React
- Three.js / React Three Fiber
- Drei
- Framer Motion for non-canvas overlays if needed
- Existing `?view=standard` or static fallback should be preserved in some form

Asset direction:

- Paper-craft 2.5D scenes
- Transparent illustrated cutouts placed in 3D
- Flat planes, hinge-like page movement, paper textures
- Low-poly objects only where they add value

This is not a downgrade from full 3D. It fits the pop-up notebook metaphor.

## Viewing Model

Decision: two camera modes, progressive disclosure.

- Mode A (page view): top-down look at the half-open notebook, cat walks on the flat page surface, page elements are flat paper stickers/stamps/photos
- Mode B (pop-up view): camera dollies in to one region of the current page, paper elements rise into 3D pop-up scene, cat stands inside the popped-up world

Trigger to enter B:

- User clicks a primary image/sticker block on the page (for example the mountain photo on the hiking page)
- Camera pushes in; paper elements in that region lift up; cat walks into the popped-up scene

Trigger to exit B back to A:

- User clicks empty space or presses ESC
- Paper elements collapse back to flat; camera pulls back to top-down

This is informed by the three-panel concept image: closed -> half-open -> popped-up was not three style options but three progressive states. Closed is skipped (first frame starts half-open). Half-open and popped-up are the two stable camera modes.

## UI Language

Proposal (needs Fiona confirm):

- Site UI default in English (table of contents, sticker labels, stamp names, cat lines, navigation)
- Resume PDF available in both English and Chinese versions
- Cat voice stays English-only per earlier decision

Reason: target audience includes overseas recruiters; bilingual UI overlays in the reference video read as cluttered. Keep one language inside the world to protect immersion.

## Page Turn Proposal

Proposed (needs Fiona confirm):

Default mechanic — cat-pushes-page:

- User clicks a page tab
- Cat walks to the page edge
- Cat pushes the page corner with paw
- Page flips over using hinge rotation on the spine (flat plane rotation, not curved-mesh bend)
- New page settles down

Unlocked shortcut — stamp teleport:

- After collecting all stamps on a page, user unlocks "stamp teleport" for that page
- On subsequent visits, clicking the page tab triggers a large stamp graphic to briefly cover the screen, then peel away to reveal the new page
- Bridges the page-turn mechanic to the stamp collection system, gives explorers a mechanical reward for completion

Alternative options not selected: realistic curved-page flip (too much shader work for v1); slide transitions (reads as slideshow not notebook).

## Open Decisions

Next decisions to resolve:

- Confirm UI language proposal (English-only inside the world)
- Confirm page turn proposal (cat-pushes-page default + stamp-teleport shortcut)
- Exact first page layout (what is actually printed on the half-open spread when site loads — table of contents? a welcome page? the most recent page?)
- Cat final design (pick from the variants in the Cat Visual Direction section)
- Stamp collection rules (how many stamps per page, where they hide, what counts as collected)
- First version content scope (which chapters ship v1; Fiona explicitly does not want to lock this yet)
- Standard/resume fallback route (keep `?view=standard`? new `/resume` static page?)
- Mobile adaptation plan (v2)

## Session Handoff (2026-05-22 evening)

Current round closed with viewing model resolved, UI language proposal pending, page turn proposal pending.

To resume: confirm or revise the two proposals (UI language, page turn), then move to first page layout and cat final design. Tab interaction is partly settled (clicking a tab triggers the cat-push-page sequence) but the exact tab visual and placement is still open.

## Communication Preferences For Future Planning

Use concise Chinese unless UI copy is being drafted in English.

Avoid dramatic or judgment-heavy wording. Avoid mixed English verbs/adjectives in Chinese explanations.

Preferred wording:

- 需要确认
- 建议调整
- 影响范围
- 可能导致构建失败
- 存在兼容性风险
- 验证方式

Avoid wording like:

- 必须
- 锁死
- 项目死
- 翻车
- 爆雷
- 致命
- 灾难
- build 会坏

