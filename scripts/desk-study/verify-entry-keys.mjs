import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {startNotebookCheck,openNotebook,selectChapter} from './notebook-browser.mjs';

const out='output/playwright/entry-keys';
const checks=[],errors=[];
for(const reducedMotion of ['no-preference','reduce']){
  const {browser,page,errors:captured}=await startNotebookCheck(out,{viewport:{width:1200,height:900},reducedMotion});
  try{
    await openNotebook(page,`entry-keys-${reducedMotion}`);
    await page.locator('[data-cat-phase="idle"]').waitFor({timeout:15000});
    await page.waitForTimeout(reducedMotion==='reduce'?200:3000);
    assert.equal(await page.locator('main').getAttribute('data-opening'),'open');
    await page.screenshot({path:`${out}/${reducedMotion}-opened.png`});
    for(const chapter of ['Projects','Start'])await selectChapter(page,chapter);
    assert.equal(await page.locator('main').getAttribute('data-opening'),'open');
    checks.push(`${reducedMotion}: opening and chapter return complete`);
  }catch(error){
    errors.push(error.message);
  }finally{
    errors.push(...captured);
    await browser.close();
  }
}
const duplicateKeys=errors.filter(error=>error.includes('Encountered two children with the same key'));
await writeFile(`${out}/verification.json`,JSON.stringify({checks,duplicateKeyCount:duplicateKeys.length,errors},null,2)+'\n');
console.log(JSON.stringify({checks,duplicateKeyCount:duplicateKeys.length,errorCount:errors.length}));
if(errors.length)process.exitCode=1;
