import { listDevelopers, listTickets } from "../db/store.js";
import {
  recommendDeveloperForTicket,
  recommendDeveloperWithAI,
  rebalanceWorkload
} from "../services/loadBalancerService.js";
import { requireRole } from "../middleware/authMiddleware.js";
import { validateBody } from "../utils/validate.js";
import { loadBalancerRouteSchema } from "../utils/schemas.js";
import { STAFF_ROLES } from "../constants.js";
import { sendJson } from "../utils/http.js";

export function registerLoadBalancerRoutes(router) {
  router.post(
    "/api/loadbalancer/route",
    requireRole(STAFF_ROLES, async ({ res, body }) => {
      const input = validateBody(loadBalancerRouteSchema, body);
      const ticket = { erp_module: input.erp_module };
      const developers = await listDevelopers();
      const routing = (await recommendDeveloperWithAI(ticket, developers)) ?? recommendDeveloperForTicket(ticket, developers);
      sendJson(res, 200, { routing });
    })
  );

  router.post(
    "/api/loadbalancer/rebalance",
    requireRole(STAFF_ROLES, async ({ res }) => {
      const [tickets, developers] = await Promise.all([listTickets(), listDevelopers()]);
      const actions = rebalanceWorkload(tickets, developers);
      sendJson(res, 200, { reassignments: actions, count: actions.length });
    })
  );
}
