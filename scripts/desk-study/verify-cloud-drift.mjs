import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/cloud-drift';await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome'});const errors=[],checks=[];
for(const reducedMotion of ['no-preference','reduce']){
 const p=await browser.newPage({viewport:{width:1000,height:850},reducedMotion});p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto('http://127.0.0.1:5201/?v=cloud-drift');await p.locator('[data-loaded="true"]').waitFor({timeout:45000});await p.getByRole('button',{name:'Open notebook',exact:true}).click();await p.locator('[data-ready="true"]').waitFor({timeout:20000});await p.waitForTimeout(3600);
  const clip={x:535,y:185,width:250,height:120};const a=await p.screenshot({path:`${out}/${reducedMotion}-a.png`,clip});await p.waitForTimeout(5000);const b=await p.screenshot({path:`${out}/${reducedMotion}-b.png`,clip});
  assert.equal(a.equals(b),reducedMotion==='reduce',`${reducedMotion}: unexpected cloud motion`);checks.push(`${reducedMotion}: ${a.equals(b)?'clouds remain still':'clouds visibly drift'}`);await p.screenshot({path:`${out}/${reducedMotion}-full.png`});
 }catch(e){errors.push(e.message);}
 await p.close();
}
await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));if(errors.length)process.exitCode=1;
