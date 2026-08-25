import http from "node:http";

const BASE_URL = "http://localhost:4000";

const USERS = [
  { role: "END_USER", email: "enduser@incidentai.demo", password: "demopass123" },
  { role: "SUPPORT_TRIAGE", email: "triage@incidentai.demo", password: "demopass123" },
  { role: "DEVELOPER", email: "developer@incidentai.demo", password: "demopass123" },
  { role: "EXECUTIVE", email: "executive@incidentai.demo", password: "demopass123" },
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

    const req = http.request(
      url,
      { method, headers: reqHeaders },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );

    req.on("error", (err) => reject(err));
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

async function runAudit() {
  console.log("==================================================");
  console.log("PHASE 9 — INCIDENTAI RBAC & FUNCTION ACCESS AUDIT");
  console.log("==================================================\n");

  const tokens = {};
  for (const u of USERS) {
    const res = await request("POST", "/api/auth/login", { email: u.email, password: u.password });
    if (res.status === 200 && res.body.token) {
      tokens[u.role] = res.body.token;
      console.log(`[AUTH] Token acquired for ${u.role} (${u.email})`);
    } else {
      console.error(`[AUTH FAILED] Could not login as ${u.role}:`, res.body);
    }
  }

  console.log("\n--------------------------------------------------");
  console.log("TEST 1: HEADER FORGERY / UNAUTHENTICATED CHECK");
  console.log("--------------------------------------------------");
  const headerForgerRes = await request("GET", "/api/analytics/summary", null, {
    "X-User-Id": "usr-hacker",
    "X-User-Role": "EXECUTIVE"
  });
  console.log(`Forged Header Request (no Bearer token) status: ${headerForgerRes.status}`);
  if (headerForgerRes.status === 401) {
    console.log("✓ PASS: Header forgery rejected with 401 Unauthorized.");
  } else {
    console.error("✗ FAIL: Forged header was accepted!", headerForgerRes);
  }

  const ticketsRes = await request("GET", "/api/tickets", null, { Authorization: `Bearer ${tokens["SUPPORT_TRIAGE"]}` });
  const ticketId = ticketsRes.body.tickets?.[0]?.id || "tkt_sample";

  console.log("\n--------------------------------------------------");
  console.log("TEST 2: API ACCESS MATRIX ACROSS PERSONAS");
  console.log("--------------------------------------------------");

  const endpoints = [
    { name: "POST /api/incidents/ingest", method: "POST", path: "/api/incidents/ingest", body: {} }, // Invalid body -> 400 for authorized, 403/401 for unauthorized
    { name: "GET /api/tickets", method: "GET", path: "/api/tickets" },
    { name: `GET /api/tickets/${ticketId}`, method: "GET", path: `/api/tickets/${ticketId}` },
    { name: `PATCH /api/tickets/${ticketId}`, method: "PATCH", path: `/api/tickets/${ticketId}`, body: {} },
    { name: `POST /api/tickets/${ticketId}/verify`, method: "POST", path: `/api/tickets/${ticketId}/verify`, body: {} },
    { name: "GET /api/knowledge", method: "GET", path: "/api/knowledge" },
    { name: "POST /api/knowledge", method: "POST", path: "/api/knowledge", body: {} },
    { name: "GET /api/developers", method: "GET", path: "/api/developers" },
    { name: "POST /api/loadbalancer/route", method: "POST", path: "/api/loadbalancer/route", body: {} },
    { name: "POST /api/loadbalancer/rebalance", method: "POST", path: "/api/loadbalancer/rebalance" },
    { name: "GET /api/analytics/summary", method: "GET", path: "/api/analytics/summary" },
    { name: `GET /api/analytics/pipeline/${ticketId}`, method: "GET", path: `/api/analytics/pipeline/${ticketId}` },
    { name: "POST /api/copilot/chat", method: "POST", path: "/api/copilot/chat", body: {} },
    { name: "GET /api/digital-twin", method: "GET", path: "/api/digital-twin" },
    { name: "GET /api/warroom", method: "GET", path: "/api/warroom" },
    { name: "GET /api/mission-control", method: "GET", path: "/api/mission-control" }
  ];

  const results = {};

  for (const ep of endpoints) {
    results[ep.name] = {};
    for (const u of USERS) {
      const res = await request(ep.method, ep.path, ep.body, { Authorization: `Bearer ${tokens[u.role]}` });
      // Map 400 (validation error) to "AUTH_OK" (authorized to hit endpoint)
      let statusStr = String(res.status);
      if (res.status === 200 || res.status === 201) statusStr = "200/201 OK";
      else if (res.status === 400) statusStr = "ALLOWED (400 Bad Input)";
      else if (res.status === 403) statusStr = "403 FORBIDDEN";
      else if (res.status === 401) statusStr = "401 UNAUTHORIZED";
      else if (res.status === 404) statusStr = "ALLOWED (404 Not Found)";
      results[ep.name][u.role] = statusStr;
    }
  }

  console.table(results);

  console.log("\n--------------------------------------------------");
  console.log("TEST 3: END_USER DATA ISOLATION");
  console.log("--------------------------------------------------");
  const endUserTickets = await request("GET", "/api/tickets", null, { Authorization: `Bearer ${tokens["END_USER"]}` });
  const staffTickets = await request("GET", "/api/tickets", null, { Authorization: `Bearer ${tokens["SUPPORT_TRIAGE"]}` });
  console.log(`END_USER ticket count returned: ${endUserTickets.body.tickets?.length ?? 0}`);
  console.log(`SUPPORT_TRIAGE ticket count returned: ${staffTickets.body.tickets?.length ?? 0}`);

  console.log("\n==================================================");
  console.log("AUDIT SUMMARY COMPLETED SUCCESSFULLY");
  console.log("==================================================");
}

runAudit().catch(console.error);
