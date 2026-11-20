// Browser acceptance for the isolated study. No existing app state is changed.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const url = process.env.DESK_STUDY_URL ?? 'http://127.0.0.1:5201/';
const output = process.env.DESK_STUDY_CAT_ONLY === '1' ? 'output/playwright/desk-study-cat' : 'output/playwright/desk-study';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const failures = [];
const checks = [];
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
page.on('pageerror', e => failures.push(e.message));
page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
async function check(name, action) {
  await action();
  checks.push(name);
}
async function shot(name, wait = 1400) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${output}/${name}.png` });
}
async function enterNotebook() {
  await page.locator('[data-loaded="true"]').waitFor({timeout:45000});
  await page.getByRole('button',{name:'Open notebook',exact:true}).click();
  await page.locator('[data-ready="true"]').waitFor({timeout:15000});
  await page.locator('[data-cat-phase="idle"]').waitFor({timeout:7000});
}
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await enterNotebook();
  await shot('01-desk', 1800);
  if (process.env.DESK_STUDY_CAT_ONLY !== '1') {
  await check('bookbinding low-angle view', async () => {
    await page.waitForTimeout(800);
    await page.mouse.move(800,650);
    await page.mouse.down();
    await page.mouse.move(800,420,{steps:24});
    await page.mouse.up();
    await shot('14-bookbinding-low',900);
    await page.screenshot({path:`${output}/15-bookbinding-corner.png`,clip:{x:930,y:475,width:640,height:350}});
  });
  await check('reading view', async () => {
    await page.getByRole('button', { name: 'Read the pages' }).click();
    await page.locator('[data-view="read"]').waitFor();
    await shot('02-reading');
  });
  await check('paper-world close view and Escape return', async () => {
    await page.getByRole('button', { name: 'Explore the paper world' }).click();
    await page.locator('[data-view="world"]').waitFor();
    await shot('03-world');
    await page.screenshot({path:`${output}/29-camp-smoke.png`,clip:{x:580,y:545,width:260,height:340}});
    await page.waitForTimeout(800);
    await page.mouse.move(1060,650);
    await page.mouse.down();
    await page.mouse.move(1240,650,{steps:18});
    await page.mouse.up();
    await shot('12-assembly-left',700);
    await page.mouse.move(1100,650);
    await page.mouse.down();
    await page.mouse.move(760,650,{steps:24});
    await page.mouse.up();
    await shot('13-assembly-right',700);
    await page.keyboard.press('Escape');
    await page.locator('[data-view="desk"]').waitFor();
    await page.waitForFunction(() => document.activeElement?.textContent?.includes('Explore the paper world'), undefined, { timeout: 3000 });
    if (!(await page.getByRole('button', { name: 'Explore the paper world' }).evaluate(el => el === document.activeElement))) {
      throw new Error('Escape did not restore focus to exploration control.');
    }
  });
  await check('forward turn and making spread', async () => {
    await page.getByRole('button', { name: 'Making', exact: true }).click();
    await page.locator('[data-turning="true"]').waitFor();
    await shot('04-turning', 800);
    await page.locator('[data-spread="making"][data-turning="false"]').waitFor({ timeout: 15000 });
    await shot('05-making');
  });
  await check('backward turn', async () => {
    await page.getByRole('button', { name: 'Turn back' }).click();
    await page.locator('[data-turning="true"]').waitFor();
    await shot('11-backward-turning', 650);
    await page.locator('[data-spread="start"][data-turning="false"]').waitFor({ timeout: 15000 });
  });
  await check('mobile framing and controls, 390 × 844', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await shot('06-mobile-desk', 1600);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal overflow.');
    await page.getByRole('button', { name: 'Explore the paper world' }).click();
    await shot('07-mobile-world');
    await page.getByRole('button', { name: 'Back to desk' }).click();
    await page.getByRole('button', { name: 'Read the pages' }).click();
    await shot('08-mobile-reading');
    await page.getByRole('button', { name: 'Read right page' }).click();
    await shot('09-mobile-right-page');
    await page.getByRole('button', { name: 'Making', exact: true }).click();
    await page.locator('[data-spread="making"][data-turning="false"]').waitFor({ timeout: 15000 });
    await page.getByRole('button', { name: 'Read the pages' }).click();
    await page.getByRole('button', { name: 'Read left page' }).click();
    await page.getByRole('button', { name: 'Read right page' }).click();
    await shot('10-mobile-making-right');
  });
  await check('reduced motion with forward/back turns and Escape', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await enterNotebook();
    await page.getByRole('button', { name: 'Making', exact: true }).click();
    await page.locator('[data-spread="making"][data-turning="false"]').waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Turn back' }).click();
    await page.locator('[data-spread="start"][data-turning="false"]').waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Explore the paper world' }).click();
    await page.keyboard.press('Escape');
    await page.locator('[data-view="desk"]').waitFor();
  });
  await check('keyboard controls', async () => {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => document.activeElement?.tagName);
    if (active !== 'BUTTON' && active !== 'A') throw new Error('Keyboard focus lost.');
  });
  await check('direct passport navigation without dialogue', async () => {
    await page.setViewportSize({width:1600,height:1100});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.reload({waitUntil:'domcontentloaded'});
    await enterNotebook();
    await page.waitForTimeout(1800);
    await page.getByRole('button',{name:'Making passport stamp',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-spread="making"][data-turning="false"][data-making-visited="true"]').waitFor({timeout:10000});
    if (!await page.getByRole('button',{name:'Making',exact:true}).evaluate(el=>el===document.activeElement)) throw new Error('Chapter focus lost after direct stamp navigation.');
    if (await page.getByRole('region',{name:'Cat guide'}).count()) throw new Error('Dialogue remains.');
    await page.getByRole('button',{name:'Turn back',exact:true}).click();
    await page.locator('[data-spread="start"][data-turning="false"]').waitFor({timeout:10000});
    await shot('20-direct-stamp-return');
    if (!await page.getByRole('button',{name:'Projects passport stamp',exact:true}).count()) throw new Error('Projects passport target missing.');
    await page.getByRole('button',{name:'Read the pages',exact:true}).click();
    await page.waitForTimeout(1600);
    await page.getByRole('button',{name:'Making passport stamp',exact:true}).click();
    await page.locator('[data-spread="making"][data-turning="false"]').waitFor({timeout:10000});
    await page.getByRole('button',{name:'Turn back',exact:true}).click();
    await page.locator('[data-spread="start"][data-turning="false"]').waitFor({timeout:10000});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Read the pages',exact:true}).click();
    await page.waitForTimeout(1800);
    await page.getByRole('button',{name:'Making passport stamp',exact:true}).click();
    await page.locator('[data-spread="making"][data-turning="false"]').waitFor({timeout:10000});
    await shot('21-mobile-direct-stamp');
    await page.getByRole('button',{name:'Turn back',exact:true}).click();
    await page.locator('[data-spread="start"][data-turning="false"]').waitFor({timeout:10000});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.getByRole('button',{name:'Read the pages',exact:true}).click();
    await page.waitForTimeout(300);
    await page.getByRole('button',{name:'Start passport stamp',exact:true}).click();
    await page.locator('[data-view="world"]').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('[data-view="desk"]').waitFor();
  });
  }
  await check('cat walks, returns, cancels on turn and supports reduced motion', async () => {
    await page.setViewportSize({width:1600,height:1100});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.reload({waitUntil:'domcontentloaded'});
    await enterNotebook();
    await page.waitForTimeout(1800);
    await page.screenshot({path:`${output}/22-cat-integrated-desk.png`});
    const catTarget=page.getByRole('button',{name:'Walk with the cat',exact:true});
    const hit=await catTarget.boundingBox();
    await page.mouse.click(hit.x+hit.width/2,hit.y+hit.height*.17);
    await page.locator('[data-cat-phase="walk"]').waitFor({timeout:6000});
    await page.screenshot({path:`${output}/23-cat-walking.png`});
    await page.locator('[data-cat-phase="idle"]').waitFor({timeout:6000});
    await shot('24-cat-stopped',300);
    const walk=page.locator('.study-actions').getByRole('button',{name:'Walk with the cat',exact:true});
    await walk.focus();await page.keyboard.press('Enter');
    await page.locator('[data-cat-phase="walk"]').waitFor({timeout:6000});
    await page.screenshot({path:`${output}/25-cat-returning.png`});
    await page.locator('[data-cat-phase="idle"]').waitFor({timeout:6000});
    if(!await walk.evaluate(el=>el===document.activeElement)) throw Error('Cat control focus not restored.');
    await walk.click();
    await page.locator('[data-cat-phase="turn"]').waitFor();
    await page.waitForTimeout(80);
    await page.screenshot({path:`${output}/26-cat-repeat-turn.png`});
    await page.locator('[data-cat-phase="walk"]').waitFor({timeout:6000});
    await page.getByRole('button',{name:'Making',exact:true}).click();
    await page.locator('[data-spread="making"][data-turning="false"][data-cat-phase="idle"]').waitFor({timeout:10000});
    await page.getByRole('button',{name:'Turn back',exact:true}).click();
    await page.locator('[data-spread="start"][data-turning="false"]').waitFor({timeout:10000});
    await page.waitForTimeout(500);
    if(await page.locator('main').getAttribute('data-cat-phase')!=='idle')throw Error('Cancelled journey replayed after page return.');
    await page.getByRole('button',{name:'Explore the paper world',exact:false}).click();
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(1800);
    await walk.click();
    await page.locator('[data-cat-phase="walk"]').waitFor({timeout:6000});
    await page.screenshot({path:`${output}/27-mobile-cat-walking.png`});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('[data-cat-phase="idle"]').waitFor({timeout:3000});
    await walk.click();
    await page.waitForTimeout(400);
    if(await page.locator('main').getAttribute('data-cat-phase')!=='idle')throw Error('Reduced-motion cat animated.');
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Cat controls overflow mobile.');
    await page.screenshot({path:`${output}/28-mobile-cat-stopped.png`});
  });
  if (failures.length) throw new Error(failures.join('\n'));
} catch (error) {
  failures.push(error.message);
  await page.screenshot({ path: `${output}/failure.png` });
} finally {
  await writeFile(`${output}/verification.json`, JSON.stringify({ url, checks, failures }, null, 2) + '\n');
  await browser.close();
}
console.log(JSON.stringify({ checks, failures, output }));
if (failures.length) process.exitCode = 1;
