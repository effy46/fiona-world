import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const url = process.env.NOTEBOOK_URL ?? 'http://127.0.0.1:5201/';
const out = 'output/playwright/notebook-loading';
await mkdir(out, {recursive: true});
const browser = await chromium.launch({channel: 'chrome'});
const checks = [];
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let releaseBundle;
  const bundleGate = new Promise(resolve => { releaseBundle = resolve; });
  await page.route(/\/(?:assets\/[^/]+\.js|src\/notebook\/desk-study\/main\.tsx)(?:\?|$)/, async route => {
    await bundleGate;
    await route.continue();
  });
  await page.goto(url, {waitUntil: 'commit'});
  const loader = page.locator('#notebook-loading');
  await loader.getByText('Packing a little world for you…').waitFor();
  await page.waitForFunction(() => {
    const image = document.querySelector('#notebook-loading img');
    return image.complete && image.naturalWidth > 0;
  });
  assert.equal(await page.locator('main').count(), 0);
  assert.equal(await loader.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(244, 239, 223)');
  await page.screenshot({path: `${out}/01-before-javascript.png`});
  checks.push('illustration, styling and feedback appear before the scene JavaScript');
  await loader.getByText('Still getting things ready.', {exact: false}).waitFor({timeout: 12000});
  await page.screenshot({path: `${out}/02-long-wait.png`});
  checks.push('long-wait copy updates even while the JavaScript bundle is delayed');
  releaseBundle();
  await page.locator('[data-loaded="true"]').waitFor({timeout: 60000});
  await loader.waitFor({state: 'hidden'});
  assert.equal(await page.locator('main').getAttribute('data-opening'), 'closed');
  await page.getByRole('button', {name: 'Open notebook', exact: true}).click();
  await page.locator('[data-ready="true"]').waitFor({timeout: 20000});
  await page.screenshot({path: `${out}/03-opened.png`});
  assert.deepEqual(errors, []);
  checks.push('ready scene dismisses the shield, remains closed, then opens by click');
  await page.close();

  const mobile = await browser.newPage({viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  await mobile.route('**/desk-study/desk-scene.glb', () => {});
  await mobile.goto(url, {waitUntil: 'domcontentloaded'});
  await mobile.locator('#notebook-loading img').waitFor();
  assert.equal(await mobile.locator('#notebook-loading img').evaluate(node => getComputedStyle(node).animationName), 'none');
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.screenshot({path: `${out}/04-mobile-reduced.png`});
  checks.push('mobile layout fits and reduced motion stops illustration animation');
  await mobile.close();

  const failure = await browser.newPage();
  await failure.route('**/desk-study/desk-scene.glb', route => route.abort());
  await failure.goto(url, {waitUntil: 'domcontentloaded'});
  await failure.getByRole('heading', {name: 'The notebook couldn’t open.'}).waitFor({timeout: 30000});
  await failure.locator('#notebook-loading').waitFor({state: 'hidden'});
  assert(await failure.getByRole('button', {name: 'Try again', exact: true}).isVisible());
  checks.push('scene failure dismisses the shield and reveals retry controls');
  await failure.close();
  await writeFile(`${out}/verification.json`, JSON.stringify({checks}, null, 2) + '\n');
  console.log(JSON.stringify({checks}));
} finally {
  await browser.close();
}
