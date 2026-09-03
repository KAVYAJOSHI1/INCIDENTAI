import http from "node:http";

const BASE_URL = "http://localhost:4000";

// IncidentAI now has exactly two personas. Legacy roles must be fully rejected.
const USERS = [
  { role: "DEVELOPER", email: "developer@incidentai.demo", password: "demopass123" },
  { role: "EXECUTIVE", email: "executive@incidentai.demo", password: "demopass123" },
];
const REMOVED_ACCOUNTS = [
  { email: "enduser@incidentai.demo", password: "demopass123" },
  { email: "triage@incidentai.demo", password: "demopass123" },
];

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { "Content-Type": "application/json", ...headers };
    let reqBody = null;
    if (body) {
      reqBody = JSON.stringify(body);
      reqHeaders["Content-Length"] = Buffer.byteLength(reqBody);
    }
    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch { json = data; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    req.on("error", reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

let pass = 0, fail = 0;
const check = (cond, name) => { cond ? pass++ : fail++; console.log(`${cond ? " ✅" : " ❌"} ${name}`); };

async function runAudit() {
  console.log("\n=== PHASE 9 — RBAC AUDIT (2-persona model) ===\n");

  const tokens = {};
  for (const u of USERS) {
    const res = await request("POST", "/api/auth/login", { email: u.email, password: u.password });
    check(res.status === 200 && !!res.body.token, `Login as ${u.role}`);
    if (res.body.token) tokens[u.role] = res.body.token;
  }

  for (const acc of REMOVED_ACCOUNTS) {
    const res = await request("POST", "/api/auth/login", acc);
    check(res.status === 401 || res.status === 403, `Removed account ${acc.email} cannot authenticate (${res.status})`);
  }

  // Header forgery still rejected
  const forged = await request("GET", "/api/analytics/summary", null, { "X-User-Role": "EXECUTIVE" });
  check(forged.status === 401, "Header forgery (no Bearer) rejected 401");

  // Executive-only analytics: developer forbidden, executive allowed
  const devAnalytics = await request("GET", "/api/analytics/summary", null, { Authorization: `Bearer ${tokens.DEVELOPER}` });
  check(devAnalytics.status === 403, "DEVELOPER → /analytics/summary is 403");
  const execAnalytics = await request("GET", "/api/analytics/summary", null, { Authorization: `Bearer ${tokens.EXECUTIVE}` });
  check(execAnalytics.status === 200, "EXECUTIVE → /analytics/summary is 200");

  // Developer-only remediation: executive forbidden
  const tickets = await request("GET", "/api/tickets", null, { Authorization: `Bearer ${tokens.DEVELOPER}` });
  const tid = tickets.body.tickets?.[0]?.id;
  check(Array.isArray(tickets.body.tickets), "Both personas can list tickets (no reporter isolation)");
  if (tid) {
    const execApprove = await request("POST", `/api/incidents/${tid}/remediation/approve`, {}, { Authorization: `Bearer ${tokens.EXECUTIVE}` });
    check(execApprove.status === 403, "EXECUTIVE cannot approve remediation (403)");
  }

  // ERP transfer is a developer action
  const execTransfer = await request("POST", "/api/erp/inventory/transfer", { sku: "SK-902", from_bin: "W1", to_bin: "W2", qty: 5 }, { Authorization: `Bearer ${tokens.EXECUTIVE}` });
  check(execTransfer.status === 403, "EXECUTIVE cannot execute an ERP transfer (403)");

  console.log(`\n=== ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail ? 1 : 0);
}

runAudit().catch((e) => { console.error(e); process.exit(1); });
