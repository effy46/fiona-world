// Visual regression views for shadow moiré: inspect paper grain and broad cast shadows separately.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/camp-views';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});const errors=[];
for(const [width,height,dpr] of [[900,850,1],[450,800,2]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await page.goto('http://127.0.0.1:5201/?v=camp-shadow');await page.locator('[data-loaded="true"]').waitFor({timeout:45000});
 await page.getByRole('button',{name:'Open notebook',exact:true}).click();await page.locator('[data-ready="true"]').waitFor({timeout:20000});await page.waitForTimeout(3500);
 await page.mouse.move(width*.69,height*.47);await page.mouse.wheel(0,-250);await page.waitForTimeout(1800);
 await page.screenshot({path:`${out}/${width}-front.png`});
 for(const [name,dx,dy] of [['orbit',90,80],['lower',-130,-95]]){
  const x=width*.66,y=height*.47;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:16});await page.mouse.up();await page.waitForTimeout(1200);
  await page.screenshot({path:`${out}/${width}-${name}.png`});
 }
 await page.keyboard.press('0');await page.waitForTimeout(1800);await page.screenshot({path:`${out}/${width}-returned.png`});
 await page.close();
}
await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({errors,viewports:[[900,850,1],[450,800,2]],states:['front','orbit','lower','returned']},null,2));
console.log(JSON.stringify({errors}));if(errors.length)process.exitCode=1;
