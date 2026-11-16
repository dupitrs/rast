// Emulate mobile browser bars changing the visible height without changing page width.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
async function metrics(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return { y: r.top + scrollY, height: r.height, top: s.top };
    };
    const canvas = document.querySelector('.burst__fx');
    return { y: scrollY, hero: rect('.hero'), studio: rect('#studio'), work: rect('#work'),
      services: rect('#services'), card: rect('.svc__card'),
      heroCanvas: rect('#heroCanvas'), burstCanvas: rect('.burst__fx'),
      pixels: [canvas.width, canvas.height],
      orb: document.querySelector('#fxOrb').style.transform,
      questions: [...document.querySelectorAll('.bq')].map(e => [e.style.fontSize, e.style.transform]) };
  });
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const errors = [];
  try {
    for (const profile of [
      { name: 'Android Chrome', width: 390, height: 844,
        ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36' },
      { name: 'Instagram iPhone', width: 393, height: 852,
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 355.0.0.0.0' }
    ]) {
      const page = await browser.newPage({ viewport: { width: profile.width, height: profile.height },
        userAgent: profile.ua, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => history.state?.rastScroll);
      await page.waitForTimeout(1000);
      for (const zone of ['orb', 'burst', 'services']) {
        await page.evaluate(zone => {
          const studio = document.querySelector('#studio'), service = document.querySelector('#services');
          const y = zone === 'orb' ? studio.offsetTop * .65 : zone === 'burst' ?
            studio.offsetTop + (studio.offsetHeight - innerHeight) * .92 : service.offsetTop + 650;
          scrollTo({ top: y, behavior: 'instant' });
        }, zone);
        await page.waitForTimeout(zone === 'burst' ? 2600 : 1300);
        const before = await metrics(page);
        for (const height of [profile.height - 100, profile.height, profile.height - 70]) {
          await page.setViewportSize({ width: profile.width, height });
          await page.waitForTimeout(700);
          const after = await metrics(page);
          for (const key of ['hero', 'studio', 'services', 'work', 'card', 'heroCanvas', 'burstCanvas']) {
            assert(Math.abs(before[key].height - after[key].height) < 1, `${profile.name} ${zone} ${key} height`);
            assert(Math.abs(before[key].y - after[key].y) < 2, `${profile.name} ${zone} ${key} position`);
            assert.equal(after[key].top, before[key].top, `${profile.name} ${zone} ${key} sticky offset`);
          }
          assert(Math.abs(before.y - after.y) < 2, `${profile.name} ${zone} scroll position`);
          assert.deepEqual(after.pixels, before.pixels, 'Toolbar must not clear and resize burst canvas');
          if (zone === 'orb') assert.equal(after.orb, before.orb, 'Toolbar must not move the orb');
          if (zone === 'burst') assert.deepEqual(after.questions, before.questions, 'Toolbar must not rearrange questions');
        }
      }
      await page.evaluate(() => scrollTo({ top: document.querySelector('#services').offsetTop - 300, behavior: 'instant' }));
      await page.waitForTimeout(400);
      assert.equal(await page.locator('.burst__fx').evaluate(e => getComputedStyle(e).visibility), 'hidden', 'Phone walls fully leave before services');
      assert.equal(await page.locator('.burst__fx').evaluate(e => {
        const { data } = e.getContext('2d').getImageData(0, 0, e.width, e.height);
        for (let i = 3; i < data.length; i += 4) if (data[i]) return false;
        return true;
      }), true, 'No remaining flame pixels');
      await page.evaluate(() => scrollTo({ top: document.querySelector('#studio').offsetTop + 900, behavior: 'instant' }));
      await page.waitForTimeout(400);
      assert.equal(await page.locator('.burst__fx').evaluate(e => getComputedStyle(e).visibility), 'visible', 'Scrolling back restores the burst');
      await page.setViewportSize({ width: profile.height, height: profile.width });
      await page.waitForTimeout(800);
      assert(Math.abs(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--svh1')) * 100) - profile.width) < 1, 'Orientation refreshes viewport height');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow after rotation');
      await page.evaluate(() => scrollTo({ top: document.querySelector('#services').offsetTop - 150, behavior: 'instant' }));
      await page.waitForTimeout(300);
      assert.equal(await page.locator('.burst__fx').evaluate(e => getComputedStyle(e).visibility), 'hidden', 'Phone landscape also clears the walls');
      console.log('PASS', profile.name, 'toolbar heights, orb, cloud, card offsets, flame exit, rewind and rotation');
      await page.close();
    }
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktop.goto(base, { waitUntil: 'networkidle' });
    await desktop.evaluate(() => scrollTo({ top: document.querySelector('#services').offsetTop + 300, behavior: 'instant' }));
    await desktop.waitForTimeout(400);
    assert.equal(await desktop.locator('.burst__fx').evaluate(e => getComputedStyle(e).visibility), 'visible', 'Desktop keeps the existing side walls');
    await desktop.setViewportSize({ width: 1440, height: 800 });
    await desktop.waitForTimeout(500);
    assert.equal(await desktop.locator('#heroCanvas').evaluate(e => e.clientHeight), 800, 'Desktop viewport remains responsive');
    assert.deepEqual(errors, []);
    console.log('PASS desktop walls and resizing');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
