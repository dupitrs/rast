// Run against `python3 serve.py`; see README for the Playwright setup.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
const errors = [];

async function ready(page, path = '/') {
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__rastBooted && history.state?.rastScroll);
  await page.waitForTimeout(500);
}
async function at(page, y) {
  await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
  await page.waitForTimeout(350);
}
async function near(page, y, label) {
  await page.waitForFunction(y => Math.abs(scrollY - y) < 3, y);
  assert(Math.abs(await page.evaluate(() => scrollY) - y) < 3, label);
}
async function formChecks(page) {
  const y = await page.evaluate(() => scrollY);
  // Programmatic click lets this also cover a CTA away from the viewport.
  await page.locator('.cta__actions .js-open-form').first().evaluate(el => { el.focus({ preventScroll: true }); el.click(); });
  await page.waitForFunction(() => document.activeElement.id === 'fName');
  assert(await page.locator('main').evaluate(el => el.inert));
  await page.locator('.form__close').focus();
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('[type=submit]').evaluate(el => el === document.activeElement));
  await page.keyboard.press('Tab');
  assert(await page.locator('.form__close').evaluate(el => el === document.activeElement));
  await page.locator('.cselect__btn').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  assert(await page.locator('#fService').inputValue());
  await page.locator('.cselect__btn').press('Enter');
  await page.keyboard.press('Escape');
  assert(await page.locator('#formModal').evaluate(el => el.classList.contains('is-open')));
  await page.keyboard.press('Escape');
  assert(!(await page.locator('main').evaluate(el => el.inert)));
  await near(page, y, 'Closing form keeps page position');
  assert(await page.locator('.cta__actions .js-open-form').first().evaluate(el => document.activeElement === el));
}
async function menuChecks(page) {
  await at(page, 1200);
  await page.locator('#navToggle').evaluate(el => el.click());
  await page.waitForTimeout(800);
  assert(await page.locator('#menu a').first().evaluate(el => el === document.activeElement));
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('#navToggle').evaluate(el => el === document.activeElement));
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('#menu a').last().evaluate(el => el === document.activeElement));
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 650);
  await page.waitForTimeout(300);
  await near(page, y, 'Menu locks background scroll');
  await page.keyboard.press('Escape');
  assert(await page.locator('#navToggle').evaluate(el => el === document.activeElement));
  await page.locator('#navToggle').click();
  await page.locator('#menu a[href="#work"]').click();
  await page.waitForTimeout(1500);
  assert.equal(new URL(page.url()).hash, '', 'Section navigation keeps a clean URL');
  assert(!(await page.locator('main').evaluate(el => el.inert)));
  assert(await page.locator('#work').evaluate(el => document.activeElement === el));
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    headless: true,
    args: ['--no-sandbox'],
    ignoreDefaultArgs: ['--disable-back-forward-cache']
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await ready(page);
    assert(await page.evaluate(() => !!window.ScrollTrigger && !!window.Lenis), 'Normal animation dependencies loaded');
    await at(page, 6500);
    await page.reload({ waitUntil: 'load' });
    await near(page, 6500, 'Reload restores position');
    const origin = await page.evaluate(() => performance.timeOrigin);
    await page.goto(base + '/raksti/cik-maksa-majaslapa');
    await page.goBack({ waitUntil: 'load' });
    await near(page, 6500, 'Back from article restores position');
    console.log('PASS reload + cross-page back; bfcache used:', origin === await page.evaluate(() => performance.timeOrigin));
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await near(page, 6500, 'Cached pageshow resumes at saved position');
    await page.mouse.wheel(0, 350);
    await page.waitForTimeout(1400);
    assert(await page.evaluate(() => scrollY > 6600), 'Scrolling resumes after back');
    await at(page, 3000);
    await page.locator('.nav a[href="#work"]').evaluate(el => el.click());
    await page.waitForTimeout(1500);
    const workY = await page.evaluate(() => scrollY);
    assert.equal(new URL(page.url()).hash, '', 'Section navigation keeps a clean URL');
    assert(await page.locator('#work').evaluate(el => el.getBoundingClientRect().top >= 60));
    await page.goBack();
    await near(page, 3000, 'Back restores prior anchor position');
    await page.goForward();
    await near(page, workY, 'Forward restores anchor position');
    await formChecks(page);
    console.log('PASS anchors, history, modal focus trap, dropdown keyboard, Escape');

    // Intercept the endpoint: tests never send a real enquiry.
    let submissions = 0;
    await page.route('https://api.web3forms.com/submit', async route => {
      submissions++;
      await new Promise(resolve => setTimeout(resolve, 250));
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' });
    });
    await page.locator('.cta__actions .js-open-form').first().evaluate(el => el.click());
    await page.locator('#fName').fill('Browser test');
    await page.locator('#fEmail').fill('test@example.com');
    await page.locator('#fMsg').fill('Local automated test; intercepted.');
    await page.locator('#projectForm').evaluate(el => { el.requestSubmit(); el.requestSubmit(); });
    await page.waitForSelector('.form__status.is-err');
    assert.equal(submissions, 1, 'Duplicate submit is ignored');
    assert.equal(await page.locator('#fName').inputValue(), 'Browser test');
    assert(await page.locator('[type=submit]').isEnabled());
    await page.keyboard.press('Escape');
    console.log('PASS failed submission retains data and enables retry, duplicate protection');
    await context.close();

    for (const mode of ['mobile', 'reduced', 'no-cdn', 'no-scrolltrigger', 'en', 'ru']) {
      const mobile = mode === 'mobile' || mode === 'reduced';
      const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
        isMobile: mobile, hasTouch: mobile, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference' });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(mode + ': ' + e.message));
      if (mode === 'no-cdn') await p.route(/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/, route => route.abort());
      if (mode === 'no-scrolltrigger') await p.route('**/ScrollTrigger.min.js', route => route.abort());
      await ready(p, mode === 'en' || mode === 'ru' ? '/' + mode + '/#work' : '/#work');
      assert(await p.evaluate(() => scrollY > 1000), mode + ' deep link');
      await at(p, 2400);
      await p.reload({ waitUntil: 'load' });
      await near(p, 2400, mode + ' reload');
      assert.equal(new URL(p.url()).hash, '', 'Incoming deep link is consumed without losing position');
      await formChecks(p);
      if (mobile) {
        await menuChecks(p);
        await p.screenshot({ path: '/tmp/rast-' + mode + '-checked.png' });
      }
      if (mode === 'no-cdn' || mode === 'no-scrolltrigger' || mode === 'reduced') {
        assert(await p.locator('html').evaluate(el => el.classList.contains('no-anim')));
        assert.equal(await p.locator('#work .work__card').first().evaluate(el => getComputedStyle(el).opacity), '1');
      }
      await p.goto(base + '/#%invalid[');
      await p.waitForTimeout(700);
      console.log('PASS', mode, 'deep links, reload, form, malformed hash' + (mobile ? ', menu, no overflow' : ''));
      await ctx.close();
    }
    assert.deepEqual(errors, [], 'No uncaught JavaScript errors');
    console.log('All navigation checks passed.');
  } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
