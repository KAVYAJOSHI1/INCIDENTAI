/**
 * Developer Command Center: AI Copilot Chat. Tries a real Claude reply grounded in the
 * full ticket context first (handleCopilotChatWithAI); falls back to intent-matched
 * canned replies (handleCopilotChat) when no API key is configured or the call fails.
 */

import { completeText } from "./llmService.js";

function buildTicketContext(ticket) {
  return `Ticket ${ticket.ticket_number}: ${ticket.title}
ERP Module: ${ticket.erp_module}
Severity: ${ticket.severity}
Status: ${ticket.status}
Assigned Developer: ${ticket.assigned_dev_name || "Unassigned"}
Reported (non-technical): "${ticket.vague_user_input}"
Structured Description: ${ticket.structured_description}
Reproduction Steps: ${(ticket.reproduction_steps || []).join(" -> ")}
Expected: ${ticket.expected_behavior}
Actual: ${ticket.actual_behavior}
AI Root Cause: ${ticket.ai_root_cause}
AI Suggested Patch: ${ticket.ai_suggested_patch}
Developer Routing Reasoning: ${ticket.developer_routing?.recommended?.reasoning || "N/A"}`;
}

const COPILOT_SYSTEM_PROMPT = `You are IncidentAI Copilot, embedded in a developer's workbench for an ERP support ticket. Answer the developer's question using only the ticket context provided — root cause, stack trace, suggested patch, routing rationale, and business context. Be concise and technical; you're talking to an engineer, not an end user. Format SQL/code in markdown fences. If asked for a postmortem, structure it as bullet points. If the question isn't answerable from the ticket context, say so plainly rather than inventing details.`;

export async function handleCopilotChatWithAI(message, ticket) {
  const reply = await completeText({
    system: `${COPILOT_SYSTEM_PROMPT}\n\n--- Ticket Context ---\n${buildTicketContext(ticket)}`,
    messages: [{ role: "user", content: message }],
    maxTokens: 768
  });

  if (!reply) return null;
  return { sender: "AI_COPILOT", message: reply, ai_generated: true };
}

export function handleCopilotChat(message, ticket) {
  const query = (message || "").toLowerCase();
  let replyMessage;

  if (/why|cause|reason/.test(query)) {
    replyMessage = `**Root Cause Analysis for ${ticket.ticket_number}:**\n\n${ticket.ai_root_cause}\n\nIdentified by analyzing the stack trace snippet and matching with past ${ticket.erp_module} incidents.`;
  } else if (/patch|fix|sql|code/.test(query)) {
    replyMessage = `**Recommended Code / SQL Patch:**\n\`\`\`sql\n${ticket.ai_suggested_patch}\n\`\`\`\n\nApply this in the Developer Workbench to test the fix.`;
  } else if (/postmortem|report|summary/.test(query)) {
    replyMessage = `**Executive Post-Mortem Draft:**\n- Incident: ${ticket.title}\n- ERP Module: ${ticket.erp_module}\n- Severity: ${ticket.severity}\n- Assigned: ${ticket.assigned_dev_name}\n- Preventative Action: See suggested patch above.`;
  } else if (/who|assign|dev/.test(query)) {
    replyMessage = `This ticket is routed to **${ticket.assigned_dev_name}** — ${ticket.developer_routing?.recommended?.reasoning || "best skill/capacity match."}`;
  } else {
    replyMessage = `I am your IncidentAI Copilot for **${ticket.ticket_number}**. Ask me about the root cause, suggested SQL patch, assigned developer, or a post-mortem summary.`;
  }

  return { sender: "AI_COPILOT", message: replyMessage, ai_generated: false };
}
