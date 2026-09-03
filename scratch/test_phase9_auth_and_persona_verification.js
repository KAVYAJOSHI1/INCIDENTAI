import http from 'node:http';
import { VIEWS_BY_ROLE, DEFAULT_VIEW_BY_ROLE, ROLES } from '../src/constants/roles.js';

const API_BASE = 'http://localhost:4000/api';

async function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const payload = body ? JSON.stringify(body) : null;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runVerification() {
  console.log('=== PHASE 9 — AUTH + 2-PERSONA VERIFICATION ===\n');
  let passed = 0, failed = 0;
  const assert = (c, m) => { c ? (passed++, console.log(`[PASS] ${m}`)) : (failed++, console.error(`[FAIL] ${m}`)); };

  // 1. Persona views matrix — exactly two personas, business user removed
  console.log('1. PERSONA VIEWS MATRIX');
  assert(ROLES.length === 2 && ROLES.includes('DEVELOPER') && ROLES.includes('EXECUTIVE'), 'Exactly two roles: DEVELOPER, EXECUTIVE');
  assert(!VIEWS_BY_ROLE.END_USER && !VIEWS_BY_ROLE.SUPPORT_TRIAGE, 'END_USER / SUPPORT_TRIAGE personas removed from views matrix');
  assert(!Object.values(VIEWS_BY_ROLE).flat().includes('MY_INCIDENTS'), 'No persona references the removed My Incidents page');
  assert(DEFAULT_VIEW_BY_ROLE.DEVELOPER === 'TRIAGE', 'DEVELOPER lands on the incident queue');
  assert(DEFAULT_VIEW_BY_ROLE.EXECUTIVE === 'ADMIN', 'EXECUTIVE lands on the executive dashboard');

  // 2. Auth
  console.log('\n2. AUTH & SESSION');
  const tokens = {};
  for (const acc of [
    { email: 'developer@incidentai.demo', role: 'DEVELOPER' },
    { email: 'executive@incidentai.demo', role: 'EXECUTIVE' },
  ]) {
    const res = await request('/auth/login', 'POST', { email: acc.email, password: 'demopass123' });
    assert(res.status === 200 && res.data.token, `Login ${acc.email}`);
    assert(res.data.user?.role === acc.role, `${acc.email} → role ${acc.role}`);
    tokens[acc.role] = res.data.token;
    const me = await request('/auth/me', 'GET', null, res.data.token);
    assert(me.status === 200 && me.data.user?.role === acc.role, `Session hydration /auth/me → ${acc.role}`);
  }
  const removed = await request('/auth/login', 'POST', { email: 'enduser@incidentai.demo', password: 'demopass123' });
  assert(removed.status === 401 || removed.status === 403, 'Removed enduser account cannot authenticate');
  const wrongPw = await request('/auth/login', 'POST', { email: 'developer@incidentai.demo', password: 'nope' });
  assert(wrongPw.status === 401, 'Wrong password returns 401');

  // 3. RBAC
  console.log('\n3. BACKEND RBAC');
  assert((await request('/analytics/summary', 'GET', null, tokens.DEVELOPER)).status === 403, 'DEVELOPER → /analytics/summary 403');
  assert((await request('/analytics/summary', 'GET', null, tokens.EXECUTIVE)).status === 200, 'EXECUTIVE → /analytics/summary 200');
  assert((await request('/developers', 'GET', null, tokens.DEVELOPER)).status === 200, 'DEVELOPER → /developers 200');

  // 4. ERP-originated ingestion (system identity, no interactive user role)
  console.log('\n4. ERP → INCIDENTAI INGESTION');
  const ingest = await request('/incidents/ingest', 'POST', {
    text: 'ERR_STOCK_NEG: Negative quantity violation during stock transfer in warehouse bin W2',
    reporter: 'Smart Manufacturing ERP',
    erp_context: { erp: 'Smart Manufacturing ERP', module: 'Inventory', route: '/inventory/transfer/992', record_id: '992' }
  });
  assert(ingest.status === 201 || ingest.status === 200, `ERP ingest → ${ingest.status}`);
  assert(!!ingest.data.ticket?.ticket_number, `Ticket created: ${ingest.data.ticket?.ticket_number}`);
  assert(ingest.data.ticket?.erp_module === 'INVENTORY', 'Module parsed as INVENTORY');

  console.log(`\nVERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runVerification().catch((err) => { console.error('Test execution failed:', err); process.exit(1); });
