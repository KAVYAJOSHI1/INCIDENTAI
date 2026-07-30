/**
 * Client for the IncidentAI backend (server/). Requests go through the Vite dev proxy at /api.
 */

const API_BASE = "/api";
const TOKEN_STORAGE_KEY = "incidentai_token";

let authToken = localStorage.getItem(TOKEN_STORAGE_KEY);
let onUnauthorized = null;

export function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthToken() {
  return authToken;
}

/** Registers a callback fired whenever a request comes back 401 (expired/invalid token). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    setAuthToken(null);
    onUnauthorized?.();
  }
  if (!res.ok) throw new Error(data.error || `Request failed with status ${res.status}`);
  return data;
}

export const register = (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) });
export const login = (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
export const fetchMe = () => request("/auth/me").then((d) => d.user);

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

/**
 * Streams a Copilot reply token-by-token via SSE. `onChunk(text)` fires for each delta;
 * resolves with the full reply text once the stream ends. Uses fetch (not EventSource)
 * so the Bearer auth header can be sent.
 */
export async function streamCopilotChat(ticketId, message, history, onChunk) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}/copilot/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ticket_id: ticketId, message, history })
  });

  if (res.status === 401) {
    setAuthToken(null);
    onUnauthorized?.();
  }
  if (!res.ok || !res.body) throw new Error(`Request failed with status ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop();
    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      const payload = part.slice(6);
      if (payload === "[DONE]") return full;
      const { chunk } = JSON.parse(payload);
      full += chunk;
      onChunk(chunk);
    }
  }
  return full;
}

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
