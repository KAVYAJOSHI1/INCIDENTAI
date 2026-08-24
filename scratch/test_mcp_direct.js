import { collectMcpEvidence, performEvidenceGroundedDiagnosis } from "../server/services/diagnosisService.js";

async function testDirect() {
  const inc = {
    id: "INC-TEST-100",
    erp_module: "FINANCE",
    erp_context: { module: "FINANCE", record_id: "INV-1001" },
    vague_user_input: "Tax error on invoice"
  };

  console.log("Testing collectMcpEvidence directly...");
  const mcpRes = await collectMcpEvidence(inc, "trace-test-123");
  console.log("MCP Direct Output:", JSON.stringify(mcpRes, null, 2));

  console.log("Testing performEvidenceGroundedDiagnosis directly...");
  const diagRes = await performEvidenceGroundedDiagnosis({ incident: inc, ragKbMatches: [] });
  console.log("Diagnosis Output:", JSON.stringify(diagRes, null, 2));
}

testDirect().catch(console.error);
