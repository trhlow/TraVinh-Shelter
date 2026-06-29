const { chromium } = require('playwright');
const CHROME = 'C:/Users/Hlow/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const OUT = 'C:/Users/Hlow/AppData/Local/Temp/claude/d--TraVinh-Shelter/b51159eb-4cc9-46b7-a731-28c6cce82c07/scratchpad';
const pages = [['#/brokers','brokers'],['#/projects','projects']];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  for (const [w,tag] of [[1280,'desktop'],[375,'mobile']]) {
    const p = await b.newPage();
    await p.setViewportSize({ width: w, height: 1000 });
    for (const [hash,name] of pages) {
      await p.goto('http://localhost:5173/'+hash);
      await p.waitForLoadState('networkidle');
      await p.waitForTimeout(600);
      await p.screenshot({ path: OUT + '/t7-' + name + '-' + tag + '.png', fullPage: (tag==='desktop') });
    }
    await p.close();
  }
  await b.close(); console.log('t7 shots done');
})().catch(e => { console.error(e.message); process.exit(1); });
