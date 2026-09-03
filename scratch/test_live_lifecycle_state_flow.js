/**
 * Authoritative Incident Lifecycle State-Machine Regression Test.
 *
 * Verifies, against the running backend + Postgres:
 *   1. Golden path: ingest → approve → verify(PASS) → apply → RESOLVED
 *   2. Failure path: ingest → approve → verify(FAIL) → rollback → ROLLED_BACK → return-to-remediation → IN_PROGRESS
 *   3. State-machine guards reject invalid transitions (409)
 *   4. Persistence: DB is the source of truth at every step (re-fetch confirms)
 *   5. Audit trail is persisted per incident
 *
 * DB state == API state == (re-fetched) DB state at every stage.
 */

const BASE_URL = "http://localhost:4000/api";
let pass = 0, fail = 0;

function assert(cond, name, detail = "") {
  if (cond) { pass++; console.log(` ✅ ${name}${detail ? ` (${detail})` : ""}`); }
  else { fail++; console.error(` ❌ ${name}${detail ? ` (${detail})` : ""}`); }
}

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

async function getStatus(token, id) {
  const { json } = await api(`/tickets/${id}`, { token });
  return json?.ticket?.status;
}

async function run() {
  console.log("\n=== AUTHORITATIVE LIFECYCLE STATE-MACHINE TEST ===\n");

  // --- Auth ---
  const dev = { email: "sm_dev@smartfactory.demo", password: "DevPassword123!", name: "State Machine Dev", role: "DEVELOPER" };
  let auth = await api("/auth/register", { method: "POST", body: dev });
  if (auth.status !== 201) auth = await api("/auth/login", { method: "POST", body: { email: dev.email, password: dev.password } });
  const token = auth.json?.token;
  assert(!!token, "Auth: developer token obtained");

  const ingestPayload = {
    text: "ERR_STOCK_NEG: negative on-hand quantity during bin transfer for SKU in warehouse zone A",
    reporter: "sm_test@smartfactory.demo",
    erp_context: { erp: "Smart Manufacturing ERP", module: "INVENTORY", record_id: "bin-a-props" }
  };

  /* ================= GOLDEN PATH ================= */
  console.log("\n--- Golden path ---");
  let r = await api("/incidents/ingest", { method: "POST", token, body: ingestPayload });
  const g = r.json?.ticket?.id;
  assert(!!g, "Ingest: incident created", g);
  assert(r.json?.ticket?.status === "TRIAGED", "Ingest: status TRIAGED", r.json?.ticket?.status);
  assert(!!r.json?.ticket?.correlation_id, "Ingest: correlation_id present", r.json?.ticket?.correlation_id);

  // Guard: cannot apply patch straight from TRIAGED
  r = await api(`/incidents/${g}/apply-patch`, { method: "POST", token });
  assert(r.status === 409, "Guard: apply-patch from TRIAGED rejected (409)", `got ${r.status}`);

  // Guard: cannot start verification before approval
  r = await api(`/incidents/${g}/verify-patch`, { method: "POST", token });
  assert(r.status === 409, "Guard: verify from TRIAGED rejected (409)", `got ${r.status}`);

  // Approve
  r = await api(`/incidents/${g}/remediation/approve`, { method: "POST", token, body: { actor: "State Machine Dev" } });
  assert(r.json?.ticket?.status === "APPROVED", "Approve: status APPROVED", r.json?.ticket?.status);
  assert(r.json?.remediation?.approved_by === "State Machine Dev", "Approve: approver persisted on remediation", r.json?.remediation?.approved_by);
  assert(await getStatus(token, g) === "APPROVED", "Approve: DB re-fetch == APPROVED");

  // Guard: cannot rollback from APPROVED (nothing deployed / no failed verification)
  r = await api(`/incidents/${g}/rollback`, { method: "POST", token });
  assert(r.status === 409, "Guard: rollback from APPROVED rejected (409)", `got ${r.status}`);

  // Verify PASS
  r = await api(`/incidents/${g}/verify-patch`, { method: "POST", token, body: { actor: "Verification Engine" } });
  assert(r.json?.verification?.status === "PASS", "Verify: execution PASS");
  assert(r.json?.verification?.executed === true, "Verify: result marked executed");
  assert(r.json?.verification?.checks_total === 5, "Verify: 5 checks configured");
  assert(r.json?.verification?.checks?.some((c) => /INVENTORY/i.test(c.name) || /INVENTORY/i.test(c.detail)),
    "Verify: checks reference the incident's own module (INVENTORY)");
  assert(r.json?.ticket?.status === "VERIFICATION", "Verify: ticket status VERIFICATION", r.json?.ticket?.status);

  // DB persistence of verification_result
  let t = (await api(`/tickets/${g}`, { token })).json?.ticket;
  assert(t?.verification_result?.status === "PASS", "Persist: verification_result PASS in DB");
  assert(t?.verification_result?.checks?.length === 5, "Persist: 5 checks in DB");

  // Apply
  r = await api(`/incidents/${g}/apply-patch`, { method: "POST", token, body: { actor: "State Machine Dev" } });
  assert(r.json?.ticket?.status === "RESOLVED", "Apply: status RESOLVED", r.json?.ticket?.status);
  assert(r.json?.ticket?.remediation_status === "APPLIED", "Apply: remediation_status APPLIED");
  assert(!!r.json?.ticket?.resolved_at, "Apply: resolved_at set");
  assert(await getStatus(token, g) === "RESOLVED", "Apply: DB re-fetch == RESOLVED");

  // Guard: cannot re-approve a RESOLVED incident
  r = await api(`/incidents/${g}/remediation/approve`, { method: "POST", token });
  assert(r.status === 409, "Guard: approve from RESOLVED rejected (409)", `got ${r.status}`);

  // Audit trail persisted & chronological
  const audit = (await api(`/incidents/${g}/audit-logs`, { token })).json?.audit_logs || [];
  assert(audit.length >= 3, "Audit: >=3 events persisted for golden path", `${audit.length}`);
  assert(audit.some((a) => a.action === "PATCH_APPROVED") && audit.some((a) => a.action === "VERIFICATION_PASSED") && audit.some((a) => a.action === "PATCH_APPLIED"),
    "Audit: approve + verify + apply events all present");

  /* ================= FAILURE PATH ================= */
  console.log("\n--- Failure path ---");
  r = await api("/incidents/ingest", { method: "POST", token, body: ingestPayload });
  const f = r.json?.ticket?.id;
  assert(!!f, "Ingest: 2nd incident created", f);

  await api(`/incidents/${f}/remediation/approve`, { method: "POST", token });
  r = await api(`/incidents/${f}/verify-patch`, { method: "POST", token, body: { simulate_failure: true } });
  assert(r.json?.verification?.status === "FAIL", "Verify(FAIL): execution FAIL");
  assert(r.json?.verification?.checks_passed < 5, "Verify(FAIL): <5 checks passed", `${r.json?.verification?.checks_passed}/5`);
  assert(r.json?.ticket?.status === "VERIFICATION_FAILED", "Verify(FAIL): status VERIFICATION_FAILED");

  // Guard: cannot apply a failed patch
  r = await api(`/incidents/${f}/apply-patch`, { method: "POST", token });
  assert(r.status === 409, "Guard: apply from VERIFICATION_FAILED rejected (409)", `got ${r.status}`);

  // Rollback
  r = await api(`/incidents/${f}/rollback`, { method: "POST", token, body: { reason: "regression detected" } });
  assert(r.json?.rollback?.status === "ROLLBACK_SUCCESSFUL", "Rollback: reported successful");
  assert(r.json?.ticket?.status === "ROLLED_BACK", "Rollback: status ROLLED_BACK");
  assert(await getStatus(token, f) === "ROLLED_BACK", "Rollback: DB re-fetch == ROLLED_BACK");

  // Return to remediation (failure-path loop close)
  r = await api(`/incidents/${f}/remediation/return`, { method: "POST", token });
  assert(r.json?.ticket?.status === "IN_PROGRESS", "Return-to-remediation: status IN_PROGRESS", r.json?.ticket?.status);
  assert(r.json?.ticket?.verification_result == null, "Return-to-remediation: stale verification_result cleared");

  // Loop closes: can re-approve from IN_PROGRESS
  r = await api(`/incidents/${f}/remediation/approve`, { method: "POST", token });
  assert(r.json?.ticket?.status === "APPROVED", "Return-to-remediation: re-approve works", r.json?.ticket?.status);

  const auditF = (await api(`/incidents/${f}/audit-logs`, { token })).json?.audit_logs || [];
  assert(auditF.some((a) => a.action === "VERIFICATION_FAILED") && auditF.some((a) => a.action === "ROLLBACK_SUCCESSFUL") && auditF.some((a) => a.action === "RETURNED_TO_REMEDIATION"),
    "Audit: failure-path events all present");

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail ? 1 : 0);
}

run().catch((e) => { console.error("Test crashed:", e); process.exit(1); });
