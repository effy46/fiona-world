import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';

export async function startNotebookCheck(out,options){
  await mkdir(out,{recursive:true});
  const browser=await chromium.launch({channel:'chrome'});
  const page=await browser.newPage(options);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  return {browser,page,errors};
}

export async function openNotebook(page,variant){
  const url=new URL(process.env.NOTEBOOK_URL ?? 'http://127.0.0.1:5201/');
  url.searchParams.set('v',variant);
  await page.goto(url.href,{waitUntil:'domcontentloaded'});
  await page.locator('[data-loaded="true"]').waitFor({timeout:45000});
  await page.getByRole('button',{name:'Open notebook',exact:true}).click();
  await page.locator('[data-ready="true"]').waitFor({timeout:45000});
}

export async function selectChapter(page,name,state=name.toLowerCase()){
  await page.locator('.study-chapters').getByRole('button',{name,exact:true}).click();
  await page.locator(`[data-spread="${state}"][data-turning="false"]`).waitFor({timeout:15000});
}
