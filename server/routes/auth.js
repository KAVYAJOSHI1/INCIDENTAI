import crypto from "node:crypto";
import { z } from "zod";
import { createUser, getUserByEmail, getUserById } from "../db/store.js";
import { hashPassword, comparePassword, issueToken } from "../services/authService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { sendJson, ApiError } from "../utils/http.js";
import { validateBody } from "../utils/validate.js";
import { ROLES } from "../constants.js";

const registerSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(ROLES)
});

const loginSchema = z.object({
  email: z.string().email("Must be a valid email address"),
  password: z.string().min(1, "Password is required")
});

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

export function registerAuthRoutes(router) {
  router.post("/api/auth/register", async ({ res, body }) => {
    const input = validateBody(registerSchema, body);

    const existing = await getUserByEmail(input.email);
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const user = await createUser({
      id: `user_${crypto.randomInt(100000, 999999)}`,
      email: input.email,
      password_hash: await hashPassword(input.password),
      name: input.name,
      role: input.role
    });

    sendJson(res, 201, { token: issueToken(user), user: sanitizeUser(user) });
  });

  router.post("/api/auth/login", async ({ res, body }) => {
    const input = validateBody(loginSchema, body);

    const user = await getUserByEmail(input.email);
    if (!user || !(await comparePassword(input.password, user.password_hash))) {
      throw new ApiError(401, "Invalid email or password");
    }

    sendJson(res, 200, { token: issueToken(user), user: sanitizeUser(user) });
  });

  router.get(
    "/api/auth/me",
    requireAuth(async ({ res, user }) => {
      const fresh = await getUserById(user.id);
      if (!fresh) throw new ApiError(401, "User no longer exists");
      sendJson(res, 200, { user: sanitizeUser(fresh) });
    })
  );
}
