/**
 * Embedded Smart Manufacturing ERP routes.
 *
 * GET  /api/erp/inventory          — live, DB-backed bin stock
 * GET  /api/erp/master-data        — seeded display data (orders / telemetry / procurement)
 * GET  /api/erp/transactions       — recent ERP transaction log (DB-backed)
 * POST /api/erp/inventory/transfer — REAL bin transfer: validates against live stock,
 *                                    mutates the DB or rejects + ingests a persisted incident
 */

import { getInventorySnapshot, executeBinTransfer } from "../services/erpInventoryService.js";
import { getErpMasterData } from "../services/erpMasterData.js";
import { listErpTransactions } from "../db/store.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { DEVELOPER_ROLES } from "../constants.js";
import { sendJson } from "../utils/http.js";

export function registerErpRoutes(router) {
  router.get(
    "/api/erp/inventory",
    requireAuth(async ({ res }) => sendJson(res, 200, await getInventorySnapshot()))
  );

  router.get(
    "/api/erp/master-data",
    requireAuth(async ({ res }) => sendJson(res, 200, getErpMasterData()))
  );

  router.get(
    "/api/erp/transactions",
    requireAuth(async ({ res, query }) => {
      const limit = Math.min(100, parseInt(query.limit || "25", 10));
      sendJson(res, 200, { transactions: await listErpTransactions(limit) });
    })
  );

  router.post(
    "/api/erp/inventory/transfer",
    requireRole(DEVELOPER_ROLES, async ({ res, body, user }) => {
      const result = await executeBinTransfer({
        warehouse: body?.warehouse || "WH-A",
        sku: body?.sku,
        from_bin: body?.from_bin,
        to_bin: body?.to_bin,
        qty: body?.qty,
        actor: user?.name || "Smart Manufacturing ERP"
      });
      sendJson(res, result.status === "REJECTED" ? 200 : 200, result);
    })
  );
}
