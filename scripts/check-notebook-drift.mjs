#!/usr/bin/env node
// The former duplicate sandbox was retired when the integrated notebook became the homepage.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const entry = readFileSync(new URL('index.html', root), 'utf8');
const valid = entry.includes('/src/notebook/desk-study/main.tsx')
  && existsSync(fileURLToPath(new URL('src/notebook/desk-study/main.tsx', root)))
  && !existsSync(fileURLToPath(new URL('cat-lab/src', root)));
console.log(valid ? 'Canonical notebook: src/notebook/desk-study/ + public/. Legacy sandbox retired.' : 'Notebook entry or sandbox needs review.');
process.exitCode = valid ? 0 : 1;
