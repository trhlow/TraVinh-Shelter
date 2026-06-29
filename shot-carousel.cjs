const { chromium } = require('playwright');
const CHROME = 'C:/Users/Hlow/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const OUT = 'C:/Users/Hlow/AppData/Local/Temp/claude/d--TraVinh-Shelter/b51159eb-4cc9-46b7-a731-28c6cce82c07/scratchpad';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  for (const [w,tag,h] of [[1280,'desktop',1100],[375,'mobile',1500]]) {
    const p = await b.newPage();
    await p.setViewportSize({ width: w, height: h });
    await p.goto('http://localhost:5173/#/');
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(600);
    // scroll to the featured section
    const sec = await p.$('text=Tin nổi bật');
    if (sec) await sec.scrollIntoViewIfNeeded();
    await p.waitForTimeout(300);
    await p.screenshot({ path: OUT + '/t4-carousel-' + tag + '.png' });
    await p.close();
  }
  await b.close(); console.log('carousel shots done');
})().catch(e => { console.error(e.message); process.exit(1); });
