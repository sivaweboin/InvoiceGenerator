import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "weboin-session";
export const SESSION_SECONDS = 60 * 60 * 24 * 400;
export function authConfig() {
  const password = process.env.AUTH_PASSWORD;
  const secret = process.env.AUTH_JWT_SECRET;
  if (!password || !secret || secret.length < 32)
    throw new Error(
      "Configure AUTH_PASSWORD and AUTH_JWT_SECRET (32+ characters).",
    );
  return {
    email: process.env.AUTH_LOGIN_ID || "invoice@weboin.com",
    password,
    key: new TextEncoder().encode(secret),
  };
}
export function validCredentials(email: string, password: string) {
  const config = authConfig();
  const digest = (s: string) => createHash("sha256").update(s).digest();
  const emailMatches = timingSafeEqual(
    digest(email.trim().toLowerCase()),
    digest(config.email.toLowerCase()),
  );
  const passwordMatches = timingSafeEqual(
    digest(password),
    digest(config.password),
  );
  return emailMatches && passwordMatches;
}
export async function createSession() {
  const { email, key } = authConfig();
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuer("weboin-invoice")
    .setAudience("weboin-workspace")
    .setIssuedAt()
    .sign(key);
}
export async function verifySession(token?: string) {
  if (!token) return false;
  try {
    const { email, key } = authConfig();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: "weboin-invoice",
      audience: "weboin-workspace",
      requiredClaims: ["iat", "sub"],
    });
    return payload.sub === email;
  } catch {
    return false;
  }
}
