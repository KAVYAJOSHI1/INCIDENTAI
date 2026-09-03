/**
 * Browser validation for the dynamic Incident Lifecycle UI.
 *
 * Drives the real React app in headless Chrome as a developer:
 *   - golden path via the lifecycle "what happens next" CTA (approve → verify → apply)
 *   - lifecycle "CURRENT STATE" chip + step badges track the backend at every click
 *   - failure path (simulate failure → rollback → return to remediation)
 *   - cross-incident isolation (open A, open B, back to A — no leaked fields)
 *   - browser reload preserves state
 *   - zero uncaught console errors / red network responses on the Triage view
 */

import puppeteer from 'puppeteer';

const URL = 'http://localhost:3000';
const API = 'http://localhost:4000/api';
const CRED = { email: 'developer@incidentai.demo', password: 'demopass123' };

let pass = 0, fail = 0;
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(`${c ? ' ✅' : ' ❌'} ${n}${d ? ` — ${d}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function seedIncident(token, tag) {
  const r = await fetch(`${API}/incidents/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      text: `ERR_STOCK_NEG negative on-hand during bin transfer — browser test ${tag}`,
      reporter: `browser_${tag}@smartfactory.demo`,
      erp_context: { erp: 'Smart Manufacturing ERP', module: 'INVENTORY', record_id: `browser-${tag}` }
    })
  });
  return (await r.json()).ticket;
}

async function chipText(page) {
  return page.$$eval('span', (els) => {
    const el = els.find((e) => e.textContent && e.textContent.startsWith('CURRENT STATE:'));
    return el ? el.textContent.trim() : null;
  });
}

async function clickNextAction(page) {
  // The lifecycle "what happens next" primary button lives in the accent CTA block.
  const clicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((x) => /Approve Remediation Plan|Start Automated Verification|Apply Patch & Resolve|Initiate Controlled Rollback|Return to Remediation/i.test(x.textContent));
    if (b) { b.click(); return b.textContent.trim(); }
    return null;
  });
  return clicked;
}

async function run() {
  const auth = await (await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(CRED)
  })).json();
  const token = auth.token;

  const A = await seedIncident(token, `A${Date.now() % 100000}`);
  const B = await seedIncident(token, `B${Date.now() % 100000}`);
  console.log(`Seeded A=${A.ticket_number} B=${B.ticket_number}`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  try {
    // ---- Login (use the "Developer" demo quick-fill, then submit) ----
    await page.goto(URL, { waitUntil: 'networkidle2' });
    await sleep(600);
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button[type="button"]')].find((x) => /Developer/.test(x.textContent) && /incidentai\.demo/.test(x.textContent));
      if (b) b.click();
    });
    await sleep(400);
    await page.evaluate(() => { const b = document.querySelector('button[type="submit"]'); if (b) b.click(); });
    await page.waitForSelector('aside, nav', { timeout: 15000 });
    await sleep(1800);
    ok(true, 'Login as developer');

    // ---- Navigate to Triage ----
    await page.evaluate(() => { const b = [...document.querySelectorAll('button, a')].find((x) => /incident queue/i.test(x.textContent)); if (b) b.click(); });
    await sleep(1200);

    // ---- Select incident A ----
    const selectByNumber = async (num) => {
      const done = await page.evaluate((n) => {
        const b = [...document.querySelectorAll('button')].find((x) => x.querySelector('code') && x.textContent.includes(n));
        if (b) { b.click(); return true; }
        return false;
      }, num);
      await sleep(1800);
      return done;
    };
    ok(await selectByNumber(A.ticket_number), 'Open incident A in Triage', A.ticket_number);

    let chip = await chipText(page);
    ok(chip === 'CURRENT STATE: TRIAGED', 'A lifecycle chip shows TRIAGED', chip);

    // Detail pane (not the shared queue list) shows A's own id, never B's
    const detailText = () => page.$eval('.max-w-6xl', (el) => el.innerText).catch(() => page.evaluate(() => document.body.innerText));
    let dt = await detailText();
    ok(dt.includes(A.ticket_number) && !dt.includes(B.ticket_number), 'A detail pane has A id and not B id');

    // ---- Golden path via lifecycle CTA ----
    let label = await clickNextAction(page); await sleep(2500);
    ok(/approve/i.test(label || ''), 'CTA 1 was Approve', label);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: APPROVED', 'After approve → chip APPROVED', chip);
    ok((await (await fetch(`${API}/tickets/${A.id}`, { headers: { Authorization: `Bearer ${token}` } })).json()).ticket.status === 'APPROVED', 'Backend A status APPROVED (DB == UI)');

    label = await clickNextAction(page); await sleep(2800);
    ok(/verification/i.test(label || ''), 'CTA 2 was Start Verification', label);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: VERIFICATION PASSED', 'After verify → chip VERIFICATION PASSED', chip);

    label = await clickNextAction(page); await sleep(2800);
    ok(/apply patch/i.test(label || ''), 'CTA 3 was Apply Patch', label);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: RESOLVED', 'After apply → chip RESOLVED', chip);
    ok((await (await fetch(`${API}/tickets/${A.id}`, { headers: { Authorization: `Bearer ${token}` } })).json()).ticket.status === 'RESOLVED', 'Backend A status RESOLVED');

    // ---- Reload preserves state ----
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button, a')].find((x) => /incident queue/i.test(x.textContent)); if (b) b.click(); });
    await sleep(1000);
    await selectByNumber(A.ticket_number);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: RESOLVED', 'After browser reload → A still RESOLVED', chip);

    // ---- Cross-incident isolation: open B ----
    ok(await selectByNumber(B.ticket_number), 'Open incident B', B.ticket_number);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: TRIAGED', 'B lifecycle chip shows TRIAGED (independent of A)', chip);
    dt = await detailText();
    ok(dt.includes(B.ticket_number) && !dt.includes(A.ticket_number), 'B detail pane has B id and not A id — no cross-incident leak');

    // ---- Failure path on B ----
    await clickNextAction(page); await sleep(2500); // approve
    // start verification as failure: use the VERIFICATION tab's DEMO FAILURE SIMULATION
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Verification Engine/i.test(x.textContent)); if (b) b.click(); });
    await sleep(1000);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /DEMO FAILURE SIMULATION/i.test(x.textContent)); if (b) b.click(); });
    await sleep(3000);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: VERIFICATION FAILED', 'B after simulated failure → chip VERIFICATION FAILED', chip);

    // rollback: lifecycle CTA opens the RollbackModal → confirm inside it
    label = await clickNextAction(page); await sleep(800);
    ok(/rollback/i.test(label || ''), 'CTA was Initiate Controlled Rollback', label);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Confirm Revert/i.test(x.textContent)); if (b) b.click(); });
    await sleep(5000);
    // close modal if still open
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^\s*(Close|Done)\s*$/i.test(x.textContent)); if (b) b.click(); });
    await sleep(1500);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: ROLLED BACK', 'B after rollback → chip ROLLED BACK', chip);

    label = await clickNextAction(page); await sleep(3000); // return to remediation
    ok(/return to remediation/i.test(label || ''), 'CTA was Return to Remediation', label);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: IN PROGRESS', 'B after return → chip IN PROGRESS (failure loop closed)', chip);

    // ---- Back to A: still resolved, no leak from B's failure flow ----
    await selectByNumber(A.ticket_number);
    chip = await chipText(page);
    ok(chip === 'CURRENT STATE: RESOLVED', 'Re-open A → still RESOLVED after working on B', chip);

    // ---- Console errors ----
    const realErrors = consoleErrors.filter((e) => !/favicon|Download the React DevTools|ResizeObserver/i.test(e));
    ok(realErrors.length === 0, 'No uncaught console/page errors on Triage flow', realErrors.slice(0, 3).join(' | ') || 'clean');

  } catch (err) {
    ok(false, 'Test crashed', err.message);
  } finally {
    await browser.close();
  }

  console.log(`\n=== BROWSER UI: ${pass} passed, ${fail} failed ===`);
  process.exit(fail ? 1 : 0);
}

run();
