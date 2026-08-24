/**
 * End-to-End Test Suite for Phase 6: RAG + MCP + LLM Evidence-Grounded Incident Diagnosis.
 * Tests 4 incident scenarios across Finance, Inventory, Procurement, and Production.
 */

import "../server/utils/loadEnv.js";
import { runIncidentIngestPipeline } from "../server/services/ticketService.js";

const TEST_SCENARIOS = [
  {
    name: "Finance Incident: Invoice Tax & Ledger Exception",
    payload: {
      text: "Invoice INV-1001 cannot be posted due to tax rate mismatch on financial ledger.",
      reporter: "finance_user@company.com",
      erp_context: {
        erp: "Smart Manufacturing ERP",
        module: "FINANCE",
        route: "/finance/invoices",
        record_id: "INV-1001"
      }
    }
  },
  {
    name: "Inventory Incident: Stock Discrepancy & Negative Balance",
    payload: {
      text: "Stock count for Lithium-Ion Battery Cell shows negative count -15 in Warehouse W-1.",
      reporter: "warehouse_sup@company.com",
      erp_context: {
        erp: "Smart Manufacturing ERP",
        module: "INVENTORY",
        route: "/inventory/stock",
        record_id: "PROD-LITH-001"
      }
    }
  },
  {
    name: "Procurement Incident: Purchase Order Vendor Verification",
    payload: {
      text: "Purchase order PO-1001 approval blocked due to missing vendor tax profile.",
      reporter: "purchasing_agent@company.com",
      erp_context: {
        erp: "Smart Manufacturing ERP",
        module: "PROCUREMENT",
        route: "/procurement/po",
        record_id: "PO-1001"
      }
    }
  },
  {
    name: "Production Incident: Shop Floor Assembly Line Stoppage",
    payload: {
      text: "Shop floor assembly line 2 stopped due to BOM component allocation error.",
      reporter: "shop_floor_sup@company.com",
      erp_context: {
        erp: "Smart Manufacturing ERP",
        module: "PRODUCTION",
        route: "/production/runs",
        record_id: "RUN-904"
      }
    }
  }
];

async function runPhase6TestSuite() {
  console.log("==========================================================================");
  console.log("  PHASE 6: RAG + MCP + LLM EVIDENCE-GROUNDED DIAGNOSIS E2E SUITE");
  console.log("==========================================================================\n");

  for (const sc of TEST_SCENARIOS) {
    console.log(`--------------------------------------------------------------------------`);
    console.log(`▶ RUNNING SCENARIO: ${sc.name}`);
    console.log(`--------------------------------------------------------------------------`);

    const ticket = await runIncidentIngestPipeline(sc.payload);

    console.log(`✓ Ticket Generated: ${ticket.ticket_number} (ID: ${ticket.id})`);
    console.log(`✓ ERP Module: ${ticket.erp_module} | Severity: ${ticket.severity}`);
    console.log(`✓ Resolution Type: ${ticket.resolution_type || ticket.ai_diagnosis?.resolution_type} | Status: ${ticket.status}`);
    console.log(`✓ Correlation ID: ${ticket.correlation_id}`);
    console.log(`\n  🟢 [LIVE ERP FACTS (MCP Executed Tools)]`);
    if (ticket.mcp_evidence && ticket.mcp_evidence.length > 0) {
      ticket.mcp_evidence.forEach((m) => {
        console.log(`     - Tool: ${m.tool} | Status: ${m.status} | Label: ${m.label}`);
      });
    } else {
      console.log(`     - NONE / LIVE ERP VERIFICATION UNAVAILABLE`);
    }

    console.log(`\n  🔵 [HISTORICAL KNOWLEDGE (RAG Matches)]`);
    if (ticket.rag_evidence && ticket.rag_evidence.length > 0) {
      ticket.rag_evidence.forEach((r) => {
        console.log(`     - Match: "${r.title}" (${r.confidence_percentage}% match) | Verified: ${r.is_verified}`);
      });
    } else {
      console.log(`     - No high-confidence historical matches found.`);
    }

    console.log(`\n  🟣 [AI INFERENCE & DIAGNOSIS]`);
    console.log(`     - Root Cause: ${ticket.ai_root_cause}`);
    console.log(`     - Suggested Resolution: ${ticket.ai_suggested_patch}`);
    console.log(`     - Confidence: ${Math.round(ticket.ai_confidence * 100)}%`);
    console.log(`     - Human Review Required: ${ticket.requires_human_review ?? ticket.ai_diagnosis?.requires_human_review}`);
    console.log(`\n`);
  }

  console.log("==========================================================================");
  console.log("  PHASE 6 E2E SUITE COMPLETED SUCCESSFULLY");
  console.log("==========================================================================");
}

runPhase6TestSuite().catch(console.error);
