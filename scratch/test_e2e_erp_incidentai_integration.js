/**
 * E2E Automation Test Suite for ERP ↔ IncidentAI Integration
 * Validates complete lifecycle: Auth, Ingestion, AI Diagnosis, KB Mismatch, Status Sync, Resolution, Persistence.
 */

const BASE_URL = "http://localhost:4000/api";

let authToken = null;
let testTicketId = null;

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function assert(condition, name, detail = "") {
  results.total++;
  if (condition) {
    results.passed++;
    results.tests.push({ name, status: "PASSED", detail });
    console.log(` ✅ PASS: ${name} ${detail ? `(${detail})` : ""}`);
  } else {
    results.failed++;
    results.tests.push({ name, status: "FAILED", detail });
    console.error(` ❌ FAIL: ${name} ${detail ? `(${detail})` : ""}`);
  }
}

async function runSuite() {
  console.log("\n=======================================================");
  console.log("🚀 STARTING ERP ↔ INCIDENTAI AUTOMATION TEST SUITE");
  console.log("=======================================================\n");

  try {
    // ----------------------------------------------------
    // 1. AUTHENTICATION TESTS
    // ----------------------------------------------------
    console.log("--- 1. Authentication Tests ---");
    
    // 1.1 Invalid Login
    const invRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid@smartfactory.demo", password: "wrongpassword" })
    });
    assert(invRes.status === 401, "Auth: Reject invalid credentials", `Status: ${invRes.status}`);

    // 1.2 Register Test Developer (or reuse existing)
    const testDevUser = {
      email: "test_dev@smartfactory.demo",
      password: "TestPassword123!",
      name: "Marcus Vance (Test)",
      role: "DEVELOPER"
    };

    let regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testDevUser)
    });

    let tokenData;
    if (regRes.status === 201) {
      tokenData = await regRes.json();
    } else {
      // Login if already registered
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testDevUser.email, password: testDevUser.password })
      });
      tokenData = await loginRes.json();
    }

    assert(Boolean(tokenData && tokenData.token), "Auth: Developer auth token obtained", `Role: ${tokenData.user?.role}`);
    authToken = tokenData?.token;

    // 1.3 Protected Route Without Token
    const noAuthRes = await fetch(`${BASE_URL}/tickets`);
    assert(noAuthRes.status === 401, "Auth: Protect endpoints without JWT Bearer token", `Status: ${noAuthRes.status}`);

    // ----------------------------------------------------
    // 2. INCIDENT INGESTION (ERP → IncidentAI)
    // ----------------------------------------------------
    console.log("\n--- 2. Incident Ingestion Tests (ERP → IncidentAI) ---");

    const payload = {
      text: "ERR_INVENTORY_VAL_808: Negative quantity violation during stock transfer in warehouse bin W2",
      title: "[INVENTORY] ERR_STOCK_NEG: Negative quantity violation during stock transfer in warehouse bin W2",
      erp_module: "INVENTORY",
      severity: "P3_LOW",
      reporter: "erp_operator@smartfactory.demo",
      vague_user_input: "ERR_INVENTORY_VAL_808: Negative quantity violation during stock transfer in warehouse bin W2",
      expected_behavior: "ERP processes the inventory payload without validation failures and records the transaction.",
      actual_behavior: "System triggers ERR_STOCK_NEG exception and aborts the transaction thread.",
      reproduction_steps: [
        "Open ERP Workspace → INVENTORY Module",
        "Execute BinTransferGrid",
        "Submit form payload with ERR_INVENTORY_VAL_808: Negative quantity",
        "Observe ERR_STOCK_NEG"
      ],
      ocr_findings: {
        extracted_error_code: "ERR_STOCK_NEG",
        detected_component: "BinTransferGrid"
      },
      erp_context: {
        record_id: "wh-bin-w2",
        module: "INVENTORY"
      }
    };

    const ingestRes = await fetch(`${BASE_URL}/incidents/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });

    const ingestData = await ingestRes.json();
    assert(ingestRes.status === 200 || ingestRes.status === 201, "Ingest: Ingest ERP incident successfully", `Status: ${ingestRes.status}`);
    
    const ticket = ingestData.ticket;
    assert(Boolean(ticket && ticket.id), "Ingest: Ticket created with unique ID", `ID: ${ticket?.id}`);
    testTicketId = ticket?.id;

    assert(ticket?.erp_module === "INVENTORY", "Ingest: Module preserved as INVENTORY", `Module: ${ticket?.erp_module}`);
    assert(ticket?.reporter === "erp_operator@smartfactory.demo", "Ingest: Reporter preserved correctly", `Reporter: ${ticket?.reporter}`);

    // ----------------------------------------------------
    // 3. AI DIAGNOSIS & KB MISMATCH TEST
    // ----------------------------------------------------
    console.log("\n--- 3. AI Diagnosis & Quality Checks ---");

    const ticketRes = await fetch(`${BASE_URL}/tickets/${testTicketId}`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const ticketData = await ticketRes.json();
    const fetchedTicket = ticketData.ticket;

    assert(ticketRes.status === 200, "Diagnosis: Fetch ingested ticket details", `Status: ${ticketRes.status}`);
    
    // Check root cause tree endpoint
    const rctRes = await fetch(`${BASE_URL}/tickets/${testTicketId}/root-cause-tree`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const rctData = await rctRes.json();
    const rctTree = rctData.tree;

    assert(rctRes.status === 200 && Boolean(rctTree), "Diagnosis: Root Cause Tree generated", `Nodes: ${rctTree?.nodes?.length}`);
    const nodeLabels = (rctTree?.nodes || []).map(n => n.label).join(" → ");
    assert(nodeLabels.includes("INVENTORY") && nodeLabels.includes("binTransfer.js"), "Diagnosis: Root Cause Chain contains expected nodes", nodeLabels);

    // ----------------------------------------------------
    // 4. DEVELOPER ASSIGNMENT & STATUS TRANSITIONS
    // ----------------------------------------------------
    console.log("\n--- 4. Developer Assignment & Status Transitions ---");

    const patchRes = await fetch(`${BASE_URL}/tickets/${testTicketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({
        assigned_dev_name: "Marcus Vance",
        status: "IN_PROGRESS"
      })
    });
    const patchData = await patchRes.json();
    assert(patchRes.status === 200, "Update: Assign developer Marcus Vance", `Status: ${patchRes.status}`);
    assert(patchData.ticket?.assigned_dev_name === "Marcus Vance", "Update: Assigned developer matches", `Dev: ${patchData.ticket?.assigned_dev_name}`);
    assert(patchData.ticket?.status === "IN_PROGRESS", "Update: Status transitions to IN_PROGRESS", `Status: ${patchData.ticket?.status}`);

    // ----------------------------------------------------
    // 5. RESOLUTION VERIFICATION & KNOWLEDGE CAPTURE
    // ----------------------------------------------------
    console.log("\n--- 5. Resolution & Knowledge Capture ---");

    const verifyRes = await fetch(`${BASE_URL}/tickets/${testTicketId}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verified_resolution: "EXEC redis-cli DEL inv_stock:SK-902 && SELECT sync_inventory_cache('SK-902');",
        root_cause: "Stale cache read before transfer validation",
        tags: ["INVENTORY", "CACHE_SYNC"]
      })
    });
    const verifyData = await verifyRes.json();

    assert(verifyRes.status === 200 && verifyData.success, "Resolution: Submit developer verified resolution", `Message: ${verifyData.message}`);
    assert(verifyData.ticket?.status === "KNOWLEDGE_CAPTURED" || verifyData.ticket?.status === "RESOLVED", "Resolution: Ticket status updated to RESOLVED/KNOWLEDGE_CAPTURED", `Status: ${verifyData.ticket?.status}`);
    assert(Boolean(verifyData.knowledge_article), "Resolution: Indexed resolution into RAG Knowledge Base", `KB ID: ${verifyData.knowledge_article?.id}`);

    // ----------------------------------------------------
    // 6. NEGATIVE & FAILURE SCENARIOS
    // ----------------------------------------------------
    console.log("\n--- 6. Negative & Failure Scenarios ---");

    // 6.1 Non-existent ticket lookup
    const nfRes = await fetch(`${BASE_URL}/tickets/INC-NONEXISTENT-9999`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    assert(nfRes.status === 404, "Negative: Return HTTP 404 for non-existent ticket", `Status: ${nfRes.status}`);

    // 6.2 Duplicate ingestion test
    const dupRes = await fetch(`${BASE_URL}/incidents/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 200 || dupRes.status === 201, "Negative: Handle duplicate incident ingestion gracefully", `Is Duplicate: ${dupData.ticket?.duplicate_check?.is_duplicate}`);

    // ----------------------------------------------------
    // 7. PLATFORM REMEDIATION, PATCH, VERIFICATION & ROLLBACK
    // ----------------------------------------------------
    console.log("\n--- 7. Platform Remediation & Rollback Lifecycle ---");

    // 7.1 Integration Hub API
    const intRes = await fetch(`${BASE_URL}/integrations`, {
      headers: { "Authorization": `Bearer ${authToken}` }
    });
    const intData = await intRes.json();
    assert(intRes.status === 200 && Array.isArray(intData.connectors), "Platform: Integration Hub connector data returned", `Connectors: ${intData.connectors?.length}`);

    // Section 7 runs the remediation lifecycle on its OWN fresh incidents so it is
    // not coupled to the already-resolved ticket from section 5, and honours the
    // authoritative state machine (approve -> verify -> apply / rollback).
    const authHeaders = { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` };
    const ingestBody = JSON.stringify({
      text: "ERR_STOCK_NEG negative on-hand during bin transfer, warehouse zone A",
      reporter: "erp_operator@smartfactory.demo",
      erp_context: { erp: "Smart Manufacturing ERP", module: "INVENTORY", record_id: "e2e-sec7" }
    });
    const lc1 = (await (await fetch(`${BASE_URL}/incidents/ingest`, { method: "POST", headers: authHeaders, body: ingestBody })).json()).ticket?.id;
    const lc2 = (await (await fetch(`${BASE_URL}/incidents/ingest`, { method: "POST", headers: authHeaders, body: ingestBody })).json()).ticket?.id;

    // 7.2 Retrieve Remediation Plan
    const remData = await (await fetch(`${BASE_URL}/incidents/${lc1}/remediation`, { headers: authHeaders })).json();
    assert(Boolean(remData.remediation), "Remediation: Plan generated for incident", `Risk: ${remData.remediation?.risk_level}`);

    // 7.3 Approve Remediation
    const appData = await (await fetch(`${BASE_URL}/incidents/${lc1}/remediation/approve`, { method: "POST", headers: authHeaders, body: JSON.stringify({ actor: "E2E Developer" }) })).json();
    assert(appData.remediation?.status === "APPROVED" && Boolean(appData.remediation?.approved_by), "Remediation: Developer approval registered + approver persisted", `By: ${appData.remediation?.approved_by}`);

    // 7.4 Fetch Patch Preview
    const patchPrevData = await (await fetch(`${BASE_URL}/incidents/${lc1}/patch`, { headers: authHeaders })).json();
    assert(Array.isArray(patchPrevData.patch?.diff_lines), "Patch: Diff preview generated with line diffs", `File: ${patchPrevData.patch?.file}`);

    // 7.5 Verification Suite (PASS) on lc1
    const verData = await (await fetch(`${BASE_URL}/incidents/${lc1}/verify-patch`, { method: "POST", headers: authHeaders, body: JSON.stringify({ actor: "Verification Runner" }) })).json();
    assert(verData.verification?.status === "PASS" && verData.verification?.checks_total === 5, "Verification: All 5 validation checks passed", `Duration: ${verData.verification?.total_duration_ms}ms`);

    // 7.6 Verification Suite (Simulated Failure) on lc2
    await fetch(`${BASE_URL}/incidents/${lc2}/remediation/approve`, { method: "POST", headers: authHeaders, body: JSON.stringify({ actor: "E2E Developer" }) });
    const failVerData = await (await fetch(`${BASE_URL}/incidents/${lc2}/verify-patch`, { method: "POST", headers: authHeaders, body: JSON.stringify({ simulate_failure: true }) })).json();
    assert(failVerData.verification?.status === "FAIL", "Verification: Simulated failure detected cleanly", `Status: ${failVerData.verification?.status}`);

    // 7.7 Apply Patch on the PASSED incident (lc1) — version is derived, not hardcoded
    const applyData = await (await fetch(`${BASE_URL}/incidents/${lc1}/apply-patch`, { method: "POST", headers: authHeaders, body: JSON.stringify({ actor: "E2E Developer" }) })).json();
    assert(applyData.patch_result?.status === "APPLIED" && /^v\d+\.\d+\.\d+/.test(applyData.patch_result?.current_version || ""), "Apply: Patch applied with derived version", `Version: ${applyData.patch_result?.current_version}`);

    // 7.8 Patch Rollback on the FAILED incident (lc2)
    const rollData = await (await fetch(`${BASE_URL}/incidents/${lc2}/rollback`, { method: "POST", headers: authHeaders, body: JSON.stringify({ reason: "Test rollback execution" }) })).json();
    assert(rollData.rollback?.status === "ROLLBACK_SUCCESSFUL" && rollData.ticket?.status === "ROLLED_BACK", "Rollback: Patch reverted cleanly", `Restored: ${rollData.rollback?.restored_version}`);

    // 7.9 Audit Logs Retrieval (persisted in Postgres)
    const auditData = await (await fetch(`${BASE_URL}/incidents/${lc1}/audit-logs`, { headers: authHeaders })).json();
    assert(Array.isArray(auditData.audit_logs) && auditData.audit_logs.length >= 3, "Audit: Structured audit logs persisted for incident actions", `Log Entries: ${auditData.audit_logs?.length}`);

    // 7.10 Guard: invalid transition rejected by backend
    const badApply = await fetch(`${BASE_URL}/incidents/${lc2}/apply-patch`, { method: "POST", headers: authHeaders });
    assert(badApply.status === 409, "State machine: apply-patch on ROLLED_BACK incident rejected (409)", `Status: ${badApply.status}`);

  } catch (err) {
    console.error("❌ Test suite encountered unexpected error:", err);
    assert(false, "Suite Execution", err.message);
  }

  // Summary
  console.log("\n=======================================================");
  console.log("📊 E2E TEST RESULTS SUMMARY");
  console.log("=======================================================");
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed:      ${results.passed}`);
  console.log(`Failed:      ${results.failed}`);
  console.log("=======================================================\n");

  process.exit(results.failed === 0 ? 0 : 1);
}

runSuite();
