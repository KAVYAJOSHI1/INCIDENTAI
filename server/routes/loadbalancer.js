import { listDevelopers, listTickets } from "../db/store.js";
import { recommendDeveloperForTicket, rebalanceWorkload } from "../services/loadBalancerService.js";
import { sendJson, ApiError } from "../utils/http.js";

export function registerLoadBalancerRoutes(router) {
  router.post("/api/loadbalancer/route", async ({ res, body }) => {
    if (!body?.erp_module) throw new ApiError(400, 'Request body must include "erp_module"');
    const routing = recommendDeveloperForTicket({ erp_module: body.erp_module }, await listDevelopers());
    sendJson(res, 200, { routing });
  });

  router.post("/api/loadbalancer/rebalance", async ({ res }) => {
    const [tickets, developers] = await Promise.all([listTickets(), listDevelopers()]);
    const actions = rebalanceWorkload(tickets, developers);
    sendJson(res, 200, { reassignments: actions, count: actions.length });
  });
}
