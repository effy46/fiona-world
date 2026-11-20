import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {cameraFromHtml} from './camera-from-html.mjs';
import {NOTEBOOK_SCALE} from '../../src/notebook/desk-study/layout.ts';
import {sandHeight} from '../../src/notebook/scenes/desertTerrain.ts';

const out='output/playwright/airmail';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1400,height:1000}});
const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
  window.airmailImpressions=0;
  const draw=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(...args){if(args[0]==='AIRMAIL RECEIVED')window.airmailImpressions++;return draw.apply(this,args);};
});
const hint=page.locator('.study-airmail-hint');
async function chapter(name){
  await page.locator('.study-chapters').getByRole('button',{name,exact:true}).click();
  await page.locator(`[data-spread="${name.toLowerCase()}"][data-turning="false"]`).waitFor({timeout:15000});
}
async function open(){
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(`${process.env.NOTEBOOK_URL ?? 'http://127.0.0.1:5201/'}?v=airmail`);
  await page.locator('[data-loaded="true"]').waitFor({timeout:45000});
  await page.getByRole('button',{name:'Open notebook',exact:true}).click();
  await page.locator('[data-ready="true"]').waitFor({timeout:20000});
  await chapter('Making');await page.waitForTimeout(300);
}
async function phase(name){await page.locator(`.study-airmail-hint[data-airmail-phase="${name}"]`).waitFor({state:'attached',timeout:12000});}
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});}
async function clickScene(x,z,y=sandHeight(x,z)){
  const camera=await cameraFromHtml(page,1400,1000);
  const point=new THREE.Vector3(-1.6+.46*x,.415+.46*(.08+y),-.25+.46*z).multiplyScalar(NOTEBOOK_SCALE).project(camera);
  await page.mouse.click((point.x+1)*700,(1-point.y)*500);
}
try{
  await open();await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'Explore the desert',exact:false}).click();await page.waitForTimeout(2400);
  await shot('01-ready');await clickScene(-.75,1.3,1.5);await page.waitForTimeout(250);
  assert.equal(await page.locator('main').getAttribute('data-desert-state'),'ready');
  await hint.click();await phase('approaching');await clickScene(1.95,2.55);await page.waitForTimeout(200);
  assert.equal(await page.locator('main').getAttribute('data-desert-state'),'ready');
  checks.push('camper no longer starts delivery; ground click cancels approach');
  await hint.click();await phase('approaching');
  await chapter('Projects');await page.waitForTimeout(700);
  assert.equal(await page.locator('main').getAttribute('data-desert-state'),'ready');
  assert.equal(await page.evaluate(()=>window.airmailImpressions),0);
  await chapter('Making');await page.waitForTimeout(1200);await hint.waitFor();
  checks.push('page turn cancels unfinished delivery without collecting');
  await page.getByRole('button',{name:'Explore the desert',exact:false}).click();await page.waitForTimeout(2000);
  await hint.click();await phase('receiving');await chapter('Projects');await page.waitForTimeout(700);
  assert.equal(await page.locator('main').getAttribute('data-desert-state'),'ready');
  assert.equal(await page.evaluate(()=>window.airmailImpressions),0);
  await chapter('Making');await page.waitForTimeout(1200);
  await page.getByRole('button',{name:'Explore the desert',exact:false}).click();await page.waitForTimeout(2000);
  checks.push('turning away during handover discards the unfinished letter and stamp');
  await page.evaluate(()=>{
    window.airmailPhases=[];
    new MutationObserver(records=>{for(const r of records)if(r.attributeName==='data-airmail-phase'){
      const phase=r.target.dataset.airmailPhase;
      if(window.airmailPhases.at(-1)!==phase)window.airmailPhases.push(phase);
    }}).observe(document.querySelector('.study-airmail-hint'),{attributes:true});
  });
  await hint.click();await phase('inspecting');await shot('02-inspect');
  assert.equal(await page.locator('main').getAttribute('data-desert-state'),'rising');
  assert.equal(await page.getByRole('button',{name:'Walk with desert cat',exact:true}).count(),0);
  await phase('receiving');await page.waitForTimeout(350);await shot('03-receive');await phase('postmark');await page.waitForTimeout(500);await shot('04-letter-postmark');
  assert.notEqual(await page.locator('main').getAttribute('data-desert-state'),'collected');
  assert.equal(await page.evaluate(()=>window.airmailImpressions),0,'Page stamp appeared before delivery completed');
  await page.locator('[data-desert-state="collected"]').waitFor({timeout:10000});await shot('05-airmail-received');
  assert.equal(await page.evaluate(()=>window.airmailImpressions),2,'Both page textures must receive exactly one impression');
  const phases=await page.evaluate(()=>window.airmailPhases);
  for(const name of ['approaching','inspecting','receiving','postmark','departing','holding','collected'])assert(phases.includes(name),`Missing delivery phase: ${name}`);
  checks.push('balloon approach, inspection, handover, postmark reveal, departure and final collection');
  await chapter('Start');await chapter('Making');
  assert.equal(await page.locator('main').getAttribute('data-desert-state'),'collected');
  assert(await hint.isDisabled());checks.push('collected postmark survives chapter changes and cannot repeat');
  assert.equal(await page.evaluate(()=>window.airmailImpressions),2);
  await page.emulateMedia({reducedMotion:'reduce'});
  const actor=page.getByRole('button',{name:'Walk with desert cat',exact:true});await actor.focus();await page.keyboard.press('Enter');
  await page.locator('[aria-label="Walk with desert cat"][data-moving="false"]').waitFor({timeout:5000});
  assert.equal(await page.locator('main').getAttribute('data-desert-state'),'collected');checks.push('cat is free to walk after receiving the letter');
  await open();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);await shot('06-mobile-ready');
  await page.locator('.study-airmail-hint').focus();await page.keyboard.press('Enter');
  await page.locator('[data-desert-state="collected"]').waitFor({timeout:5000});await shot('07-mobile-reduced-received');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  checks.push('keyboard activation, mobile layout and reduced-motion completion');
}catch(e){errors.push(e.stack);await shot('failure');}
await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2));
console.log(JSON.stringify({checks,errors}));if(errors.length)process.exitCode=1;
