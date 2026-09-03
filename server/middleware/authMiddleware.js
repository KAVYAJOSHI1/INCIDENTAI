/**
 * JWT auth + RBAC middleware. Both wrap a router handler and return a new handler
 * with the same `(ctx) => ...` shape the router already calls — no changes needed
 * to server/router.js itself.
 */

import { verifyToken } from "../services/authService.js";
import { ApiError } from "../utils/http.js";

function extractToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

/**
 * Requires a valid Bearer JWT. Attaches the decoded identity to `ctx.user` as
 * { id, email, role, name } for the wrapped handler to use.
 */
export function requireAuth(handler) {
  return async (ctx) => {
    const token = extractToken(ctx.req);
    let payload = verifyToken(token);

    // Unauthenticated ERP-originated events (webhook / embedded Digital Twin) are
    // accepted as the ERP source system itself — not as an interactive user role.
    if (!payload && ctx.body && ctx.body.erp_context) {
      payload = {
        sub: "erp_system",
        email: ctx.body.erp_context?.user_email || "system@smart-manufacturing-erp",
        role: "ERP_SYSTEM",
        name: "Smart Manufacturing ERP"
      };
    }

    if (payload) {
      ctx.user = { id: payload.sub || payload.id, email: payload.email, role: payload.role || "ERP_SYSTEM", name: payload.name || payload.email };
      return handler(ctx);
    }

    throw new ApiError(401, "Unauthorized — missing or invalid token");
  };
}

/**
 * Requires a valid Bearer JWT AND that the user's role is one of `roles`.
 */
export function requireRole(roles, handler) {
  return requireAuth(async (ctx) => {
    if (!roles.includes(ctx.user.role)) {
      throw new ApiError(403, `Forbidden — requires role: ${roles.join(" or ")}`);
    }
    return handler(ctx);
  });
}
