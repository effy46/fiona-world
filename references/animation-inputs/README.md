# Animation inputs

Reference assets to attach to ChatGPT (gpt-image-2) when generating the
walking-animation frame sequence for the Entry Tower cinematic.

| File | Role | Notes |
|------|------|-------|
| `01-scene-state-0.png` | Starting scene (path blocked) | Architecture, palette, lighting, fog must be preserved across animation frames 1-5 |
| `02-scene-state-1.png` | Ending scene (path open with arched bridge + stairs) | Same constraints, frames 8-12 |
| `03-character-sprite.png` | Character (Fiona) sprite to insert | Outfit, proportions, flat-color style locked |
| `04-storyboard-reference.png` | 6-panel walking sequence | Used as character-scale reference AND movement-direction reference |

Attach all 4 to the same ChatGPT conversation when prompting.
The prompt is at `prompts/walking-animation-prompt.md`.
