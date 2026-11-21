import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {cameraFromHtml} from './camera-from-html.mjs';

const url = process.env.NOTEBOOK_URL ?? 'http://127.0.0.1:5201/';
const out = 'output/playwright/pinch-zoom';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome'});
const checks = [], errors = [];
try {
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  page.on('pageerror', error => errors.push(error.message));
  async function pinch(from, to) {
    const points = distance => [
      {x: 195 - distance / 2, y: 390, id: 1},
      {x: 195 + distance / 2, y: 390, id: 2},
    ];
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: points(from)});
    for (let step = 1; step <= 12; step++) {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: points(from + (to - from) * step / 12)});
      await page.waitForTimeout(30);
    }
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    await page.waitForTimeout(1800);
  }
  await page.goto(url);
  await page.locator('[data-loaded="true"]').waitFor({timeout: 60000});
  await page.getByRole('button', {name: 'Open notebook', exact: true}).tap();
  await page.locator('[data-ready="true"]').waitFor({timeout: 20000});
  await page.waitForTimeout(3400);
  for (const chapter of ['Start', 'Making', 'Projects', 'Contact']) {
    if (chapter !== 'Start') {
      await page.locator('.study-chapters').getByRole('button', {name: chapter, exact: true}).tap();
      await page.locator(`[data-spread="${chapter.toLowerCase()}"][data-turning="false"]`).waitFor({timeout: 15000});
      await page.waitForTimeout(1800);
    }
    const selector = chapter === 'Contact' ? 'button[aria-label="Email Fiona"]' : '.study-page-corner';
    const before = await cameraFromHtml(page, 390, 844, selector);
    const width = await page.locator(selector).evaluate(node => node.getBoundingClientRect().width);
    await pinch(100, 230);
    const zoom = Number(await page.locator('main').getAttribute('data-notebook-zoom'));
    assert(zoom > .4, `${chapter}: spreading two fingers did not zoom in (level ${zoom})`);
    assert(await page.locator(selector).evaluate(node => node.getBoundingClientRect().width) > width * 1.1, `${chapter}: scene did not visually enlarge`);
    const close = await cameraFromHtml(page, 390, 844, selector);
    assert(before.quaternion.angleTo(close.quaternion) < .002, `${chapter}: pinch rotated the camera`);
    await page.screenshot({path: `${out}/${chapter.toLowerCase()}-close.png`});
    await pinch(230, 100);
    assert(Math.abs(Number(await page.locator('main').getAttribute('data-notebook-zoom'))) < .04, `${chapter}: reverse pinch did not restore size`);
    assert.equal(await page.evaluate(() => visualViewport.scale), 1);
    checks.push(`${chapter}: native touch spread/close zooms the scene without camera rotation or browser zoom`);
  }
  await page.getByRole('button', {name: 'Read the pages', exact: true}).tap();
  await page.waitForTimeout(1800);
  await pinch(100, 230);
  assert(Number(await page.locator('main').getAttribute('data-notebook-zoom')) > .4);
  await page.getByRole('button', {name: '← Back to desk', exact: true}).tap();
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('main').getAttribute('data-notebook-zoom'), '0.000');
  checks.push('reading view supports pinch and Back to desk restores the full notebook');
  const resting = await cameraFromHtml(page, 390, 844, 'button[aria-label="Email Fiona"]');
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 140, y: 350, id: 1}]});
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 140 + step * 5, y: 350 + step * 2, id: 1}]});
    await page.waitForTimeout(30);
  }
  await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  await page.waitForTimeout(1500);
  const rotated = await cameraFromHtml(page, 390, 844, 'button[aria-label="Email Fiona"]');
  assert(resting.quaternion.angleTo(rotated.quaternion) > .01, 'single-finger rotation stopped working after pinch');
  checks.push('single-finger drag still rotates the view after a completed pinch');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/verification.json`, JSON.stringify({checks, errors}, null, 2) + '\n');
  console.log(JSON.stringify({checks, errors}));
} finally {
  await browser.close();
}
