// Regression: the enlarged first video frame must retain the whole sphere before CSS translation.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    for (const size of [{ width: 1440, height: 900 }, { width: 1920, height: 1040 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: size });
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => history.state?.rastScroll && document.querySelector('#heroCanvas').width > 0);
      await page.waitForTimeout(500);
      if (!(await page.locator('#fxSeq').count())) {
        await page.evaluate(() => scrollTo({ top: document.getElementById('work').offsetTop, behavior: 'instant' }));
        await page.waitForTimeout(350);
        assert.equal(await page.locator('#heroCanvas').evaluate(el => getComputedStyle(el).opacity), '0', 'Particle intro is hidden beyond the intro');
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await page.waitForTimeout(350);
        assert(Number(await page.locator('#heroCanvas').evaluate(el => getComputedStyle(el).opacity)) > 0, 'Particle intro returns at the top');
        console.log('PASS particle intro visibility', size.width, size.height);
        await page.close();
        continue;
      }
      let found = false;
      for (let y = Math.round(size.height * 0.3); y < size.height; y += 4) {
        await page.evaluate(y => scrollTo(0, y), y);
        await page.waitForTimeout(25);
        found = await page.locator('#fxSeq').evaluate(el => Number(el.style.opacity) === 1);
        if (found) break;
      }
      assert(found, 'The intro frame sequence became visible');
      const bounds = await page.locator('#fxSeq').evaluate(el => {
        const { data, width, height } = el.getContext('2d').getImageData(0, 0, el.width, el.height);
        let top = height, bottom = -1;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (data[i] > 40 && data[i + 3] > 128) { top = Math.min(top, y); bottom = y; break; }
          }
        }
        return { top, bottom, height, scroll: scrollY };
      });
      await page.screenshot({ path: '/tmp/rast-intro-handoff-' + size.width + '.png' });
      assert(bounds.top > 4, 'Sphere must not be cut off at the canvas top: ' + JSON.stringify(bounds));
      assert(bounds.bottom < bounds.height - 4, 'Sphere must not be cut off at the canvas bottom');
      assert(bounds.bottom > bounds.top + 30, 'The sphere is present');
      console.log('PASS complete handoff sphere', size, bounds);
      await page.evaluate(y => scrollTo(0, y), size.height * 1.5);
      await page.waitForTimeout(300);
      await page.screenshot({ path: '/tmp/rast-intro-logo-' + size.width + '.png' });
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
