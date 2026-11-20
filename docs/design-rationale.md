# Design rationale — fiona-world

The 2D-multi-view approach is not a workaround; it's the canonical Monument Valley implementation pattern. This document captures what we learned during research and how it shaped v5.

## Why 2D multi-view ≠ a workaround

MV's gameplay reads as continuous 3D rotation, but under the hood much of the visual effect is achieved by **decoupling** the character's walkable path graph from the rendered architecture. The architecture itself can be 2D layered images, separately animated 3D models, or any mix — what matters is that the player can move along a graph whose edges align visually with the current rendered state.

This was confirmed by independent developers building MV-inspired demos:

> *"人物行走的路线和背景是分开的。也就是说，背景如何荒谬，都不会影响到路线 —— 一般游戏都是这样做的，而关键之处就在于，路线和背景的改变需要配合得天衣无缝，造成一种'悖论式'的错觉。"*
>
> — 啫臣 Jason, ZheChen Long Term Capital, 2014
> ([Zhihu thread](https://www.zhihu.com/question/23312258), top answer with 218 upvotes)

His 2014 demo used:
- 3 background images (Upper + Lower + Moving Cube inserted between)
- A separate walkable path graph (white areas in a logic layer)
- State triggers that swap **both** the graph and the rendered composition
- "**路线和背景的改变需要配合得天衣无缝**" — the path and the background must change in lockstep

This is exactly the contract our v5 implementation honors:
- `public/scenes/entry-state-{0,1}.png` are the rendered states
- `src/data/scene-graph.ts` is the walkable graph + per-state edge enablement
- The rotator state triggers both the image swap and the graph update simultaneously

## The "magic" happens in the transition, not the state

The reason MV feels distinct from Escher (and from any static isometric illustration) is that its "impossible" property emerges only during state changes:

> *"纪念碑谷中的关键不可能属性往往并不来自静态图像本身，而是在运动过程中'突然'出现的。"*
>
> *"典型例子如这一关里的米黄色滑块的两种状态：这两种状态单独出现，都不构成矛盾。但是一旦把它们连接起来，就能看到这个滑块的轨迹构成了上下两个不可能图形。这使得矛盾感集中在了滑动的一瞬间。"*
>
> — 果壳网 / 知乎, by Ent

This validates an aesthetic principle that drove our patch 1 (transition rewrite): the transition between states is where the user actually experiences the design. Hard cuts feel like loading screens; over-engineered card flips feel like UI tricks. A crossfade with a subtle scale dip preserves the *feel* of architectural reconfiguration without pretending to be true 3D rotation.

## Why isometric specifically

MV uses isometric projection (~30° low angle, all three axes at equal scale, 120° between them). Two consequences:

1. **No perspective distance cues.** Distant objects don't shrink. This removes one of Escher's standard tools for evoking depth — and as a result, MV's static frames look less inherently paradoxical than Escher's prints. The paradox has to come from elsewhere (motion, transitions).

2. **Visual elements are reusable across positions.** A wall tile looks the same at the "front" of the scene as at the "back" because there is no foreshortening. This makes asset reuse and procedural composition feasible.

For us, this is the reason 2D illustrations can be drop-in substitutes for what would otherwise need 3D meshes: the isometric framing means our PNGs encode the same visual information a 3D renderer would output for the same camera angle.

## What we deliberately do NOT attempt

Honest accounting of MV-defining features we are **not** trying to replicate:

| Feature | Why skipped |
|---|---|
| Penrose stairs / impossible geometry | Out of scope per plan v1.2. The cranks/rotators carry the puzzle weight, no impossible figures. |
| Continuous 3D rotation animation | Cannot be faithfully reproduced with 2D image swap. We accept theatrical, not spatial. (See NOTES.md "What 2D multi-view captures vs misses.") |
| Multi-direction character sprites | gpt-image-2 cannot reliably produce orientation-consistent multi-view sprites. We use a single Fiona pose. MV's Ida is intentionally symmetric so this isn't a problem; ours has identifiable asymmetry (bag, hair sweep), so a single pose will read slightly off for some path directions. Accepted as a v1 trade-off. |
| Real-time parallax / live occlusion | Impossible with static images. The 2D backdrop is just a 2D backdrop. |

The honest NOTES.md framing (per patch 9) covers this in the case-study voice.

## What this means for the implementation

Concretely, the v5 architecture is right and we should not pivot away from it. The remaining work is execution:

1. **Cinematic scripting** — the Entry Tower experience should be a hand-authored sequence (walk → trigger → state swap → walk) rather than free-roam exploration. This matches how MV levels are actually constructed: each level is a designed puzzle, not an open world.
2. **Per-scene `dominantColor`** (patch 8) so PNG load doesn't flash white.
3. **Per-state waypoint mapping** (patch 4) so the character's position remains coherent across state swaps.
4. **Mobile aspect lock** (patch 5) so the path graph never visually misaligns from the scene PNG at small viewports.
5. **NOTES.md honest framing** (patch 9) so the case study has accurate language.

## Source links

- [《纪念碑谷》系列游戏的空间结构是如何设计的？ — 知乎](https://www.zhihu.com/question/23312258) — top 3 answers contain the core technical insights
- [Monument Valley Chapter 1 walkthrough (Part 1) — MinTao Hsieh on YouTube](https://www.youtube.com/watch?v=7-k4PYA5DI8) — 36-min gameplay, demonstrates rotation + scene transitions
- ~~USTWO Behind the Scenes on Vimeo~~ — [original link](https://vimeo.com/89525141) removed; archive may exist elsewhere
- [Monument Valley game (Wikipedia)](https://en.wikipedia.org/wiki/Monument_Valley_(video_game))
- [Penrose triangle (Wikipedia)](https://en.wikipedia.org/wiki/Penrose_triangle)
- [M.C. Escher official site](http://www.mcescher.com/) — *Waterfall*, *Belvedere*, *Relativity* are the most-cited MV influences
