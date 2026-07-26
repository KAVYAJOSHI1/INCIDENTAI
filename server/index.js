/**
 * IncidentAI backend entry point. Zero external dependencies — swap in Express/Postgres/Gemini later as needed.
 */

import http from "node:http";
import { Router } from "./router.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerDeveloperRoutes } from "./routes/developers.js";
import { registerTicketRoutes } from "./routes/tickets.js";
import { registerIncidentRoutes } from "./routes/incidents.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";
import { registerLoadBalancerRoutes } from "./routes/loadbalancer.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerCopilotRoutes } from "./routes/copilot.js";

const router = new Router();
registerHealthRoutes(router);
registerDeveloperRoutes(router);
registerTicketRoutes(router);
registerIncidentRoutes(router);
registerKnowledgeRoutes(router);
registerLoadBalancerRoutes(router);
registerAnalyticsRoutes(router);
registerCopilotRoutes(router);

const PORT = process.env.PORT || 4000;
const server = http.createServer((req, res) => router.handle(req, res));

server.listen(PORT, () => {
  console.log(`IncidentAI backend listening on http://localhost:${PORT}`);
});
