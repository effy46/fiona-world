# Fiona World — Agent Instructions

Current direction: Fiona’s Traveler’s Notebook — warm writer desk, paper-craft scenes and a cream/white cat with green scarf and postal bag. Default to Chinese. UI is English-only. Implement authorized work; discuss new design choices one concrete question at a time. No commits or pushes unless Fiona explicitly asks.

## Current source of truth — 2026-11-20

Fiona selected the integrated notebook as the final website and authorized removing old prototypes/assets. `index.html` is the only HTML entry; `/` loads `src/notebook/desk-study/main.tsx`. The former `/desk-study.html` compatibility entry has been removed. The old root app, standalone routes and `cat-lab/` sandbox are retired; do not restore them from historical handoffs.

- Runtime: `src/notebook/desk-study/`, `src/notebook/scenes/`, shared `WriterDeskProps.tsx`, `DeskProps.tsx` (candle/steam only), `CameraStillLife.tsx`, `NotebookOpening.tsx`, `catMotion.ts`.
- Runtime assets: `public/`. Editable Blender files, generator textures and animation originals: `assets/`.
- Asset URLs loaded at runtime use `src/lib/publicAsset.ts` so GitHub Pages `/fiona-world/` works. CSS public URLs are handled by Vite.
- One fixed writer desk on all spreads; only notebook contents change. Preserve approved opening, cat-push page turns, chapter navigation, reduced motion and visit-local postmark progress.
- No employer/internal work details on the public site. Personal projects such as PawPal are allowed. Résumé remains pending; do not expose placeholder PDFs.
- Keep existing dirty work. Branch: `v5-2d-rebuild`. Do not stage, commit or push without explicit authorization.
- `references/`, `docs/`, generated `output/`, local settings and caches are ignored. Existing tracked planning docs remain tracked; do not broadly stage private references.
- Previous mailbox and handoffs describe historical work. Read them for context; current user instructions and this entry decision take precedence. Update planning documentation after behavior changes.

## Read for current detail

1. `docs/pre-publish-cleanup-2026-11-20.md` — cleanup scope, preserved sources and verification.
2. `docs/unified-notebook-tabs-2026-11-16.md` — integrated chapter behavior; its old independent-sample ownership section is superseded by the cleanup note.
3. `docs/desert-detour.md` — approved airmail visuals and interaction.
4. `docs/writer-desk-redesign.md`, `docs/camera-still-life.md` — shared props and materials. Historical root/standalone staging is superseded by integrated source coordinates.

## Verification

Before notebook edits: `node scripts/check-notebook-drift.mjs` (checks the canonical entry; old duplicate sandbox is gone).

- `npm run build` — TypeScript and production bundle.
- `GITHUB_PAGES=true npm run build` — deployment subdirectory bundle.
- `npm run dev` — port 5201.
- `node scripts/desk-study/verify-chapters.mjs`, `node scripts/desk-study/verify-airmail.mjs` — existing browser regression checks. Save captures in ignored `output/playwright/`.
- Inspect the live app visually. Build success alone does not verify interaction or asset loading.

## Rendering conventions

Paper decals use transparent materials with depthWrite false and polygonOffset -2/-2; Drei Text uses depthOffset -4. Separate stacked layers slightly. RoundedBox radius stays smaller than half its thickness. Avoid regular procedural grids; use irregular texture grain and anisotropy. Preserve shared scene geometry, cat scale and material behavior during cleanup.

## Chinese Style Rules (mandatory — Fiona corrected violations multiple times)

Canonical full guide = the global `no-doom-language` memory (banned words, 翻译腔 table, examples, rationale). That memory is NOT auto-loaded in this project's scope, so the safety-net subset is kept inline below — but edit the canonical memory as the master; this is a derived subset, not a second master.

Default to Chinese. UI copy drafts can be English.

**Banned words** (do not use): 必须 / 锁死 / 项目死 / 翻车 / 爆雷 / 致命 / 灾难 / build 会坏 / 撑不下来 / 不可接受 / 严重

**No 翻译腔 (translation-ese)** — full list in the canonical memory; the worst offenders: "接住反馈" → 收到 / 你说得对; "让我们" → 那 / 直接; "倒回去" → 回到; "好问题" → 直接答; "push back" → 我不同意.

**No English verbs/adjectives mixed into Chinese sentences**. English fine for proper nouns / brand names / code paths / UI copy quotes. Project-specific replacements:

| Bad | Good |
|---|---|
| drop（发布意思）| 发布 |
| fast-lane | 快线 |
| metaphor | 隐喻 |
| trade-off | 取舍 |
| fallback | 兜底 |
| sticker | 贴纸 |
| ban | 禁用 |
| pivot | 转向 |
| convergence | 收敛 |
| Recruiter / Backstage / desk / viewpoint / puzzle / hinge / 2.5D | 招聘者 / 制作日志 / 桌面 / 视角 / 解谜 / 翻页铰链 / 纸片立体场景 |

Brand/tool names stay English: Codex / Claude / Snowflake / dbt / Three.js / R3F / SSG / WebGL / MVP / mailbox / Drei.

**No emoji priority markers** (no 🚨⚠️🔧💡). Use text only: P0 阻塞 / P1 高风险 / P2 体验改进 / P3 说明.

Format each issue as: 问题 / 影响 / 建议修改 / 验证方式. Stay neutral, concrete, executable.
