/**
 * FINAL MANUAL DEMO VERIFICATION — drives the real app in headless Chrome and
 * checks the whole judge-facing demo flow. Captures every console + network error.
 * Read-only against the DB except the ERP transfers it is meant to exercise
 * (a compensating transfer restores inventory at the end).
 */
import puppeteer from 'puppeteer';

const URL = 'http://localhost:3000';
const API = 'http://localhost:4000/api';

let pass = 0, fail = 0;
const results = {};
const ok = (section, c, n, d = '') => {
  c ? pass++ : fail++;
  (results[section] ||= []).push(`${c ? 'PASS' : 'FAIL'} — ${n}${d ? ` (${d})` : ''}`);
  console.log(`${c ? ' ✅' : ' ❌'} [${section}] ${n}${d ? ` — ${d}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiCall(path, opts = {}) {
  const res = await fetch(`${API}${path}`, opts);
  let json = null; try { json = await res.json(); } catch { /* */ }
  return { status: res.status, json };
}

async function loginBrowser(page, quickFillLabel) {
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await sleep(700);
  await page.evaluate((lbl) => {
    const b = [...document.querySelectorAll('button[type="button"]')].find((x) => new RegExp(lbl).test(x.textContent) && /incidentai\.demo/.test(x.textContent));
    if (b) b.click();
  }, quickFillLabel);
  await sleep(400);
  await page.evaluate(() => { const b = document.querySelector('button[type="submit"]'); if (b) b.click(); });
  await page.waitForSelector('aside, nav', { timeout: 15000 });
  await sleep(1800);
}

const chip = (page) => page.$$eval('span', (els) => {
  const el = els.find((e) => e.textContent && e.textContent.startsWith('CURRENT STATE:'));
  return el ? el.textContent.trim() : null;
});
const navTo = async (page, re) => {
  await page.evaluate((r) => {
    const rx = new RegExp(r, 'i');
    const b = [...document.querySelectorAll('button, a')].find((x) => rx.test(x.textContent));
    if (b) b.click();
  }, re.source);
  await sleep(2500);
};
const clickBtn = (page, re) => page.evaluate((r) => {
  const rx = new RegExp(r, 'i');
  const b = [...document.querySelectorAll('button')].find((x) => rx.test(x.textContent));
  if (b) { b.click(); return b.textContent.trim(); }
  return null;
}, re.source);
const setNum = (page, v) => page.evaluate((val) => {
  const num = document.querySelector('input[type="number"]');
  if (!num) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(num, String(val)); num.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}, v);

async function run() {
  const token = (await apiCall('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'developer@incidentai.demo', password: 'demopass123' }) })).json.token;
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [], networkErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().replace(/\s+/g, ' ').slice(0, 200)); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => networkErrors.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 500) networkErrors.push(`${r.status()} ${r.request().method()} ${r.url()}`); });

  try {
    /* ── 2. DEVELOPER GOLDEN PATH — login + shell ── */
    await loginBrowser(page, 'Developer');
    let text = await page.evaluate(() => document.body.innerText);
    ok('B_dev_login', /Devi Developer/.test(text) && /Developer/.test(text), 'Developer authenticated & shell rendered');
    ok('B_dev_login', /Incident Queue/i.test(text), 'Landing shows Incident Queue');
    ok('B_dev_login', !/My Incidents|End User|Support Triage|Triage Feed|Incident Reporter/i.test(text), 'No End-User / Support-Triage / My Incidents / Reporter card in shell');
    const navItems = await page.$$eval('nav button', (bs) => bs.map((b) => b.textContent.replace(/\d+$/, '').trim()).filter(Boolean));
    ok('B_dev_login', navItems.join(',') === 'Incident Queue,Developer Workbench,Incident Lifecycle,Integration Hub,Digital Twin', 'Developer nav is correct (no Executive Dashboard)', navItems.join(' · '));

    /* ── 3. DIGITAL TWIN → REAL ERP TRANSACTION ── */
    await navTo(page, /digital twin/);
    text = await page.evaluate(() => document.body.innerText);
    ok('C_invalid_transfer', /LIVE INTEGRATION/.test(text), 'Digital Twin header shows LIVE INTEGRATION');
    ok('C_invalid_transfer', /SEEDED DISPLAY DATA|LIVE DB STATE/.test(text), 'Master-records section is labelled (seeded vs live)');
    ok('C_invalid_transfer', /REAL ERP PROCESSING/i.test(text), 'Transfer form labelled REAL ERP PROCESSING');

    const invBefore = (await apiCall('/erp/inventory', { headers: H })).json.inventory;
    const w1_0 = invBefore.find((r) => r.bin === 'W1' && r.sku === 'SK-902').available_qty;
    const w2_0 = invBefore.find((r) => r.bin === 'W2' && r.sku === 'SK-902').available_qty;
    ok('C_invalid_transfer', w1_0 === 84, 'Baseline: W1 SK-902 available = 84', `${w1_0}`);

    await setNum(page, 100);
    await sleep(300);
    await clickBtn(page, /Execute/);
    await sleep(17000); // ingest runs LLM diagnosis
    text = await page.evaluate(() => document.body.innerText);
    ok('C_invalid_transfer', /REJECTED/.test(text) && /incident persisted/i.test(text), 'UI shows ERP transaction REJECTED — incident persisted');
    const incNum = (text.match(/INC-\d+-\d+/) || [])[0];
    ok('C_invalid_transfer', !!incNum, 'Rejection card shows a real incident number', incNum);
    ok('C_invalid_transfer', /Correlation:\s*ERP-TX-/.test(text), 'Rejection card shows the source transaction correlation id');

    // DB truth
    const txs = (await apiCall('/erp/transactions?limit=5', { headers: H })).json.transactions;
    const rejTx = txs.find((t) => t.status === 'REJECTED');
    ok('C_invalid_transfer', !!rejTx, 'erp_transactions has a REJECTED row');
    const incTicket = (await apiCall(`/tickets/${incNum}`, { headers: H })).json.ticket;
    ok('E_incident', incTicket?.status === 'TRIAGED', 'Incident persisted & TRIAGED', `${incTicket?.ticket_number}`);
    ok('E_incident', incTicket?.correlation_id === rejTx?.id, 'Incident correlation_id == ERP transaction id');
    ok('E_incident', rejTx?.incident_id === incTicket?.id, 'ERP transaction links back to incident id');
    const invAfterRej = (await apiCall('/erp/inventory', { headers: H })).json.inventory;
    ok('C_invalid_transfer', invAfterRej.find((r) => r.bin === 'W1' && r.sku === 'SK-902').available_qty === w1_0, 'Stock UNCHANGED after rejection (no fake mutation)');

    // incident in queue
    await navTo(page, /incident queue/);
    await sleep(1500);
    const inQueue = await page.evaluate((n) => document.body.innerText.includes(n), incNum);
    ok('E_incident', inQueue, 'New incident appears in the Incident Queue');

    /* ── 4. INCIDENT LIFECYCLE GOLDEN PATH ── */
    // select the incident
    await page.evaluate((n) => { const b = [...document.querySelectorAll('button')].find((x) => x.querySelector('code') && x.textContent.includes(n)); if (b) b.click(); }, incNum);
    await sleep(2000);
    let c = await chip(page);
    ok('F_lifecycle', c === 'CURRENT STATE: TRIAGED', 'Lifecycle shows persisted state TRIAGED', c);

    // 5. AI DIAGNOSIS / EVIDENCE sections present
    const detail = await page.$eval('.max-w-6xl', (el) => el.innerText).catch(() => '');
    ok('AI_diagnosis', /WHAT HAPPENED\?/i.test(detail), 'Section: What happened?');
    ok('AI_diagnosis', /WHAT HAPPENS NEXT\?/i.test(detail) || /CURRENT STEP/i.test(detail), 'Section: current step / what happens next');
    ok('AI_diagnosis', /AI DIAGNOSIS & EVIDENCE BREAKDOWN/i.test(detail), 'Section: AI Diagnosis & Evidence Breakdown');
    ok('AI_diagnosis', /Grounded Evidence/i.test(detail) && /RAG (Match|Evidence)/i.test(detail), 'Evidence separated: grounded / RAG / live');
    ok('AI_diagnosis', /Suspected Root Cause \(AI Inference\)/i.test(detail), 'Root cause labelled as AI inference (not fact)');
    ok('AI_diagnosis', /(Confidence|N\/A|unavailable)/i.test(detail), 'Confidence shown (value or honest N/A)');
    ok('AI_diagnosis', /Incident Source/i.test(detail) && !/Incident Reporter/i.test(detail), 'Ownership: Incident Source card, no Reporter card');
    ok('AI_diagnosis', /Assigned Developer.*Owner|Assigned Developer/i.test(detail), 'Ownership: Assigned Developer / Owner shown');

    // invalid transition rejected by backend
    const badApply = await apiCall(`/incidents/${incNum}/apply-patch`, { method: 'POST', headers: H });
    ok('F_lifecycle', badApply.status === 409, 'Backend rejects apply-patch from TRIAGED (409, not just disabled)', `${badApply.status}`);

    // walk golden path via CTA
    for (const [label, expect] of [
      [/Approve Remediation Plan/, 'CURRENT STATE: APPROVED'],
      [/Start Automated Verification/, 'CURRENT STATE: VERIFICATION PASSED'],
      [/Apply Patch & Resolve/, 'CURRENT STATE: RESOLVED'],
    ]) {
      const clicked = await clickBtn(page, label);
      await sleep(3200);
      c = await chip(page);
      ok('F_lifecycle', !!clicked && c === expect, `CTA "${clicked}" → ${expect}`, c);
      const dbStatus = (await apiCall(`/tickets/${incNum}`, { headers: H })).json.ticket?.status;
      const expectDb = { 'CURRENT STATE: APPROVED': 'APPROVED', 'CURRENT STATE: VERIFICATION PASSED': 'VERIFICATION', 'CURRENT STATE: RESOLVED': 'RESOLVED' }[expect];
      ok('F_lifecycle', dbStatus === expectDb, `DB == UI (${dbStatus})`);
    }

    // 6. REMEDIATION persistence + honest labels
    const rem = (await apiCall(`/incidents/${incNum}/remediation`, { headers: H })).json.remediation;
    ok('G_remediation', rem?.status === 'APPLIED' && !!rem?.approved_by && rem?.verification_result?.status === 'PASS', 'Remediation persisted (status/approver/verification)', `${rem?.status} by ${rem?.approved_by}`);
    const audit = (await apiCall(`/incidents/${incNum}/audit-logs`, { headers: H })).json.audit_logs;
    ok('G_remediation', audit.length >= 4 && audit.some((a) => a.action === 'PATCH_APPLIED'), 'Audit trail persisted in Postgres', `${audit.length} events`);
    await clickBtn(page, /Verification Engine/);
    await sleep(1200);
    const verifText = await page.evaluate(() => document.body.innerText);
    ok('H_verification', /SIMULATED VERIFICATION/i.test(verifText), 'Verification panel labelled SIMULATED VERIFICATION');
    ok('H_verification', /5\/5|checks passed/i.test(verifText), 'Verification shows real 5/5 result');

    // refresh persistence
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);
    await navTo(page, /incident queue/);
    await page.evaluate((n) => { const b = [...document.querySelectorAll('button')].find((x) => x.querySelector('code') && x.textContent.includes(n)); if (b) b.click(); }, incNum);
    await sleep(2000);
    c = await chip(page);
    ok('J_persistence', c === 'CURRENT STATE: RESOLVED', 'After browser refresh, lifecycle still RESOLVED', c);

    /* ── 7. FAILURE → ROLLBACK PATH (new incident) ── */
    const b2 = (await apiCall('/incidents/ingest', { method: 'POST', headers: H, body: JSON.stringify({ text: 'ERR_STOCK_NEG bin transfer failure path test', erp_context: { module: 'INVENTORY', correlation_id: 'FAILPATH-1' } }) })).json.ticket;
    await apiCall(`/incidents/${b2.id}/remediation/approve`, { method: 'POST', headers: H });
    const vf = await apiCall(`/incidents/${b2.id}/verify-patch`, { method: 'POST', headers: H, body: JSON.stringify({ simulate_failure: true }) });
    ok('I_rollback', vf.json.ticket?.status === 'VERIFICATION_FAILED', 'Verify(fail) → VERIFICATION_FAILED');
    // rollback authorization: executive forbidden
    const execTok = (await apiCall('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'executive@incidentai.demo', password: 'demopass123' }) })).json.token;
    const execRb = await apiCall(`/incidents/${b2.id}/rollback`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${execTok}` } });
    ok('I_rollback', execRb.status === 403, 'Rollback requires developer authorization (executive 403)');
    const rb = await apiCall(`/incidents/${b2.id}/rollback`, { method: 'POST', headers: H, body: JSON.stringify({ reason: 'final verification test' }) });
    ok('I_rollback', rb.json.ticket?.status === 'ROLLED_BACK', 'Rollback → ROLLED_BACK (persisted)');
    const rbAudit = (await apiCall(`/incidents/${b2.id}/audit-logs`, { headers: H })).json.audit_logs;
    ok('I_rollback', rbAudit.some((a) => a.action === 'ROLLBACK_SUCCESSFUL'), 'Rollback audit event persisted');
    const ret = await apiCall(`/incidents/${b2.id}/remediation/return`, { method: 'POST', headers: H });
    ok('I_rollback', ret.json.ticket?.status === 'IN_PROGRESS', 'Return-to-remediation → IN_PROGRESS');
    // verify in browser + refresh
    await navTo(page, /incident queue/);
    await page.evaluate((n) => { const b = [...document.querySelectorAll('button')].find((x) => x.querySelector('code') && x.textContent.includes(n)); if (b) b.click(); }, b2.ticket_number);
    await sleep(2000);
    c = await chip(page);
    ok('I_rollback', c === 'CURRENT STATE: IN PROGRESS', 'Browser shows IN PROGRESS after failure→rollback→return', c);
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);
    await navTo(page, /incident queue/);
    await page.evaluate((n) => { const b = [...document.querySelectorAll('button')].find((x) => x.querySelector('code') && x.textContent.includes(n)); if (b) b.click(); }, b2.ticket_number);
    await sleep(2000);
    ok('J_persistence', (await chip(page)) === 'CURRENT STATE: IN PROGRESS', 'After refresh, failure-path incident still IN PROGRESS');

    /* ── 3 (cont). VALID ERP TRANSFER ── */
    await navTo(page, /digital twin/);
    await setNum(page, 20);
    await sleep(300);
    await clickBtn(page, /Execute/);
    await sleep(4000);
    text = await page.evaluate(() => document.body.innerText);
    ok('D_valid_transfer', /COMPLETED — database updated/i.test(text), 'Valid transfer shows COMPLETED — database updated');
    const invValid = (await apiCall('/erp/inventory', { headers: H })).json.inventory;
    ok('D_valid_transfer', invValid.find((r) => r.bin === 'W1' && r.sku === 'SK-902').available_qty === w1_0 - 20, `W1 ${w1_0} → ${w1_0 - 20}`, `now ${invValid.find((r) => r.bin === 'W1' && r.sku === 'SK-902').available_qty}`);
    ok('D_valid_transfer', invValid.find((r) => r.bin === 'W2' && r.sku === 'SK-902').available_qty === w2_0 + 20, `W2 ${w2_0} → ${w2_0 + 20}`);
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(1500);
    await navTo(page, /digital twin/);
    ok('D_valid_transfer', (await page.evaluate(() => document.body.innerText)).includes(String(w1_0 - 20)), 'After browser refresh, Digital Twin table shows the reduced W1 quantity');
    // compensating transfer
    await apiCall('/erp/inventory/transfer', { method: 'POST', headers: H, body: JSON.stringify({ sku: 'SK-902', from_bin: 'W2', to_bin: 'W1', qty: 20 }) });

    /* ── 9. INTEGRATION HUB ── */
    await navTo(page, /integration hub/);
    text = await page.evaluate(() => document.body.innerText);
    ok('K_integration', /LIVE INTEGRATION/.test(text) && /SIMULATED \/ DEMO CONNECTOR/.test(text) && /LOCAL RAG INDEX/.test(text), 'Honest connector labels present');
    ok('K_integration', /ERP Platform/.test(text) && /Integration \/ Webhooks/i.test(text) && /AI Diagnosis/i.test(text) && /RAG \/ Evidence/i.test(text) && /Remediation/i.test(text) && /Verification/i.test(text) && /Rollback/i.test(text) && /Audit Trail/i.test(text), 'Architecture flow ERP→…→Audit communicated');
    ok('K_integration', /Smart Manufacturing ERP integration is\s*LIVE/i.test(text), 'Transparency banner: ERP live, others simulated');

    /* ── 8. EXECUTIVE PERSONA (logout + re-login on the same browser) ── */
    // open the profile menu (header, top-right), then Log out
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('header button')].find((x) => /Devi Developer|Developer/.test(x.textContent));
      if (b) b.click();
    });
    await sleep(500);
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^\s*Log out\s*$/i.test(x.textContent)); if (b) b.click(); });
    await page.waitForFunction(() => /Sign in to your account/i.test(document.body.innerText), { timeout: 8000 }).catch(() => {});
    await sleep(800);
    const tokenCleared = await page.evaluate(() => !localStorage.getItem('incidentai_token'));
    ok('B_exec_login', tokenCleared, 'Logout clears the auth token from the browser');
    await loginBrowser(page, 'Executive');
    const execText = await page.evaluate(() => document.body.innerText);
    ok('B_exec_login', /Erin Executive/.test(execText), 'Executive authenticated');
    ok('B_exec_login', /Platform Performance|Executive Dashboard|ROI|MTTR/i.test(execText), 'Lands on Executive Dashboard');
    ok('B_exec_login', !/Developer Workbench|Incident Queue/i.test(execText), 'No developer remediation nav for Executive');
    ok('B_exec_login', !/My Incidents|End User|Support Triage/i.test(execText), 'No End-User/Triage functionality for Executive');
    const execNav = await page.$$eval('nav button', (bs) => bs.map((b) => b.textContent.replace(/\d+$/, '').trim()).filter(Boolean));
    ok('B_exec_login', execNav.join(',') === 'Executive Dashboard,Integration Hub,War Room,Digital Twin,Mission Control', 'Executive nav is appropriate', execNav.join(' · '));
    const anyTicket = (await apiCall('/tickets', { headers: { Authorization: `Bearer ${execTok}` } })).json.tickets?.[0]?.id;
    ok('B_exec_login', (await apiCall(`/incidents/${anyTicket}/remediation/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${execTok}` } })).status === 403, 'Executive cannot approve remediation (403)');
    ok('B_exec_login', (await apiCall('/erp/inventory/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${execTok}` }, body: JSON.stringify({ sku: 'SK-902', from_bin: 'W1', to_bin: 'W2', qty: 1 }) })).status === 403, 'Executive cannot execute an ERP transfer (403)');

    /* ── 11. console / network ── */
    const realConsole = consoleErrors.filter((e) => !/favicon|React DevTools|ResizeObserver|Download the React/i.test(e));
    ok('M_errors', realConsole.length === 0, 'No uncaught console / page errors', realConsole.slice(0, 4).join(' || ') || 'clean');
    ok('M_errors', networkErrors.length === 0, 'No failed / 5xx network requests', networkErrors.slice(0, 4).join(' || ') || 'clean');
  } catch (err) {
    ok('CRASH', false, 'verification crashed', err.message + '\n' + err.stack);
  } finally {
    await browser.close();
  }

  console.log('\n================= SUMMARY =================');
  for (const [s, lines] of Object.entries(results)) {
    console.log(`\n[${s}]`);
    lines.forEach((l) => console.log('  ' + l));
  }
  console.log(`\n>>> ${pass} passed, ${fail} failed <<<`);
  process.exit(fail ? 1 : 0);
}
run();
