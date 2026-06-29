const { chromium } = require('playwright');
const CHROME = 'C:\\\\Users\\\\Hlow\\\\AppData\\\\Local\\\\ms-playwright\\\\chromium-1228\\\\chrome-win64\\\\chrome.exe';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  const pages = [
    ['http://localhost:5173/#/', 'screenshot-home.png'],
    ['http://localhost:5173/#/search', 'screenshot-search.png'],
    ['http://localhost:5173/#/login', 'screenshot-login.png'],
    ['http://localhost:5173/#/brokers', 'screenshot-brokers.png'],
  ];
  for (const [url, file] of pages) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: file, fullPage: true });
    console.log('done:', file);
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
