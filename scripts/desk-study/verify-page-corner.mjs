import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/page-corner';await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});const errors=[],checks=[];
for(const [width,reducedMotion] of [[1000,'no-preference'],[450,'reduce']]){
 const page=await browser.newPage({viewport:{width,height:850},reducedMotion});page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:5201/?v=page-corner');await page.locator('[data-loaded="true"]').waitFor({timeout:45000});await page.getByRole('button',{name:'Open notebook',exact:true}).click();await page.locator('[data-ready="true"]').waitFor({timeout:20000});await page.waitForTimeout(reducedMotion==='reduce'?500:3500);
  const next=page.getByRole('button',{name:'Next page',exact:true});await next.hover();await page.screenshot({path:`${out}/${width}-hover.png`});
  for(const spread of ['making','making-notes','projects','contact']){
   if(spread==='making-notes'){await next.focus();await page.keyboard.press('Enter');}else await next.click();
   await page.locator(`[data-spread="${spread}"][data-turning="false"]`).waitFor({timeout:15000});await page.waitForTimeout(250);
   assert.equal(await page.locator('main').getAttribute('data-spread'),spread);
  }
  assert.equal(await next.count(),0);await page.screenshot({path:`${out}/${width}-last.png`});checks.push(`${width}px: every next spread, keyboard activation, no wrap after Contact`);
 }catch(e){errors.push(e.message);await page.screenshot({path:`${out}/${width}-failure.png`});}
 await page.close();
}
await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));if(errors.length)process.exitCode=1;
