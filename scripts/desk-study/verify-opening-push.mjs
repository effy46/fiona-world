import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/opening-push';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:650,height:800},deviceScaleFactor:2});const errors=[];const spans=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
async function span(){
 const x=name=>page.locator(`.study-stamp-target[aria-label="${name} passport stamp"]`).evaluate(el=>el.parentElement.parentElement.getBoundingClientRect().x);
 return Math.abs(await x('Making')-await x('Start'));
}
try{
 await page.goto('http://127.0.0.1:5201/?v=opening-push');await page.locator('[data-loaded="true"]').waitFor({timeout:45000});await page.waitForTimeout(1400);await page.screenshot({path:`${out}/01-cover.png`});await page.getByRole('button',{name:'Open notebook',exact:true}).click();await page.locator('[data-ready="true"]').waitFor({timeout:15000});await page.waitForTimeout(80);spans.push(await span());await page.screenshot({path:`${out}/02-just-open.png`});await page.waitForTimeout(650);spans.push(await span());await page.screenshot({path:`${out}/03-moving-in.png`});await page.waitForTimeout(2300);spans.push(await span());await page.screenshot({path:`${out}/04-notebook.png`});
 if(!(spans[1]>spans[0]*1.05&&spans[2]>spans[1]*1.05))throw Error(`Push-in not progressive: ${spans}`);
 await page.locator('.study-chapters').getByRole('button',{name:'Making',exact:true}).click();await page.locator('[data-spread="making"][data-turning="false"]').waitFor();await page.locator('.study-chapters').getByRole('button',{name:'Start',exact:true}).click();await page.locator('[data-spread="start"][data-turning="false"]').waitFor();await page.waitForTimeout(800);await page.screenshot({path:`${out}/05-enlarged-stamps-visited.png`});
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-loaded="true"]').waitFor({timeout:45000});await page.getByRole('button',{name:'Open notebook',exact:true}).click();await page.locator('[data-ready="true"]').waitFor({timeout:4000});await page.waitForTimeout(200);const reducedSpan=await span();if(Math.abs(reducedSpan-spans[2])>spans[2]*.08)throw Error('Reduced motion did not reach notebook view');
}catch(e){errors.push(e.message);await page.screenshot({path:`${out}/failure.png`});}
await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({spans,errors},null,2));console.log(JSON.stringify({spans,errors}));if(errors.length)process.exitCode=1;
