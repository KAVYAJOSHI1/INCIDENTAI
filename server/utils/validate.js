/**
 * Zod request-body validation. Throws a 400 ApiError with a readable message on
 * failure; returns the parsed (and type-coerced) body on success.
 */

import { ApiError } from "./http.js";

export function validateBody(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const message = result.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
    throw new ApiError(400, message);
  }
  return result.data;
}
