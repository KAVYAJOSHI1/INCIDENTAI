/**
 * In-memory database store (mirrors the schema in SAAS_ARCHITECTURE_SPEC.md). Swap for real Postgres later.
 */

import { developers as seedDevelopers, tickets as seedTickets, knowledgeBase as seedKnowledgeBase } from "./seedData.js";

const developers = seedDevelopers.map((d) => ({ ...d }));
const tickets = seedTickets.map((t) => ({ ...t }));
const knowledgeBase = seedKnowledgeBase.map((k) => ({ ...k }));
const pipelineTraces = [];

export function listDevelopers() {
  return developers;
}

export function getDeveloperById(id) {
  return developers.find((d) => d.id === id) || null;
}

export function updateDeveloper(id, patch) {
  const developer = getDeveloperById(id);
  if (!developer) return null;
  Object.assign(developer, patch);
  return developer;
}

export function listTickets(filters = {}) {
  return tickets.filter((t) =>
    (!filters.status || t.status === filters.status) &&
    (!filters.severity || t.severity === filters.severity) &&
    (!filters.erp_module || t.erp_module === filters.erp_module) &&
    (!filters.assigned_dev_id || t.assigned_dev_id === filters.assigned_dev_id)
  );
}

export function getTicketById(id) {
  return tickets.find((t) => t.id === id || t.ticket_number === id) || null;
}

export function addTicket(ticket) {
  tickets.unshift(ticket);
  return ticket;
}

export function updateTicket(id, patch) {
  const ticket = getTicketById(id);
  if (!ticket) return null;
  Object.assign(ticket, patch);
  return ticket;
}

export function listKnowledgeBase() {
  return knowledgeBase;
}

export function addKnowledgeArticle(article) {
  knowledgeBase.unshift(article);
  return article;
}

export function recordPipelineTrace(trace) {
  pipelineTraces.unshift(trace);
  if (pipelineTraces.length > 50) pipelineTraces.pop();
  return trace;
}

export function listPipelineTraces(limit = 10) {
  return pipelineTraces.slice(0, limit);
}
