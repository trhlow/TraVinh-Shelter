const { chromium } = require('playwright');
const CHROME = 'C:/Users/Hlow/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const OUT = 'C:/Users/Hlow/AppData/Local/Temp/claude/d--TraVinh-Shelter/b51159eb-4cc9-46b7-a731-28c6cce82c07/scratchpad/baseline';
const pages = [['#/','home'],['#/property/1','property-detail'],['#/projects','projects'],['#/brokers','brokers']];
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  for (const [w, tag] of [[1280,'desktop'],[375,'mobile']]) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: w, height: 900 });
    for (const [hash, name] of pages) {
      await page.goto('http://localhost:5173/' + hash);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(400);
      await page.screenshot({ path: OUT + '/' + name + '-' + tag + '.png', fullPage: true });
    }
    await page.close();
  }
  await browser.close();
  console.log('baseline captured');
})().catch(e => { console.error(e.message); process.exit(1); });
