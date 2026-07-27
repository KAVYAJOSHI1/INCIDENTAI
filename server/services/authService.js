/**
 * Password hashing (bcryptjs — pure JS, no native build step, unlike `bcrypt`)
 * and JWT issuing/verification for login.
 */

import "../utils/loadEnv.js";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const TOKEN_TTL = "7d";

// Falls back to a random per-process secret when JWT_SECRET isn't configured, so the
// app still works with zero setup — tokens just stop validating across a restart.
// Real deployments should set JWT_SECRET explicitly (see .env.example).
let secret = process.env.JWT_SECRET;
if (!secret) {
  secret = crypto.randomBytes(48).toString("hex");
  console.warn("[authService] JWT_SECRET not set — using a random per-process secret. Set JWT_SECRET in .env for real deployments (tokens will otherwise invalidate on every restart).");
}

export function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role, name: user.name }, secret, { expiresIn: TOKEN_TTL });
}

/**
 * Returns the decoded payload, or null if the token is missing, malformed, or expired.
 */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}
