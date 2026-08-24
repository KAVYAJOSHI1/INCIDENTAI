/**
 * Comprehensive Verification Suite for Phase 4/5 MCP Tools.
 * Tests all 7 verified read-only MCP tools against the running ERP API Gateway (http://localhost:5000).
 */

import { executeMcpToolDirect } from "../server/mcp/erpMcpServer.js";

const TOOLS_TO_TEST = [
  { name: "get_service_health", args: {} },
  { name: "get_invoice", args: { id: "INV-1001" } },
  { name: "get_inventory", args: {} },
  { name: "get_product", args: {} },
  { name: "get_purchase_order", args: {} },
  { name: "get_production_order", args: {} },
  { name: "get_transaction", args: {} }
];

async function runMcpVerification() {
  console.log("==========================================================================");
  console.log("  INCIDENT AI — PHASE 4/5 MCP READ-ONLY TOOLS E2E VERIFICATION SUITE");
  console.log("==========================================================================\n");

  const results = [];

  for (const tool of TOOLS_TO_TEST) {
    const correlationId = `test-mcp-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    console.log(`[TESTING TOOL] ${tool.name} (Correlation ID: ${correlationId})...`);

    const res = await executeMcpToolDirect(tool.name, tool.args, correlationId);
    
    const isSuccess = res.status === 200;
    results.push({
      tool: tool.name,
      status: res.status,
      correlationId: res.correlationId,
      success: isSuccess,
      dataSnippet: isSuccess ? JSON.stringify(res.data).slice(0, 150) : res.error
    });

    console.log(`  └─ Status: ${res.status} | Correlation ID: ${res.correlationId}`);
    if (isSuccess) {
      console.log(`  └─ REAL ERP Data Received: ${JSON.stringify(res.data).slice(0, 120)}...`);
    } else {
      console.log(`  └─ Error: ${res.error}`);
    }
    console.log("");
  }

  console.log("==========================================================================");
  console.log("  VERIFICATION SUMMARY MATRIX");
  console.log("==========================================================================");
  console.table(results);

  const totalPassed = results.filter(r => r.success).length;
  console.log(`\nPassed: ${totalPassed} / ${results.length} MCP Tools successfully fetched REAL ERP data through Gateway.`);
}

runMcpVerification().catch(console.error);
