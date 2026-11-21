import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const url = process.env.NOTEBOOK_URL ?? 'http://127.0.0.1:5201/';
const viewport = process.env.CHAPTER_LOADING_MOBILE ? {width:390,height:844} : {width:1200,height:900};
const out = `output/playwright/chapter-loading${process.env.CHAPTER_LOADING_MOBILE ? '-mobile' : ''}`;
await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome'});
let releaseDesert, releaseStation;
const desertGate = new Promise(resolve => { releaseDesert = resolve; });
const stationGate = new Promise(resolve => { releaseStation = resolve; });
const checks = [], errors = [];
try {
  const page = await browser.newPage({viewport, reducedMotion: 'reduce'});
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/fonts/Caveat-Medium.ttf', async route => { await desertGate; await route.continue(); });
  await page.route('**/slow-post/models/*.glb', async route => { await stationGate; await route.continue(); });
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  await page.locator('[data-loaded="true"]').waitFor({timeout: 60000});
  await page.getByRole('button', {name: 'Open notebook', exact: true}).click();
  await page.locator('[data-ready="true"]').waitFor({timeout: 20000});
  for (const [chapter, actor, release] of [
    ['Making', 'Walk with desert cat', releaseDesert],
    ['Contact', 'Walk with station cat', releaseStation],
  ]) {
    await page.locator('.study-chapters').getByRole('button', {name: chapter, exact: true}).click();
    await page.locator(`[data-spread="${chapter.toLowerCase()}"][data-turning="false"]`).waitFor({timeout: 15000});
    await page.waitForTimeout(1200);
    await page.screenshot({path: `${out}/${chapter.toLowerCase()}-waiting.png`});
    const shield = page.locator('.study-chapter-loading');
    assert(await shield.isVisible(), `${chapter}: delayed scene has no full loading shield; previous page can remain exposed`);
    const box = await shield.boundingBox();
    assert(box.x <= 1 && box.y <= 1 && box.width >= viewport.width-2 && box.height >= viewport.height-2, `${chapter}: loading shield does not cover the previous page`);
    assert.equal(await shield.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(244, 239, 223)');
    release();
    await shield.waitFor({state: 'hidden', timeout: 30000});
    await page.locator(`[aria-label="${actor}"]`).waitFor({timeout: 30000});
    await page.waitForTimeout(1200);
    await page.screenshot({path: `${out}/${chapter.toLowerCase()}-ready.png`});
    checks.push(`${chapter}: pending scene covers old content, then reveals destination when ready`);
  }
  await page.locator('.study-chapters').getByRole('button', {name: 'Making', exact: true}).click();
  await page.locator('[data-spread="making"][data-turning="false"]').waitFor();
  assert.equal(await page.locator('.study-chapter-loading').count(), 0);
  checks.push('cached chapter return needs no loading shield');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/verification.json`, JSON.stringify({checks, errors}, null, 2) + '\n');
  console.log(JSON.stringify({checks, errors}));
} finally {
  releaseDesert(); releaseStation();
  await browser.close();
}
