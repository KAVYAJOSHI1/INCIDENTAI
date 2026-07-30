/**
 * Shared Zod request-body schemas, validated via server/utils/validate.js.
 */

import { z } from "zod";
import { ERP_MODULES } from "../constants.js";

export const incidentInputSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    fileName: z.string().trim().min(1).optional(),
    reporter: z.string().trim().min(1).optional()
  })
  .refine((v) => v.text || v.fileName, { message: 'Request body must include "text" or "fileName"' });

export const copilotChatSchema = z.object({
  ticket_id: z.string().trim().min(1, "ticket_id is required"),
  message: z.string().trim().min(1, "message is required"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
      })
    )
    .max(20)
    .optional()
});

export const ticketPatchSchema = z
  .object({
    status: z.string().trim().min(1).optional(),
    assigned_dev_id: z.string().trim().min(1).optional(),
    assigned_dev_name: z.string().trim().min(1).optional(),
    resolved_at: z.string().trim().min(1).optional()
  })
  .partial();

export const knowledgeArticleSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1, "title is required"),
  solution: z.string().trim().min(1, "solution is required"),
  erp_module: z.enum(ERP_MODULES).optional(),
  error_code: z.string().trim().min(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  tags: z.array(z.string()).optional()
});

export const loadBalancerRouteSchema = z.object({
  erp_module: z.enum(ERP_MODULES)
});
