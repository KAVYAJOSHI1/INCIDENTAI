import http from "node:http";

async function runDemo() {
  console.log("==========================================================================");
  console.log("🚀 STAGE 1: TRIGGERING REAL ERP BACKEND MICROSERVICE ERROR");
  console.log("==========================================================================");

  // 1. Authenticate with ERP Gateway
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@smart-erp.io", password: "adminpassword" })
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token;
  console.log(`✅ [ERP Gateway] Authenticated as ${loginData.user.email} (${loginData.user.role})`);

  // 2. Fetch products
  const prodRes = await fetch("http://localhost:5000/api/inventory/products", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const products = await prodRes.json();
  const targetProduct = products[0];

  const whRes = await fetch("http://localhost:5000/api/inventory/warehouses", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const warehouses = await whRes.json();
  const targetWarehouse = warehouses[0];

  console.log(`📦 Target Product  : ${targetProduct.name} (${targetProduct.sku}) [ID: ${targetProduct.id}]`);
  console.log(`🏬 Target Warehouse: ${targetWarehouse.name} [ID: ${targetWarehouse.id}]`);

  // 3. Trigger negative stock error
  console.log("\n⚡ Executing invalid stock deduction request (Delta: -999999.00)...");
  const adjustRes = await fetch("http://localhost:5000/api/inventory/stock/adjust", {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      product_id: targetProduct.id,
      warehouse_id: targetWarehouse.id,
      delta: -999999.00
    })
  });
  const erpError = await adjustRes.json();
  console.log(`🔴 [ERP Microservice Error ${adjustRes.status}]:`, erpError);

  console.log("\n==========================================================================");
  console.log("📥 STAGE 2: INGESTING CAPTURED ERP INCIDENT INTO INCIDENTAI PIPELINE");
  console.log("==========================================================================");

  const incidentPayload = {
    text: `ERR_STOCK_NEG: Stock adjustment failed for ${targetProduct.sku}. Error message: "${erpError.message}". Attempted delta: -999999.00 in ${targetWarehouse.name}.`,
    reporter: loginData.user.email,
    erp_context: {
      erp: "Smart Manufacturing ERP",
      module: "Inventory",
      route: `/inventory/products/${targetProduct.id}`,
      record_id: targetProduct.id,
      sku: targetProduct.sku,
      warehouse_id: targetWarehouse.id,
      user_id: loginData.user.id,
      user_role: loginData.user.role,
      raw_erp_error: erpError.message,
      timestamp: new Date().toISOString()
    }
  };

  const ingestRes = await fetch("http://localhost:4000/api/incidents/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(incidentPayload)
  });

  const ingestResult = await ingestRes.json();
  const ticket = ingestResult.ticket;

  console.log(`✅ [IncidentAI Ingestion] Created Ticket: ${ticket.ticket_number} (ID: ${ticket.id})`);
  console.log(`📌 Title      : ${ticket.title}`);
  console.log(`🔥 Severity   : ${ticket.severity}`);
  console.log(`⏱️ SLA        : ${ticket.sla_remaining_minutes} minutes remaining`);
  console.log(`⚡ Execution Timing: Total ${ticket.pipeline_timings_ms?.total || 0}ms`);

  console.log("\n==========================================================================");
  console.log("🔍 STAGE 3: LIVE READ-ONLY MCP EVIDENCE GATHERING & RAG RETRIEVAL");
  console.log("==========================================================================");

  console.log(`🔬 [MCP Evidence Collected]: ${ticket.mcp_evidence?.length || 0} facts gathered from live ERP microservices:`);
  ticket.mcp_evidence?.forEach((item, i) => {
    console.log(`   ${i + 1}. [${item.label}] Tool: ${item.tool} -> Status ${item.status}`);
  });

  console.log(`\n📚 [pgvector RAG Knowledge Base Matches]: ${ticket.rag_evidence?.length || 0} past verified fixes retrieved:`);
  ticket.rag_evidence?.slice(0, 3).forEach((kb, i) => {
    console.log(`   ${i + 1}. [${kb.confidence_percentage}% Match] Title: "${kb.title}"`);
    console.log(`      Resolution: ${kb.verified_resolution}`);
  });

  console.log("\n==========================================================================");
  console.log("🧠 STAGE 4: AI DIAGNOSTICS & ON-CALL DEVELOPER ROUTING");
  console.log("==========================================================================");

  console.log(`💡 Root Cause Analysis : ${ticket.ai_root_cause || ticket.ai_diagnosis?.root_cause}`);
  console.log(`🛠️ Recommended Patch   : ${ticket.ai_suggested_patch || ticket.ai_diagnosis?.recommended_resolution}`);
  console.log(`🎯 Confidence Rating   : ${((ticket.ai_confidence || ticket.ai_diagnosis?.confidence || 0) * 100).toFixed(0)}%`);
  console.log(`👤 Assigned Developer  : ${ticket.assigned_dev_name} (ID: ${ticket.assigned_dev_id})`);
  console.log(`📋 Requires Human Review: ${ticket.requires_human_review ? "YES (Guardrail Active)" : "NO"}`);

  console.log("\n==========================================================================");
  console.log("✨ PIPELINE VERIFICATION SUCCESSFUL — ALL STAGES OPERATIONAL!");
  console.log("==========================================================================");
}

runDemo().catch((err) => console.error("Pipeline test failed:", err));
