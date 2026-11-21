import {chromium} from 'playwright';
import * as THREE from 'three';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/chair-cat';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:1000}});
const errors=[],checks=[];
page.on('pageerror',error=>errors.push(error.message));
const chair=()=>page.getByRole('button',{name:'Rest by the fire',exact:true});
const actor=()=>page.locator('[aria-label="Walk with the cat"].study-cat-target');
const phase=name=>page.locator(`[data-cat-phase="${name}"]`).waitFor({timeout:15000});
const shot=name=>page.screenshot({path:`${out}/${name}.png`});
async function ground(){
  const camera=new THREE.PerspectiveCamera(37,1.6,.1,200);
  const target=new THREE.Vector3(.2,.35,-.6).multiplyScalar(1.06);
  camera.position.copy(target).add(new THREE.Vector3(0,5.9,8).normalize().multiplyScalar(8.9*1.06));
  camera.lookAt(target);camera.updateMatrixWorld();
  const point=new THREE.Vector3(.76,.465,.37).multiplyScalar(1.06).project(camera);
  await page.mouse.click((point.x+1)*800,(1-point.y)*500);
}
async function chapter(name){
  await page.locator('.study-chapters').getByRole('button',{name,exact:true}).click();
  await page.locator(`[data-spread="${name.toLowerCase()}"][data-turning="false"]`).waitFor({timeout:15000});
  await page.waitForTimeout(1800);
}
try{
  await page.goto('http://127.0.0.1:5201/?chair-check');
  await page.locator('[data-loaded="true"]').waitFor({timeout:45000});
  await page.getByRole('button',{name:'Open notebook',exact:true}).click();
  await page.locator('[data-ready="true"]').waitFor({timeout:20000});await page.waitForTimeout(3000);
  await chair().click();await phase('jump');await shot('01-jump');await phase('sit');
  assert.equal(await actor().getAttribute('data-pose'),'sit');
  // Enlarged chair's seat anchor; rejects the stale, unscaled .668 sitting target.
  assert(Math.abs(Number(await actor().getAttribute('data-y'))-.7353)<.002,'Cat is not anchored to the enlarged seat');
  await shot('02-sitting');
  await chair().click();await phase('sleep');await shot('03-sleeping');
  checks.push('real chair clicks approach, hop, sit and sleep without cat-target interception');
  await chair().focus();await page.keyboard.press('Enter');await phase('sit');
  await page.keyboard.press('Space');await phase('sleep');checks.push('Enter and Space toggle seated/sleeping poses');
  await ground();await phase('jump');await phase('idle');
  assert.equal(await actor().getAttribute('data-pose'),'ground');checks.push('ground click wakes, dismounts and walks');
  await chair().click();await phase('walk');await ground();await phase('idle');await page.waitForTimeout(900);
  assert.equal(await page.locator('main').getAttribute('data-cat-phase'),'idle');checks.push('ground redirects the chair approach without a late hop');
  await chair().click();await phase('jump');await page.emulateMedia({reducedMotion:'reduce'});await phase('sit');
  await chair().click();await phase('sleep');await ground();await phase('idle');
  await chair().click();await phase('sit');checks.push('reduced motion during hop and at rest, including immediate mount/dismount');
  await chapter('Projects');assert.equal(await chair().count(),0);await chapter('Start');await phase('idle');
  assert.equal(await actor().getAttribute('data-pose'),'ground');checks.push('chapter changes reset chair state and remove hidden controls');
  await chair().click();await phase('sit');await page.mouse.move(1000,600);await page.mouse.wheel(0,-600);await page.waitForTimeout(1600);await shot('04-sitting-close');
  await chair().click();await phase('sleep');await shot('05-sleeping-close');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1800);await chair().click();await phase('sit');await shot('06-mobile');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checks.push('zoomed and mobile chair controls remain usable');
}catch(error){errors.push(error.stack??error.message);await shot('failure');}
await browser.close();await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2));
console.log(JSON.stringify({checks,errors}));if(errors.length)process.exitCode=1;
