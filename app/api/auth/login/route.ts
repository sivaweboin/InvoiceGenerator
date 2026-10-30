import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "../../../../lib/request-origin";
import {
  authConfig,
  createSession,
  validCredentials,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "../../../../lib/auth";

// Single-account throttle per server process. Deployments with multiple instances
// should additionally rate-limit this endpoint at their gateway.
let failures = 0;
let resetAt = 0;
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  try {
    authConfig();
  } catch {
    return NextResponse.json(
      { error: "Login is not configured. Contact the administrator." },
      { status: 503 },
    );
  }
  if (Date.now() >= resetAt) {
    failures = 0;
    resetAt = Date.now() + 15 * 60 * 1000;
  }
  if (failures >= 10)
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  let data;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (
    !data ||
    typeof data.email !== "string" ||
    typeof data.password !== "string" ||
    data.email.length > 254 ||
    data.password.length > 1024
  )
    return NextResponse.json(
      { error: "Invalid login ID or password." },
      { status: 400 },
    );
  failures++;
  if (!validCredentials(data.email, data.password))
    return NextResponse.json(
      { error: "Invalid login ID or password." },
      { status: 401 },
    );
  failures = 0;
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(SESSION_COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return response;
}
