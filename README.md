# Fiona World

Fiona Feng’s personal Traveler’s Notebook: an interactive paper-craft portfolio with a shared writer desk and cat guide. Built with React, TypeScript, Vite, React Three Fiber, Drei and Three.js.

## Run

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Development uses port 5201. `/` opens the final integrated notebook through the sole HTML entry, `index.html`. Chapters are Start, Making, Projects and Contact; Making includes process notes and airmail, Contact includes the station postmark. The old separate routes and duplicate cat sandbox have been removed.

## Layout

- `src/notebook/desk-study/`: opening, pages, text, chapter state and cat.
- `src/notebook/scenes/`: desert and station scene content.
- `src/notebook/WriterDeskProps.tsx`, `CameraStillLife.tsx`, `DeskProps.tsx`: shared desk objects, candle and steam.
- `src/content/publicLinks.ts`: public contact/project links; résumé stays pending.
- `public/`: assets loaded by the browser.
- `assets/`: editable Blender sources, source textures and original cat sheets.
- `scripts/`: Blender/texture generators and browser verification.

## Verify

```sh
node scripts/check-notebook-drift.mjs
npm run build
node scripts/desk-study/verify-chapters.mjs
node scripts/desk-study/verify-airmail.mjs
```

Run the browser checks with the dev server on port 5201 and Chrome installed. Their screenshots/results go to ignored `output/playwright/`. Generators require Blender or Python with Pillow/NumPy; they are not needed for the website build.

## GitHub Pages

The workflow deploys pushes to `main` or an explicit manual run. It runs `npm ci` and `GITHUB_PAGES=true npm run build`, then publishes `dist/`. Runtime assets honor `/fiona-world/`. Pushing the redesign branch alone does not trigger automatic publication.

Screenshots, generated builds, reference material, local machine settings and Blender backups are ignored. Keep the source `assets/` and `package-lock.json` in version control. `references/pre-cleanup-2026-11-20.tar.gz` is a local recovery snapshot of the previous code, not a publishable asset.
