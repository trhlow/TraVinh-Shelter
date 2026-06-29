const { chromium } = require('playwright');
const CHROME = 'C:/Users/Hlow/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const OUT = 'C:/Users/Hlow/AppData/Local/Temp/claude/d--TraVinh-Shelter/b51159eb-4cc9-46b7-a731-28c6cce82c07/scratchpad';
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  // desktop: clip the featured carousel element
  for (const [w,tag] of [[1280,'desktop'],[375,'mobile']]) {
    const p = await b.newPage();
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto('http://localhost:5173/#/');
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(600);
    const el = await p.$('[aria-label="Tin nổi bật"]') || await p.$('.featured-carousel');
    if (el) { await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await el.screenshot({ path: OUT + '/t4-banner-' + tag + '.png' }); console.log(tag, 'carousel captured'); }
    else { console.log(tag, 'CAROUSEL ELEMENT NOT FOUND'); }
    await p.close();
  }
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
