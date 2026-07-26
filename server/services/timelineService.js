/**
 * Enterprise Feature 4: Animated AI Incident Lifecycle Timeline.
 */

export function buildIncidentTimeline(ticket) {
  const createdAt = new Date(ticket.created_at);
  const ocrMs = ticket.pipeline_timings_ms?.ocr ?? 120;
  const severityMs = ticket.pipeline_timings_ms?.severity ?? 40;

  let cursor = 0;
  const steps = [];
  const pushStep = (id, label, durationMs) => {
    cursor += durationMs;
    steps.push({ id, label, timestamp: new Date(createdAt.getTime() + cursor).toISOString(), duration_ms: durationMs, status: "complete" });
  };

  pushStep("created", "Incident Created", 0);
  pushStep("ocr", "OCR Diagnostics", ocrMs);
  pushStep("vision", "Vision Analysis & Bounding Box", 60);
  pushStep("duplicate", "Duplicate Search (pgvector)", 90);
  pushStep("knowledge", "Knowledge Retrieval (RAG)", 80);
  pushStep("rootcause", "Root Cause Analysis", severityMs + 30);
  pushStep("assigned", `Developer Assigned${ticket.assigned_dev_name ? ` — ${ticket.assigned_dev_name}` : ""}`, 50);
  pushStep("patch", "Patch Generated", 40);

  if (ticket.resolved_at) {
    const resolvedOffsetMs = Math.max(0, new Date(ticket.resolved_at).getTime() - createdAt.getTime() - cursor);
    steps.push({ id: "resolved", label: "Resolved", timestamp: ticket.resolved_at, duration_ms: resolvedOffsetMs, status: "complete" });
  } else {
    steps.push({ id: "resolved", label: "Resolved", timestamp: null, duration_ms: null, status: "pending" });
  }

  return { ticket_id: ticket.id, steps };
}
