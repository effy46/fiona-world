import {startNotebookCheck,openNotebook,selectChapter} from './notebook-browser.mjs';import * as THREE from 'three';import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {sandHeight} from '../../src/notebook/scenes/desertTerrain.ts';
import {NOTEBOOK_SCALE} from '../../src/notebook/desk-study/layout.ts';import {planTravelRoute,travelWalkable} from '../../src/notebook/scenes/travelNavigation.ts';
const out='output/playwright/travel-walk';const checks=[];
for(const [scene,home,goals] of [['desert',[1.7,2.18],[[1.9,1.1],[.8,2.45],[-2.4,2.8],[-.75,1.3],[1.27,.05]]],['station',[.45,-.18],[[.1,1.1],[1.46,-.28],[-2.4,1.1],[-1.8,.4],[2.1,-.5]]]]){
 for(const goal of goals){const route=planTravelRoute(scene,home,goal);assert(route.length>1,`${scene}: no route ${goal}`);for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.02)assert(travelWalkable(scene,[route[i-1][0]+(route[i][0]-route[i-1][0])*t,route[i-1][1]+(route[i][1]-route[i-1][1])*t]),`${scene} crosses solid ground`);}
}checks.push('both scene routes avoid scenery and rails, blocked goals resolve to reachable ground');
const {browser:b,page:p,errors}=await startNotebookCheck(out,{viewport:{width:1200,height:900}});
async function chapter(name){await selectChapter(p,name);await p.waitForTimeout(1100);await p.getByRole('button',{name:`Explore the ${name==='Making'?'desert':'station'}`,exact:false}).click();await p.waitForTimeout(2000);}
async function click(scene,x,z){
 // Query the actual sand mesh using the click ray; projected y only needs to be near its surface.
 const y=scene==='station'?.26:sandHeight(x,z);const v=new THREE.Vector3(-1.6+.46*x,.415+.46*(.08+y),-.25+.46*(z-(scene==='station'?.05:0))).multiplyScalar(NOTEBOOK_SCALE);
 const c=new THREE.PerspectiveCamera(37,1200/900,.1,200);c.position.set(-.4,4.3,4.8).multiplyScalar(NOTEBOOK_SCALE);c.lookAt(new THREE.Vector3(-1.65,.65,-.12).multiplyScalar(NOTEBOOK_SCALE));c.updateMatrixWorld();v.project(c);await p.mouse.click((v.x+1)*600,(1-v.y)*450);
}
async function pos(actor){return actor.evaluate(el=>[Number(el.dataset.x),Number(el.dataset.z)]);}
async function idle(actor){await actor.locator('xpath=self::*[@data-moving="false"]').waitFor({timeout:18000});}
try{
 await openNotebook(p,'travel-walk');await p.waitForTimeout(3500);
 for(const [chapterName,scene,label] of [['Making','desert','Walk with desert cat'],['Contact','station','Walk with station cat']].filter(([,scene])=>!process.argv.includes('--station-only')||scene==='station')){
  await chapter(chapterName);const actor=p.getByRole('button',{name:label,exact:true});const before=await pos(actor);
  if(scene==='station')assert(Math.abs(before[0]-.99)>.5,'Initial station cat overlaps the lamp');
  await click(scene,scene==='desert'?.2:.1,scene==='desert'?2.8:1.15);await p.waitForFunction(label=>document.querySelector(`[aria-label="${label}"]`)?.dataset.moving==='true',label,{timeout:5000});await p.waitForTimeout(850);await p.screenshot({path:`${out}/${scene}-walking.png`});
  await click(scene,scene==='desert'?1.9:1.7,scene==='desert'?2.6:.8);await idle(actor);const after=await pos(actor);assert(Math.hypot(after[0]-before[0],after[1]-before[1])>.2,`${scene}: no movement`);assert(travelWalkable(scene,after),`${scene}: unsafe arrival ${after}`);await p.screenshot({path:`${out}/${scene}-arrived.png`});checks.push(`${scene}: ground click, mid-walk redirection, safe arrival`);
  await p.emulateMedia({reducedMotion:'reduce'});await click(scene,.25,scene==='desert'?2.8:1.1);await p.waitForTimeout(300);assert.equal(await actor.getAttribute('data-moving'),'false');checks.push(`${scene}: reduced motion`);await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(180);
  const action=p.locator('.study-actions').getByRole('button',{name:scene==='desert'?'Receive airmail':'Collect postmark',exact:true});
  await click(scene,1.9,scene==='desert'?2.6:.8);await p.waitForFunction(label=>document.querySelector(`[aria-label="${label}"]`)?.dataset.moving==='true',label);await p.emulateMedia({reducedMotion:'reduce'});await idle(actor);await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForTimeout(180);checks.push(`${scene}: reduced motion mid-walk`);
  await click(scene,.25,scene==='desert'?2.8:.6);await p.waitForFunction(label=>document.querySelector(`[aria-label="${label}"]`)?.dataset.moving==='true',label);await action.click();await p.waitForTimeout(150);await click(scene,1.9,scene==='desert'?2.6:.8);
  await p.locator(`[data-${scene==='desert'?'desert':'post'}-state="ready"]`).waitFor({timeout:5000});await idle(actor);checks.push(`${scene}: start action mid-walk, cancel by ground click`);
  if(scene==='station'){
   await action.click();await p.locator('.study-chapters').getByRole('button',{name:'Projects',exact:true}).click();await p.locator('[data-turning="true"]').waitFor();await actor.waitFor({state:'detached',timeout:1000});assert.equal(await actor.count(),0,'Travel cat keyboard target remains during turn');await p.locator('[data-spread="projects"][data-turning="false"]').waitFor({timeout:15000});await p.waitForTimeout(1600);assert.equal(await p.locator('main').getAttribute('data-post-state'),'ready');await chapter('Contact');await click(scene,.25,.7);await idle(actor);checks.push('turn cancels posting walk without late postmark');
  }
  if(scene==='desert'){assert.equal(await p.locator('main').getAttribute('data-desert-state'),'ready');await p.locator('.study-actions').getByRole('button',{name:'Receive airmail',exact:true}).click();await p.locator('[data-desert-state="collected"]').waitFor({timeout:18000});}else{await p.getByRole('button',{name:'Collect postmark',exact:true}).click();await p.locator('[data-post-state="sent"]').waitFor({timeout:18000});}
  await p.screenshot({path:`${out}/${scene}-action.png`});checks.push(`${scene}: original collectible action from relocated cat`);await actor.focus();await p.keyboard.press('Enter');await idle(actor);assert.equal(await p.locator('main').getAttribute(`data-${scene==='desert'?'desert':'post'}-state`),scene==='desert'?'collected':'sent');checks.push(`${scene}: keyboard walk retains collected progress`);
 }
}catch(e){errors.push(e.message);console.log(await p.locator('[data-moving]').evaluateAll(es=>es.map(e=>({label:e.getAttribute('aria-label'),...e.dataset}))));await p.screenshot({path:`${out}/failure.png`});}
await b.close();await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));if(errors.length)process.exitCode=1;
