/**
 * Browser demo golden path (requirements #14 / #6).
 *
 *  1. Login as Developer
 *  2. Open Digital Twin
 *  3. Trigger an invalid inventory transfer (qty > available stock)
 *  4. Backend rejects it; a persisted incident appears in the UI
 *  5. Open the incident → lifecycle shows the real persisted state (TRIAGED)
 *  6. Walk the workflow: approve → verify → apply → RESOLVED (DB == UI each step)
 *  7. Also run one VALID transfer and confirm the Digital Twin inventory table changes
 *     and the change survives a browser reload
 */

import puppeteer from 'puppeteer';

const URL = 'http://localhost:3000';
const API = 'http://localhost:4000/api';
const CRED = { email: 'developer@incidentai.demo', password: 'demopass123' };

let pass = 0, fail = 0;
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(`${c ? ' ✅' : ' ❌'} ${n}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function run() {
  const auth = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CRED) });
  const token = auth.json.token;

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  const clickByText = (re) => page.evaluate((r) => {
    const rx = new RegExp(r, 'i');
    const b = [...document.querySelectorAll('button, a')].find((x) => rx.test(x.textContent));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
  }, re.source);

  const chip = () => page.$$eval('span', (els) => {
    const el = els.find((e) => e.textContent && e.textContent.startsWith('CURRENT STATE:'));
    return el ? el.textContent.trim() : null;
  });

  try {
    // 1. Login
    await page.goto(URL, { waitUntil: 'networkidle2' });
    await sleep(600);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button[type="button"]')].find((x) => /Developer/.test(x.textContent) && /incidentai\.demo/.test(x.textContent));
      if (b) b.click();
    });
    await sleep(400);
    await page.evaluate(() => { const b = document.querySelector('button[type="submit"]'); if (b) b.click(); });
    await page.waitForSelector('aside, nav', { timeout: 15000 });
    await sleep(1500);
    ok(true, 'Login as Developer');

    // Removed personas should not appear anywhere in the app shell
    const shellText = await page.evaluate(() => document.body.innerText);
    ok(!/My Incidents|Support Triage|Triage Feed/i.test(shellText), 'No End-User / Support-Triage navigation in the app shell');

    // 2. Digital Twin
    await clickByText(/digital twin/);
    await sleep(2500);
    const invBefore = (await api('/erp/inventory', { headers: { Authorization: `Bearer ${token}` } })).json.inventory;
    const w1Before = invBefore.find((r) => r.bin === 'W1' && r.sku === 'SK-902').available_qty;

    // 3. Invalid transfer — set qty above available and submit
    await page.evaluate((over) => {
      const num = document.querySelector('input[type="number"]');
      if (num) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(num, String(over));
        num.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, w1Before + 40);
    await sleep(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Execute/i.test(x.textContent)); if (b) b.click(); });
    await sleep(20000);

    // 4. Rejection card + persisted incident
    const rejectText = await page.evaluate(() => document.body.innerText);
    ok(/REJECTED/.test(rejectText) && /incident persisted/i.test(rejectText), 'UI shows ERP transaction REJECTED — incident persisted');
    const incNum = (rejectText.match(/INC-\d+-\d+/) || [])[0];
    ok(!!incNum, 'Rejection card shows a real incident number', incNum);

    // stock not mutated by a rejection
    const invAfterReject = (await api('/erp/inventory', { headers: { Authorization: `Bearer ${token}` } })).json.inventory;
    ok(invAfterReject.find((r) => r.bin === 'W1' && r.sku === 'SK-902').available_qty === w1Before, 'Live inventory unchanged after rejection');

    // 5. Open in IncidentAI
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Open in IncidentAI/i.test(x.textContent)); if (b) b.click(); });
    await sleep(2500);
    let c = await chip();
    ok(c === 'CURRENT STATE: TRIAGED', 'Opened incident — lifecycle shows persisted state TRIAGED', c);
    const detailText = await page.$eval('.max-w-6xl', (el) => el.innerText).catch(() => '');
    ok(detailText.includes(incNum), 'Incident detail pane shows the triggered incident id', incNum);

    // 6. Walk the workflow
    for (const [label, expect] of [[/Approve Remediation Plan/, 'CURRENT STATE: APPROVED'], [/Start Automated Verification/, 'CURRENT STATE: VERIFICATION PASSED'], [/Apply Patch & Resolve/, 'CURRENT STATE: RESOLVED']]) {
      const clicked = await page.evaluate((r) => {
        const rx = new RegExp(r, 'i');
        const b = [...document.querySelectorAll('button')].find((x) => rx.test(x.textContent));
        if (b) { b.click(); return true; }
        return false;
      }, label.source);
      await sleep(3000);
      c = await chip();
      ok(clicked && c === expect, `Workflow step → ${expect}`, c);
    }
    const inc = (await api(`/tickets/${incNum}`, { headers: { Authorization: `Bearer ${token}` } })).json.ticket;
    ok(inc.status === 'RESOLVED', 'Backend incident status RESOLVED (DB == UI)');

    // 7. Valid transfer changes DB + survives reload
    await clickByText(/digital twin/);
    await sleep(2500);
    await page.evaluate(() => {
      const num = document.querySelector('input[type="number"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(num, '15'); num.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await sleep(300);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Execute/i.test(x.textContent)); if (b) b.click(); });
    await sleep(20000);
    const okText = await page.evaluate(() => document.body.innerText);
    ok(/COMPLETED — database updated/i.test(okText), 'Valid transfer shows COMPLETED — database updated');

    const invAfterValid = (await api('/erp/inventory', { headers: { Authorization: `Bearer ${token}` } })).json.inventory;
    ok(invAfterValid.find((r) => r.bin === 'W1' && r.sku === 'SK-902').available_qty === w1Before - 15, 'W1 stock reduced by 15 in the database', `${w1Before} → ${w1Before - 15}`);

    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);
    await clickByText(/digital twin/);
    await sleep(2500);
    const tableText = await page.evaluate(() => document.body.innerText);
    ok(tableText.includes(String(w1Before - 15)), 'After browser reload the Digital Twin table still shows the reduced quantity');

    // compensating transfer to restore baseline
    await api('/erp/inventory/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ sku: 'SK-902', from_bin: 'W2', to_bin: 'W1', qty: 15 }) });

    const realErrors = consoleErrors.filter((e) => !/favicon|React DevTools|ResizeObserver/i.test(e));
    ok(realErrors.length === 0, 'No uncaught console/page errors', realErrors.slice(0, 3).join(' | ') || 'clean');
  } catch (err) {
    ok(false, 'Test crashed', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n=== BROWSER ERP GOLDEN PATH: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
}

run();
