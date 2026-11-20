import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/start-ink';await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:900,height:800},deviceScaleFactor:2});const errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
try{
 await p.goto('http://127.0.0.1:5201/?v=live-ink');await p.locator('[data-loaded="true"]').waitFor({timeout:45000});await p.waitForTimeout(1200);const clasp=p.getByRole('button',{name:'Open notebook',exact:true});if(await clasp.getAttribute('title'))throw Error('Native clasp tooltip remains');if(!await p.locator('.study-clasp-hint').isVisible())throw Error('Click hint hidden at rest');await p.screenshot({path:`${out}/00-closed.png`});await clasp.click();await p.locator('[data-ready="true"]').waitFor({timeout:15000});await p.waitForTimeout(3500);await p.screenshot({path:`${out}/01-open.png`});
 for(const name of ['Projects','Start']){await p.locator('.study-chapters').getByRole('button',{name,exact:true}).click();await p.locator(`[data-spread="${name.toLowerCase()}"][data-turning="false"]`).waitFor({timeout:10000});}
 await p.waitForTimeout(1200);await p.screenshot({path:`${out}/02-visited.png`});await p.getByRole('button',{name:'Read the pages',exact:true}).click();await p.waitForTimeout(1700);await p.screenshot({path:`${out}/03-read.png`});await p.keyboard.press('Escape');
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'Read the pages',exact:true}).click();await p.waitForTimeout(2000);await p.screenshot({path:`${out}/04-mobile-left.png`});await p.getByRole('button',{name:'Read right page',exact:true}).click();await p.waitForTimeout(1700);await p.screenshot({path:`${out}/05-mobile-right.png`});
}catch(e){errors.push(e.message);await p.screenshot({path:`${out}/failure.png`});}
await b.close();await writeFile(`${out}/verification.json`,JSON.stringify({errors},null,2));console.log(JSON.stringify({errors}));if(errors.length)process.exitCode=1;
