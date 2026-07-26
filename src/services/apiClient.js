/**
 * Client for the IncidentAI backend (server/). Requests go through the Vite dev proxy at /api.
 */

const API_BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed with status ${res.status}`);
  return data;
}

export const fetchDevelopers = () => request("/developers").then((d) => d.developers);

export const fetchTickets = (filters = {}) => {
  const qs = new URLSearchParams(filters).toString();
  return request(`/tickets${qs ? `?${qs}` : ""}`).then((d) => d.tickets);
};

export const fetchTicket = (id) => request(`/tickets/${id}`).then((d) => d.ticket);

export const patchTicket = (id, patch) =>
  request(`/tickets/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).then((d) => d.ticket);

export const ingestIncident = (payload) =>
  request("/incidents/ingest", { method: "POST", body: JSON.stringify(payload) }).then((d) => d.ticket);

export const analyzeOcrPreview = (payload) =>
  request("/ocr/analyze", { method: "POST", body: JSON.stringify(payload) }).then((d) => d.ocr);

export const fetchKnowledgeBase = () => request("/knowledge").then((d) => d.articles);

export const searchKnowledge = (query, erpModule) => {
  const qs = new URLSearchParams({ q: query, ...(erpModule ? { module: erpModule } : {}) }).toString();
  return request(`/knowledge/search?${qs}`).then((d) => d.results);
};

export const addKnowledgeArticle = (article) =>
  request("/knowledge", { method: "POST", body: JSON.stringify(article) }).then((d) => d.article);

export const routeDeveloper = (erpModule) =>
  request("/loadbalancer/route", { method: "POST", body: JSON.stringify({ erp_module: erpModule }) }).then((d) => d.routing);

export const rebalanceLoad = () => request("/loadbalancer/rebalance", { method: "POST" });

export const fetchAnalyticsSummary = () => request("/analytics/summary").then((d) => d.summary);

export const fetchHeatmap = () => request("/analytics/heatmap").then((d) => d.heatmap);

export const fetchSeverityDistribution = () => request("/analytics/severity-distribution").then((d) => d.distribution);

export const fetchPipelineTrace = (ticketId) => request(`/analytics/pipeline/${ticketId}`).then((d) => d.pipeline);

export const copilotChat = (ticketId, message) =>
  request("/copilot/chat", { method: "POST", body: JSON.stringify({ ticket_id: ticketId, message }) }).then((d) => d.reply);

// Enterprise 10-feature roadmap — ticket-scoped insights
export const fetchRootCauseTree = (ticketId) => request(`/tickets/${ticketId}/root-cause-tree`).then((d) => d.tree);
export const fetchExplainability = (ticketId) => request(`/tickets/${ticketId}/explainability`).then((d) => d.explainability);
export const fetchBusinessImpact = (ticketId) => request(`/tickets/${ticketId}/business-impact`).then((d) => d.impact);
export const fetchTicketTimeline = (ticketId) => request(`/tickets/${ticketId}/timeline`).then((d) => d.timeline);
export const fetchExecutiveSummary = (ticketId) => request(`/tickets/${ticketId}/executive-summary`).then((d) => d.summary);
export const fetchIncidentReplay = (ticketId) => request(`/tickets/${ticketId}/replay`).then((d) => d.replay);
export const fetchPatchPreview = (ticketId) => request(`/tickets/${ticketId}/patch-preview`).then((d) => d.preview);

// Enterprise 10-feature roadmap — standalone operations views
export const fetchWarRoom = () => request("/warroom").then((d) => d.warroom);
export const fetchDigitalTwin = () => request("/digital-twin").then((d) => d.twin);
export const fetchMissionControl = () => request("/mission-control").then((d) => d.missionControl);
