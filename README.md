# Fiona World

Interactive 3D personal portfolio for Fiona Feng.

Tech: Vite, React, TypeScript, React Three Fiber, Three.js, Drei, vite-react-ssg, Zustand, Framer Motion, Tone.js, react-helmet-async, Leva, GoatCounter.

## Run Locally

```bash
npm install
npm run dev
```

Open the Vite URL, usually:

```bash
http://127.0.0.1:5173/
```

## Build SPA

```bash
npm run build
```

## Build Static Prerender

```bash
npm run build:ssg
```

Prerendered routes:

- `/`
- `/projects`
- `/skills`
- `/thoughts`
- `/contact`
- `/standard`

Verify crawler-visible content:

```bash
curl dist/projects/index.html | grep "Cross-System Parity Validation Framework"
curl dist/thoughts/index.html | grep "Case Study: Cross-System Parity Validation"
```

## Preview Build

```bash
npm run preview
```

Use this after the normal local build or local SSG build. GitHub Pages builds use
`GITHUB_PAGES=true`, which intentionally emits `/fiona-world/` asset paths for deployment.

## GitHub Pages Deploy

Workflow: `.github/workflows/deploy.yml`

GitHub repo settings:

1. Settings -> Pages.
2. Source = GitHub Actions.
3. Push to `main` or run workflow manually.

Workflow command:

```bash
GITHUB_PAGES=true npm run build:ssg
```

Vite base path is `/fiona-world/`.

## Standard View

Use:

```text
?view=standard
```

or route:

```text
/standard
```

This renders the same accessible, crawler-visible HTML content without requiring WebGL.

## Production Content Still Needed

- final public email
- final LinkedIn URL
- final GitHub URL
- final resume PDF
- skills depth markers
- case-study body
- public-safe business impact lines
- diagrams/screenshots
