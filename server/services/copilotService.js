/**
 * Developer Command Center: AI Copilot Chat — intent-matched replies grounded in the current ticket context.
 */

export function handleCopilotChat(message, ticket) {
  const query = (message || "").toLowerCase();

  if (/why|cause|reason/.test(query)) {
    return {
      sender: "AI_COPILOT",
      message: `**Root Cause Analysis for ${ticket.ticket_number}:**\n\n${ticket.ai_root_cause}\n\nIdentified by analyzing the stack trace snippet and matching with past ${ticket.erp_module} incidents.`
    };
  }
  if (/patch|fix|sql|code/.test(query)) {
    return {
      sender: "AI_COPILOT",
      message: `**Recommended Code / SQL Patch:**\n\`\`\`sql\n${ticket.ai_suggested_patch}\n\`\`\`\n\nApply this in the Developer Workbench to test the fix.`
    };
  }
  if (/postmortem|report|summary/.test(query)) {
    return {
      sender: "AI_COPILOT",
      message: `**Executive Post-Mortem Draft:**\n- Incident: ${ticket.title}\n- ERP Module: ${ticket.erp_module}\n- Severity: ${ticket.severity}\n- Assigned: ${ticket.assigned_dev_name}\n- Preventative Action: See suggested patch above.`
    };
  }
  if (/who|assign|dev/.test(query)) {
    return {
      sender: "AI_COPILOT",
      message: `This ticket is routed to **${ticket.assigned_dev_name}** — ${ticket.developer_routing?.recommended?.reasoning || "best skill/capacity match."}`
    };
  }

  return {
    sender: "AI_COPILOT",
    message: `I am your IncidentAI Copilot for **${ticket.ticket_number}**. Ask me about the root cause, suggested SQL patch, assigned developer, or a post-mortem summary.`
  };
}
