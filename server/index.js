/**
 * IncidentAI backend entry point. Plain Node http server (no framework) backed by
 * Postgres + pgvector (server/db/) with real Claude/Voyage AI reasoning where configured.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valParts] = trimmed.split("=");
        if (key && valParts.length > 0) {
          const val = valParts.join("=").trim().replace(/^["']|["']$/g, "");
          process.env[key.trim()] = val;
        }
      }
    }
  }
} catch (err) {
  console.warn("Failed to parse .env file:", err.message);
}
import { Router } from "./router.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerDeveloperRoutes } from "./routes/developers.js";
import { registerTicketRoutes } from "./routes/tickets.js";
import { registerIncidentRoutes } from "./routes/incidents.js";
import { registerOcrRoutes } from "./routes/ocr.js";
import { registerKnowledgeRoutes } from "./routes/knowledge.js";
import { registerLoadBalancerRoutes } from "./routes/loadbalancer.js";
import { registerAnalyticsRoutes } from "./routes/analytics.js";
import { registerCopilotRoutes } from "./routes/copilot.js";
import { registerTicketInsightRoutes } from "./routes/ticketInsights.js";
import { registerOperationsRoutes } from "./routes/operations.js";

const router = new Router();
registerAuthRoutes(router);
registerHealthRoutes(router);
registerDeveloperRoutes(router);
registerTicketRoutes(router);
registerIncidentRoutes(router);
registerOcrRoutes(router);
registerKnowledgeRoutes(router);
registerLoadBalancerRoutes(router);
registerAnalyticsRoutes(router);
registerCopilotRoutes(router);
registerTicketInsightRoutes(router);
registerOperationsRoutes(router);

const PORT = process.env.PORT || 4000;
const server = http.createServer((req, res) => router.handle(req, res));

server.listen(PORT, () => {
  console.log(`IncidentAI backend listening on http://localhost:${PORT}`);
});
