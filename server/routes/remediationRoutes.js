/**
 * Remediation, Patch, Verification, Rollback, and Integration Routes
 */

import { getIntegrations, getIntegrationById } from "../services/integrationService.js";
import { getRemediationForTicket, approveRemediation, rejectRemediation } from "../services/remediationService.js";
import { getPatchPreviewForTicket } from "../services/patchService.js";
import { runPatchVerification, applyPatch } from "../services/verificationService.js";
import { executePatchRollback } from "../services/rollbackService.js";
import { getAuditLogsForIncident, getAllAuditLogs } from "../services/auditService.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { TRIAGE_AND_DEV_ROLES, DEVELOPER_ROLES } from "../constants.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerRemediationRoutes(router) {
  // Integrations Hub
  router.get(
    "/api/integrations",
    requireAuth(async ({ res }) => {
      const data = await getIntegrations();
      sendJson(res, 200, data);
    })
  );

  router.get(
    "/api/integrations/:id",
    requireAuth(async ({ res, params }) => {
      const data = await getIntegrationById(params.id);
      if (!data) throw new ApiError(404, `Integration connector ${params.id} not found`);
      sendJson(res, 200, { connector: data });
    })
  );

  // Remediation Plan & Approval
  const handleGetRemediation = async ({ res, params }) => {
    const remediation = await getRemediationForTicket(params.id);
    if (!remediation) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { remediation });
  };
  router.get("/api/incidents/:id/remediation", requireAuth(handleGetRemediation));
  router.get("/api/tickets/:id/remediation", requireAuth(handleGetRemediation));

  const handleApproveRemediation = async ({ res, params, body, user }) => {
    const actor = user?.name || body?.actor || "Marcus Vance";
    const remediation = await approveRemediation(params.id, actor);
    if (!remediation) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { success: true, message: "Remediation approved", remediation });
  };
  router.post("/api/incidents/:id/remediation/approve", requireRole(DEVELOPER_ROLES, handleApproveRemediation));
  router.post("/api/tickets/:id/remediation/approve", requireRole(DEVELOPER_ROLES, handleApproveRemediation));

  const handleRejectRemediation = async ({ res, params, body, user }) => {
    const actor = user?.name || body?.actor || "Marcus Vance";
    const reason = body?.reason || "Developer rejected proposed remediation";
    const remediation = await rejectRemediation(params.id, reason, actor);
    if (!remediation) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { success: true, message: "Remediation rejected", remediation });
  };
  router.post("/api/incidents/:id/remediation/reject", requireRole(DEVELOPER_ROLES, handleRejectRemediation));
  router.post("/api/tickets/:id/remediation/reject", requireRole(DEVELOPER_ROLES, handleRejectRemediation));

  // Patch Preview
  const handleGetPatch = async ({ res, params }) => {
    const patchPreview = await getPatchPreviewForTicket(params.id);
    if (!patchPreview) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { patch: patchPreview });
  };
  router.get("/api/incidents/:id/patch", requireAuth(handleGetPatch));
  router.get("/api/tickets/:id/patch", requireAuth(handleGetPatch));

  // Verification Engine
  const handleVerifyPatch = async ({ res, params, body, user }) => {
    const actor = user?.name || body?.actor || "Developer (Marcus Vance)";
    const options = { ...body, actor };
    const result = await runPatchVerification(params.id, options);
    if (!result) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { success: true, verification: result });
  };
  router.post("/api/incidents/:id/verify-patch", requireRole(DEVELOPER_ROLES, handleVerifyPatch));
  router.post("/api/tickets/:id/verify-patch", requireRole(DEVELOPER_ROLES, handleVerifyPatch));

  // Apply Patch
  const handleApplyPatch = async ({ res, params, body, user }) => {
    const actor = user?.name || body?.actor || "Marcus Vance";
    const result = await applyPatch(params.id, actor);
    if (!result) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { success: true, patch_result: result });
  };
  router.post("/api/incidents/:id/apply-patch", requireRole(DEVELOPER_ROLES, handleApplyPatch));
  router.post("/api/tickets/:id/apply-patch", requireRole(DEVELOPER_ROLES, handleApplyPatch));

  // Revert / Rollback
  const handleRollback = async ({ res, params, body, user }) => {
    const actor = user?.name || body?.actor || "Marcus Vance";
    const reason = body?.reason || "Rollback after unsuccessful remediation";
    const result = await executePatchRollback(params.id, reason, actor);
    if (!result) throw new ApiError(404, `Ticket ${params.id} not found`);
    sendJson(res, 200, { success: true, rollback: result });
  };
  router.post("/api/incidents/:id/rollback", requireRole(DEVELOPER_ROLES, handleRollback));
  router.post("/api/tickets/:id/rollback", requireRole(DEVELOPER_ROLES, handleRollback));

  // Audit Logs
  const handleGetTicketAuditLogs = async ({ res, params }) => {
    const logs = await getAuditLogsForIncident(params.id);
    sendJson(res, 200, { incident_id: params.id, audit_logs: logs });
  };
  router.get("/api/incidents/:id/audit-logs", requireAuth(handleGetTicketAuditLogs));
  router.get("/api/tickets/:id/audit-logs", requireAuth(handleGetTicketAuditLogs));

  router.get(
    "/api/audit-logs",
    requireAuth(async ({ res, query }) => {
      const limit = parseInt(query.limit || "50", 10);
      const logs = await getAllAuditLogs(limit);
      sendJson(res, 200, { audit_logs: logs });
    })
  );
}
