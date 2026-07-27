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
    const payload = verifyToken(extractToken(ctx.req));
    if (!payload) throw new ApiError(401, "Unauthorized — missing or invalid token");
    ctx.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
    return handler(ctx);
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
