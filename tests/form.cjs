// Verify form behavior without delivering a real email.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:5173';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  try {
    for (const lang of ['', 'en/', 'ru/']) {
      const page = await browser.newPage();
      let requests = 0, payload = '';
      await page.route('https://api.web3forms.com/submit', async route => {
        requests++; payload = route.request().postData();
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
      });
      await page.goto(base + '/' + lang, { waitUntil: 'networkidle' });
      await page.locator('.nav__cta.js-open-form').evaluate(el => el.click());
      await page.locator('#projectForm').evaluate(el => el.requestSubmit());
      assert.equal(requests, 0, 'Empty form is blocked');
      await page.locator('#fName').fill('Automated test');
      await page.locator('#fEmail').fill('invalid');
      await page.locator('#fMsg').fill('Intercepted test; no message sent.');
      await page.locator('#projectForm').evaluate(el => el.requestSubmit());
      assert.equal(requests, 0, 'Invalid email is blocked');
      await page.locator('#fEmail').fill('test@example.com');
      await page.locator('#projectForm').evaluate(el => el.requestSubmit());
      await page.waitForSelector('.form__status.is-err');
      assert.equal(requests, 0, 'Missing service is blocked');
      await page.locator('.cselect__opt').first().click();
      await page.locator('#projectForm').evaluate(el => el.requestSubmit());
      await page.waitForSelector('.form__status.is-ok');
      assert.equal(requests, 1);
      assert.match(payload, /name="email"/);
      assert.match(payload, /test@example.com/);
      assert.match(payload, /name="message"/);
      assert.equal(await page.locator('#fName').inputValue(), '');
      assert.equal(await page.locator('#fService').inputValue(), '');
      assert(await page.locator('.form__submit').isEnabled());
      console.log('PASS form validation, payload, success and reset:', lang || 'lv');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
