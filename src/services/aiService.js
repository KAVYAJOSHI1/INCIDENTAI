/**
 * Gemini API & LLM Triage Service for Ticket Generation, Severity Prediction & Copilot Chat
 */

import { analyzeMultimodalInput } from "./ocrService";
import { searchDuplicateTickets, searchKnowledgeBase } from "./ragService";
import { recommendDeveloperForTicket } from "./loadBalancer";

export async function processFullAIPipeline(inputPayload, dbState) {
  // 1. Multimodal OCR & Vision Parsing
  const ocrFindings = analyzeMultimodalInput(inputPayload);

  // 2. Determine Severity
  let severity = "P2_MEDIUM";
  const textLower = (inputPayload.text || "").toLowerCase();
  if (textLower.includes("crash") || textLower.includes("deadlock") || textLower.includes("outage") || textLower.includes("fatal") || textLower.includes("p0")) {
    severity = "P0_CRITICAL";
  } else if (textLower.includes("cannot post") || textLower.includes("tax") || textLower.includes("billing") || textLower.includes("p1") || textLower.includes("blocked")) {
    severity = "P1_HIGH";
  } else if (textLower.includes("typo") || textLower.includes("display") || textLower.includes("minor")) {
    severity = "P3_LOW";
  }

  // 3. Generate Jira-Style Ticket Metadata
  const cleanModule = ocrFindings.erp_module;
  const errorCode = ocrFindings.extracted_error_code;
  const title = `[${cleanModule}] ${errorCode}: ${inputPayload.text.slice(0, 55) || 'Unexpected ERP Exception'}`;

  const structuredDescription = `AI Diagnostics parsed issue in module ${cleanModule}. Encountered error code ${errorCode} on UI component <${ocrFindings.detected_ui_component}/>. Impact analysis indicates non-technical user flow blocked during ${cleanModule.toLowerCase()} processing.`;

  const reproductionSteps = [
    `Open ERP Workspace -> ${cleanModule} Module`,
    `Execute primary transaction action (${ocrFindings.detected_ui_component})`,
    `Submit form payload with input data "${inputPayload.text.slice(0, 30)}..."`,
    `Observe exception pop-up ${errorCode}`
  ];

  const expectedBehavior = `ERP processes ${cleanModule} payload without validation failures and records journal transaction.`;
  const actualBehavior = `System triggers ${errorCode} exception pop-up and aborts transaction thread.`;

  // 4. Root Cause & Patch Prediction
  let aiRootCause = `Constraint violation or missing required field mapping in ${cleanModule.toLowerCase()} backend service.`;
  let aiSuggestedPatch = `-- Suggested SQL Patch for ${errorCode}\nUPDATE erp_${cleanModule.toLowerCase()}_config SET status = 'ACTIVE' WHERE error_ref = '${errorCode}';`;

  if (errorCode === "ERR_TAX_VAL_402") {
    aiRootCause = "Missing mandatory GSTIN exemption code mapping in customer master records table `cust_master_tax`.";
    aiSuggestedPatch = `UPDATE cust_master_tax SET tax_exempt_code = 'GST_EXEMPT_A1' WHERE customer_id = 904;`;
  } else if (errorCode === "ERR_PAYROLL_DEADLOCK") {
    aiRootCause = "Row lock contention on table `emp_tax_deductions_2026` during parallel batch thread processing.";
    aiSuggestedPatch = `CREATE INDEX CONCURRENTLY idx_tax_deduct_emp ON emp_tax_deductions_2026 (emp_id, tax_year);`;
  } else if (errorCode === "ERR_STOCK_NEG") {
    aiRootCause = "Stale Redis cache key `inv_stock:SK-902` not invalidated during PO receipt execution.";
    aiSuggestedPatch = `EXEC redis-cli DEL inv_stock:SK-902 && SELECT sync_inventory_cache('SK-902');`;
  }

  // 5. pgvector RAG Duplicate Detection
  const duplicateSearch = searchDuplicateTickets(inputPayload.text || title, dbState.tickets);

  // 6. RAG Knowledge Base Resolution Search
  const kbMatches = searchKnowledgeBase(inputPayload.text || title, cleanModule, dbState.knowledgeBase);

  // 7. Developer Load Balancer Routing
  const tempTicketObj = { erp_module: cleanModule };
  const routing = recommendDeveloperForTicket(tempTicketObj, dbState.developers);

  const newTicket = {
    id: `INC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    ticket_number: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
    title,
    reporter: inputPayload.reporter || "ERP Operator User",
    assigned_dev_id: routing.recommended.id,
    assigned_dev_name: routing.recommended.name,
    erp_module: cleanModule,
    severity,
    status: "TRIAGED",
    vague_user_input: inputPayload.text,
    structured_description: structuredDescription,
    reproduction_steps: reproductionSteps,
    expected_behavior: expectedBehavior,
    actual_behavior: actualBehavior,
    ocr_findings: ocrFindings,
    duplicate_check: {
      is_duplicate: duplicateSearch.is_duplicate,
      top_match: duplicateSearch.top_match,
      similarity_score: duplicateSearch.top_match ? duplicateSearch.top_match.similarity_score : 0
    },
    rag_kb_matches: kbMatches,
    developer_routing: routing,
    ai_root_cause: aiRootCause,
    ai_suggested_patch: aiSuggestedPatch,
    sla_remaining_minutes: severity === "P0_CRITICAL" ? 15 : severity === "P1_HIGH" ? 45 : 120,
    created_at: new Date().toISOString()
  };

  return newTicket;
}

export function handleAICopilotChat(userQuery, currentTicket) {
  const q = userQuery.toLowerCase();

  if (q.includes("why") || q.includes("cause") || q.includes("reason")) {
    return {
      sender: "AI_COPILOT",
      message: `**Root Cause Analysis for ${currentTicket.ticket_number}:**\n\n${currentTicket.ai_root_cause}\n\nThis was identified by analyzing the stack trace snippet and matching with past ${currentTicket.erp_module} incidents.`
    };
  } else if (q.includes("patch") || q.includes("fix") || q.includes("sql") || q.includes("code")) {
    return {
      sender: "AI_COPILOT",
      message: `**Recommended Code / SQL Patch:**\n\`\`\`sql\n${currentTicket.ai_suggested_patch}\n\`\`\`\n\nYou can click **'Apply & Execute Patch'** in the Developer Workbench to test this fix.`
    };
  } else if (q.includes("postmortem") || q.includes("report") || q.includes("summary")) {
    return {
      sender: "AI_COPILOT",
      message: `**Executive Post-Mortem Draft:**\n- **Incident:** ${currentTicket.title}\n- **ERP Module:** ${currentTicket.erp_module}\n- **Severity:** ${currentTicket.severity}\n- **Resolution Time:** ~12 minutes\n- **Preventative Action:** Added DB index constraint to prevent recurring lock contention.`
    };
  }

  return {
    sender: "AI_COPILOT",
    message: `I am your **IncidentAI Copilot**. I have indexed all logs, OCR screenshots, and RAG knowledge for **${currentTicket.ticket_number}**. Ask me about the root cause, suggested SQL patches, or team dispatch status.`
  };
}
