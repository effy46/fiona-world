import {chromium} from 'playwright';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/control-layout';await mkdir(out,{recursive:true});const b=await chromium.launch({channel:'chrome'});const p=await b.newPage({viewport:{width:1200,height:850},reducedMotion:'reduce'});const checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
async function inspect(label){
 const layout=await p.locator('.study-controls').evaluate(el=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,label:e.textContent.trim()}};return {tabs:rect(el.querySelector('.study-chapters')),actions:[...el.querySelectorAll('.study-actions>button')].map(rect),width:innerWidth};});
 for(const button of layout.actions)assert(button.x>=0&&button.x+button.w<=layout.width+.5,`${label}: clipped ${button.label}`);
 if(label.startsWith('making-')&&layout.width>420)assert(Math.max(...layout.actions.map(b=>b.y+b.h/2))-Math.min(...layout.actions.map(b=>b.y+b.h/2))<2,`${label}: actions wrap or misalign`);
 if(label.startsWith('making-')&&layout.width<=420){assert(Math.abs(layout.actions[0].y-layout.actions[1].y)<2);assert(layout.actions[2].y>=layout.actions[0].y+layout.actions[0].h);assert(layout.actions[2].w>layout.width-38);}
 if(layout.width>1050)assert(Math.abs(layout.tabs.y+layout.tabs.h/2-layout.actions[0].y-layout.actions[0].h/2)<2,`${label}: desktop groups misalign`);
 else assert(layout.actions[0].y>=layout.tabs.y+layout.tabs.h,`${label}: groups overlap`);
 assert(!(await p.getByRole('button',{name:'Turn back',exact:false}).count()));await p.screenshot({path:`${out}/${label}.png`});checks.push(label);
}
try{
 await p.goto('http://127.0.0.1:5201/?v=control-layout');await p.locator('[data-loaded="true"]').waitFor({timeout:45000});await p.getByRole('button',{name:'Open notebook',exact:true}).click();await p.locator('[data-ready="true"]').waitFor({timeout:20000});await p.locator('.study-chapters').getByRole('button',{name:'Making',exact:true}).click();await p.locator('[data-spread="making"][data-turning="false"]').waitFor({timeout:15000});await p.getByRole('button',{name:'Walk with desert cat',exact:true}).waitFor();
 for(const [width,height] of [[1200,850],[975,700],[760,700],[450,800],[390,844],[320,800]]){await p.setViewportSize({width,height});await p.waitForTimeout(250);await inspect(`making-${width}`);}
 await p.setViewportSize({width:390,height:844});await p.getByRole('button',{name:'Process notes →',exact:true}).click();await p.locator('[data-spread="making-notes"][data-turning="false"]').waitFor();await p.getByRole('button',{name:'← Making',exact:true}).click();await p.locator('[data-spread="making"][data-turning="false"]').waitFor();
 await p.getByRole('button',{name:'Read the pages',exact:true}).click();await p.getByRole('button',{name:'Read left page',exact:true}).click();await inspect('reading-390');await p.keyboard.press('Escape');await p.getByRole('button',{name:'Explore the desert',exact:false}).click();await inspect('explore-390');await p.keyboard.press('Escape');
 await p.locator('.study-chapters').getByRole('button',{name:'Contact',exact:true}).click();await p.locator('[data-spread="contact"][data-turning="false"]').waitFor();await inspect('contact-390');
 await p.locator('.study-chapters').getByRole('button',{name:'Start',exact:true}).click();await p.locator('[data-spread="start"][data-turning="false"]').waitFor();checks.push('existing notes/read/explore actions and Start return remain functional');
}catch(e){errors.push(e.message);await p.screenshot({path:`${out}/failure.png`});}
await b.close();await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));if(errors.length)process.exitCode=1;
