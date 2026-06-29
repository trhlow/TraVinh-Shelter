const { chromium } = require('playwright');
const CHROME = 'C:/Users/Hlow/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const OUT = 'C:/Users/Hlow/AppData/Local/Temp/claude/d--TraVinh-Shelter/b51159eb-4cc9-46b7-a731-28c6cce82c07/scratchpad';
const SESSION = JSON.stringify({ token:'mock-admin', userId:'admin', email:'admin@congtinland.vn', role:'ADMIN', fullName:'Quản trị viên' });
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  for (const [w,tag,full] of [[1440,'desktop',true],[375,'mobile',false]]) {
    const p = await b.newPage();
    await p.setViewportSize({ width: w, height: 1000 });
    await p.goto('http://localhost:5173/');
    await p.evaluate((s) => localStorage.setItem('travinh-realty-session', s), SESSION);
    await p.goto('http://localhost:5173/#/admin/overview');
    await p.waitForLoadState('networkidle');
    await p.waitForTimeout(900);
    await p.screenshot({ path: OUT + '/t8b-admin-' + tag + '.png', fullPage: full });
    await p.close();
  }
  await b.close(); console.log('admin shots done');
})().catch(e => { console.error(e.message); process.exit(1); });
