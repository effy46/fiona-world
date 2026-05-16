# NOTES

## Research Studied

Monument Valley (ustwo games, 2014) references studied before code:

- Screenshots and gameplay videos: low fixed isometric camera, dusty pastel palette, soft gradient backgrounds, serene negative space.
- Visual engine: flat-looking geometry, color blocks, minimal material detail, no camera freedom.
- Architecture: towers, pillars, arches, narrow bridges, stairs, sacred-geometry-inspired tessellation.
- Mechanic: crank/wheel rotates an architectural element, path connectivity changes, character can traverse.
- Audio pattern: small musical step notes and pitch feedback while rotating mechanisms.

Sources used:

- ustwo games Monument Valley official page: https://www.ustwogames.co.uk/games/monument-valley/
- Monument Valley trailer/gameplay references from official and store media: https://www.monumentvalleygame.com/
- Apple App Store / Google Play screenshots and gameplay media for public visual references.

## Captured

- Fixed low-isometric orthographic camera.
- Dusty pastel palette: peach, lavender, sage, dusty rose, cream, slate blue.
- Vertical architecture: Entry Tower, Projects Hall, Skills Garden, Thoughts Corridor, Contact Lighthouse.
- Arches, pillars, stairs, narrow bridges, water/sky atmosphere.
- Crank mechanic: four cranks rotate bridge/platform elements and solve section paths.
- Step chime, crank pitch, solve chord/drone via Tone.js.
- Static HTML fallback for no WebGL, `?view=standard`, and prerendered crawler routes.

## Avoided

- No copied MV level layouts, chapter names, character types, dialogue, music, or assets.
- No Penrose/impossible-geometry puzzles.
- No crow people, Totem, Storyteller, or MV-specific entities.
- No external game assets.

## Character

Used attached Fiona character spec as design direction:

- approachable, confident, curious
- long dark hair
- light blue shirt
- cream wide-leg pants
- white shoes
- brown crossbody bag

Implementation is a primitive low-poly approximation, not a detailed 3D model.

## Tech Substitution

Original plan named vite-ssg (Vue-focused). Substituted vite-react-ssg as React-compatible equivalent. Functionally equivalent for our prerender requirements.

## Trade-Offs

- Hand-authored path graph instead of navmesh or physics.
- MeshBasicMaterial everywhere; no lights, no shadows, no PBR.
- Gradient sky is CSS + transparent WebGL atmosphere planes, not HDR skybox.
- Character is primitive geometry, not rigged animation.
- Cranks support click and simple drag; not a high-fidelity circular drag control.
- SSG postbuild reinforces route meta/sitemap to keep crawler output predictable.

## Simplifications

- Resume PDF is placeholder.
- Contact links use placeholders.
- GoatCounter endpoint is placeholder until real analytics site is configured.
- No full canvas screen-reader model; Tier 1+2 accessibility only.
- Mobile uses header/static content as safe path; canvas exploration is secondary.

## Review Needed

- public email
- LinkedIn URL
- GitHub URL
- final resume PDF
- skills entries with depth markers
- case-study body content
- project business impact lines
- diagrams/screenshots
- real analytics endpoint

## Next Improvements

1. Replace placeholder resume and contact links.
2. Add final case-study body.
3. Add public-safe project impact lines.
4. Improve crank drag geometry and add visible angle ticks.
5. Add touch path controls for mobile.
6. Add route-level Playwright tests.
7. Add visual regression screenshots.
8. Improve character with a small custom low-poly model.
9. Add diagram assets for project cards.
10. Add final analytics endpoint and verify events.
