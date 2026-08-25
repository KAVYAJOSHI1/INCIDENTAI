import http from 'node:http';
import { VIEWS_BY_ROLE, DEFAULT_VIEW_BY_ROLE } from '../src/constants/roles.js';

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
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runVerification() {
  console.log('==================================================');
  console.log('PHASE 9 VERIFICATION — AUTH REFRESH LOOP + PERSONA UI');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. CONSTANTS AUDIT (UI ACCEPTANCE MATRIX)
  console.log('1. AUDITING INCIDENTAI PERSONA VIEWS MATRIX');
  assert(!VIEWS_BY_ROLE.END_USER.includes('REPORTER'), 'END_USER persona does NOT contain REPORTER view');
  assert(!VIEWS_BY_ROLE.SUPPORT_TRIAGE.includes('REPORTER'), 'SUPPORT_TRIAGE persona does NOT contain REPORTER view');
  assert(!VIEWS_BY_ROLE.DEVELOPER.includes('REPORTER'), 'DEVELOPER persona does NOT contain REPORTER view');
  assert(!VIEWS_BY_ROLE.EXECUTIVE.includes('REPORTER'), 'EXECUTIVE persona does NOT contain REPORTER view');

  assert(DEFAULT_VIEW_BY_ROLE.END_USER === 'MY_INCIDENTS', 'END_USER lands on MY_INCIDENTS');
  assert(DEFAULT_VIEW_BY_ROLE.SUPPORT_TRIAGE === 'TRIAGE', 'SUPPORT_TRIAGE lands on TRIAGE');
  assert(DEFAULT_VIEW_BY_ROLE.DEVELOPER === 'DEVELOPER', 'DEVELOPER lands on DEVELOPER');
  assert(DEFAULT_VIEW_BY_ROLE.EXECUTIVE === 'ADMIN', 'EXECUTIVE lands on ADMIN');

  // 2. AUTH & PERSONA API PERMISSIONS
  console.log('\n2. TESTING INCIDENTAI PERSONA AUTH & BACKEND RBAC');

  const accounts = [
    { email: 'enduser@incidentai.demo', expectedRole: 'END_USER' },
    { email: 'triage@incidentai.demo', expectedRole: 'SUPPORT_TRIAGE' },
    { email: 'developer@incidentai.demo', expectedRole: 'DEVELOPER' },
    { email: 'executive@incidentai.demo', expectedRole: 'EXECUTIVE' },
  ];

  const tokens = {};

  for (const acc of accounts) {
    const res = await request('/auth/login', 'POST', { email: acc.email, password: 'demopass123' });
    assert(res.status === 200 && res.data.token, `Login successful for ${acc.email}`);
    assert(res.data.user?.role === acc.expectedRole, `${acc.email} receives role ${acc.expectedRole}`);
    tokens[acc.expectedRole] = res.data.token;
  }

  // Test 401 handling on wrong password
  const failLogin = await request('/auth/login', 'POST', { email: 'enduser@incidentai.demo', password: 'wrongpassword' });
  assert(failLogin.status === 401, 'Invalid password returns 401 status cleanly');

  // Test Session Hydration (/auth/me)
  for (const role of Object.keys(tokens)) {
    const meRes = await request('/auth/me', 'GET', null, tokens[role]);
    assert(meRes.status === 200 && meRes.data.user?.role === role, `Session hydration GET /auth/me returns role ${role}`);
  }

  // Test RBAC Gating
  console.log('\n3. TESTING BACKEND RBAC ENFORCEMENT PER PERSONA');

  // END_USER accessing staff endpoint /developers
  const endUserDevs = await request('/developers', 'GET', null, tokens.END_USER);
  assert(endUserDevs.status === 403, 'END_USER accessing /developers returned 403 Forbidden');

  // END_USER accessing executive endpoint /analytics/summary
  const endUserAnalytics = await request('/analytics/summary', 'GET', null, tokens.END_USER);
  assert(endUserAnalytics.status === 403, 'END_USER accessing /analytics/summary returned 403 Forbidden');

  // SUPPORT_TRIAGE accessing executive endpoint /analytics/summary
  const triageAnalytics = await request('/analytics/summary', 'GET', null, tokens.SUPPORT_TRIAGE);
  assert(triageAnalytics.status === 403, 'SUPPORT_TRIAGE accessing /analytics/summary returned 403 Forbidden');

  // DEVELOPER accessing executive endpoint /analytics/summary
  const devAnalytics = await request('/analytics/summary', 'GET', null, tokens.DEVELOPER);
  assert(devAnalytics.status === 403, 'DEVELOPER accessing /analytics/summary returned 403 Forbidden');

  // EXECUTIVE accessing executive endpoint /analytics/summary
  const execAnalytics = await request('/analytics/summary', 'GET', null, tokens.EXECUTIVE);
  assert(execAnalytics.status === 200, 'EXECUTIVE accessing /analytics/summary returned 200 OK');

  // 4. REAL ERP REPORT ISSUE INGESTION INTEGRATION
  console.log('\n4. TESTING ERP REPORT ISSUE INGESTION (POST /api/incidents/ingest)');
  const erpPayload = {
    text: 'ERR_INVENTORY_VAL_808: Negative quantity violation during stock transfer in warehouse bin W2',
    reporter: 'erp_operator@smartfactory.demo',
    erp_context: {
      erp: 'Smart Manufacturing ERP',
      module: 'Inventory',
      route: '/inventory/transfer/992',
      record_id: '992',
      user_id: 'usr_inv_88',
      user_role: 'inventory_manager',
      timestamp: new Date().toISOString()
    }
  };

  const ingestRes = await request('/incidents/ingest', 'POST', erpPayload, tokens.END_USER);
  assert(ingestRes.status === 201 || ingestRes.status === 200, `ERP Ingest API returned ${ingestRes.status}`);
  assert(ingestRes.data.ticket?.ticket_number, `Created Ticket Number: ${ingestRes.data.ticket?.ticket_number}`);
  assert(ingestRes.data.ticket?.erp_module === 'INVENTORY', 'Parsed ERP Module correctly as INVENTORY');

  console.log('\n==================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runVerification().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
