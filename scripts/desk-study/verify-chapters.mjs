import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='output/playwright/unified-chapters';await mkdir(out,{recursive:true});
const b=await chromium.launch({channel:'chrome'});const page=await b.newPage({viewport:{width:1600,height:1100}});const errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const chapter=name=>page.locator('.study-chapters').getByRole('button',{name,exact:true});
async function ready(){await page.locator('[data-ready="true"]').waitFor({timeout:45000});}
async function select(name,state=name.toLowerCase()){await chapter(name).click();await page.locator(`[data-spread="${state}"][data-turning="false"]`).waitFor({timeout:15000});await page.waitForTimeout(1900);}
async function shot(name){await page.screenshot({path:`${out}/${name}.png`});}
try{
 await page.goto(`${process.env.NOTEBOOK_URL ?? 'http://127.0.0.1:5201/'}?v=chapters`,{waitUntil:'domcontentloaded'});
 await page.locator('[data-loaded="true"]').waitFor({timeout:45000});await page.getByRole('button',{name:'Open notebook',exact:true}).click();await ready();await page.locator('[data-cat-phase="idle"]').waitFor({timeout:10000});await page.waitForTimeout(1400);await shot('01-start-desk');checks.push('single opening and shared writer desktop');
 await select('Making');await shot('02-making');
 await page.getByRole('button',{name:'Explore the desert',exact:false}).click();await page.waitForTimeout(2100);await shot('03-desert');
 await page.locator('.study-actions').getByRole('button',{name:'Receive airmail',exact:true}).click();await page.locator('[data-desert-state="collected"]').waitFor({timeout:18000});await shot('04-balloon-collected');checks.push('Making desert, approved cat and airmail delivery');
 await page.locator('.study-actions').getByRole('button',{name:'Process notes →',exact:true}).click();await page.locator('[data-spread="making-notes"][data-turning="false"]').waitFor({timeout:10000});await page.waitForTimeout(1500);await shot('05-process-notes');checks.push('Making continuation with a layout overview and actual comparison screenshots');
 await select('Projects');await shot('06-projects');checks.push('Projects PawPal collage and reserved next project');
 await select('Contact');await shot('07-contact');
 if(await page.getByRole('link',{name:'Email Fiona',exact:true}).getAttribute('href')!=='mailto:fionabfeng@gmail.com')throw Error('Email mismatch');
 if(await page.getByRole('link',{name:'Open résumé PDF',exact:true}).count())throw Error('Placeholder résumé offered as final PDF');
 if(await page.locator('a[href^="#TODO"]').count())throw Error('Fake placeholder link rendered');
 await page.getByRole('button',{name:'Read the pages',exact:true}).click();await page.waitForTimeout(1800);await shot('08-contact-read');
 await page.getByRole('button',{name:'Collect station postmark',exact:true}).click();await page.locator('[data-post-state="sent"]').waitFor({timeout:13000});await shot('09-posted');checks.push('Contact station on left, right-page contact links and postmark');
 await select('Start');await select('Making');if(await page.locator('main').getAttribute('data-desert-state')!=='collected')throw Error('Balloon progress lost on tab change');
 await select('Contact');if(await page.locator('main').getAttribute('data-post-state')!=='sent')throw Error('Postmark lost on tab change');
 if(await page.locator('main').getAttribute('data-opening')!=='open')throw Error('Opening restarted during navigation');checks.push('chapter jumps, reverse turns and shared progress without reopening');
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1700);await shot('10-mobile-contact');
 await page.getByRole('button',{name:'Read the pages',exact:true}).click();await page.waitForTimeout(1800);await shot('11-mobile-contact-read');
 const box=await page.getByRole('link',{name:'Email Fiona',exact:true}).boundingBox();if(!box||box.x+box.width/2<0||box.x+box.width/2>390)throw Error('Contact target outside right reading page');
 await select('Making');await shot('12-mobile-making');
 await page.getByRole('button',{name:'Read the pages',exact:true}).click();await page.waitForTimeout(1800);await shot('13-mobile-making-read');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');checks.push('mobile right-page reading, projected links and no overflow');
 await page.emulateMedia({reducedMotion:'reduce'});await select('Projects');await select('Start');await chapter('Contact').focus();await page.keyboard.press('Enter');await page.locator('[data-spread="contact"][data-turning="false"]').waitFor({timeout:6000});
 await page.keyboard.press('Escape');checks.push('keyboard and reduced-motion tab navigation');
}catch(e){errors.push(e.message);await shot('failure');}
await b.close();await writeFile(`${out}/verification.json`,JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors}));if(errors.length)process.exitCode=1;
