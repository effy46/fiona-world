# Fiona World — Agent Continuation Notes

This project is in **planning / design interview mode**. Do NOT implement code unless Fiona explicitly asks. The website is being redesigned from a Monument Valley static-illustration direction (v5) to a Fiona's Traveler's Notebook explorable 3D site (v6).

## Read These First (in order) Before Responding

1. `docs/notebook-studio-redesign-notes.md` — canonical decisions + open questions
2. `docs/next-agent-handoff.md` — Codex's previous handoff with hard instructions
3. `docs/claude-session-handoff-2026-05-29.md` — Claude's last session handoff

If any of those files exist and you have not read them in this session, read them before asking Fiona anything. The decisions are the source of truth; do not re-litigate settled items.

## Current State (snapshot — verify against canonical doc)

- World concept: Fiona's Traveler's Notebook (warm desk, half-open notebook, cat guide)
- Tech direction: React + React Three Fiber + Drei, paper-craft 2.5D, flat-plane hinge page rotation
- Visual model: two camera modes (Page view top-down + Pop-up view local 3D)
- Interaction: semi-automatic guided exploration. User clicks; cat walks and acts
- Cat: cream/white, green scarf, postal bag, "Traveler + Stamp Clerk" blend. Voice English-only, philosophical-absurd short lines
- Constraint: do NOT put concrete work content on the site. Site itself is the portfolio

## Pending Fiona Confirms (left over from 2026-05-29 session)

1. UI language: site UI English-only, resume PDF EN+CN, cat voice EN?
2. Page turn mechanic: cat-pushes-page default + stamp-teleport unlock after page completion?

Get these confirmed first. Then proceed to: first page layout → cat final design → stamp rules.

## Interview Style (mandatory)

Use Grill Me cadence — one decision per turn:

```
Current read: [one sentence summary of where we are]
Question: [one concrete branch question]
Recommended answer: [your pick + brief reason]
```

Do NOT push back into page count or schedule discussion. Fiona explicitly wants "protect feeling first, scope later".

## Chinese Style Rules (mandatory — Fiona corrected violations multiple times)

Default to Chinese. UI copy drafts can be English.

**Banned words** (do not use): 必须 / 锁死 / 项目死 / 翻车 / 爆雷 / 致命 / 灾难 / build 会坏 / 撑不下来 / 不可接受 / 严重

**No 翻译腔 (translation-ese)**:
- "接住反馈" → 收到 / 认同 / 你说得对
- "让我们" → 那 / 直接
- "倒回去" → 回到
- "好问题" → 直接答
- "push back" → 我不同意

**No English verbs/adjectives mixed into Chinese sentences**. English fine for proper nouns / brand names / code paths / UI copy quotes. Specific replacements:

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

## Repo Conventions

- Branch: `v5-2d-rebuild` (current redesign branch; ignore `main`)
- `docs/` is in `.gitignore` but planning docs are force-tracked (`git add -f`). Subsequent edits do not show as modified — re-add explicitly if updating
- `references/` is in `.gitignore` and stays untracked. Reference video and concept images live there
- Do NOT commit or push unless Fiona asks. Per `feedback_codex_no_commit_push.md` convention from her other repos
- Do NOT touch `src/` files; that is the v5 static-illustration codebase, not the redesign target
