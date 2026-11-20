import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/train-steam';await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});const errors=[],checks=[];
for(const reducedMotion of ['no-preference','reduce']){
 const p=await browser.newPage({viewport:{width:1200,height:900},reducedMotion});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await p.goto('http://127.0.0.1:5201/?v=train-steam');await p.locator('[data-loaded="true"]').waitFor({timeout:45000});await p.getByRole('button',{name:'Open notebook',exact:true}).click();await p.locator('[data-ready="true"]').waitFor({timeout:20000});
  await p.locator('.study-chapters').getByRole('button',{name:'Contact',exact:true}).click();await p.locator('[data-spread="contact"][data-turning="false"]').waitFor({timeout:15000});await p.getByRole('button',{name:'Explore the station',exact:false}).click();await p.waitForTimeout(2400);
  const clip={x:255,y:215,width:200,height:230};const a=await p.screenshot({path:`${out}/${reducedMotion}-a.png`,clip});await p.waitForTimeout(1800);const b=await p.screenshot({path:`${out}/${reducedMotion}-b.png`,clip});assert.equal(a.equals(b),reducedMotion==='reduce');await p.screenshot({path:`${out}/${reducedMotion}-full.png`});checks.push(`${reducedMotion}: ${a.equals(b)?'static steam':'steam rises and changes shape'}`);
  await p.locator('.study-chapters').getByRole('button',{name:'Projects',exact:true}).click();await p.locator('[data-spread="projects"][data-turning="false"]').waitFor({timeout:15000});checks.push(`${reducedMotion}: leaving station cleanly`);
 }catch(e){errors.push(e.message);await p.screenshot({path:`${out}/${reducedMotion}-failure.png`});}await p.close();
}
await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));if(errors.length)process.exitCode=1;
