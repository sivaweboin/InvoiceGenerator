import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "../../../../lib/auth";
import { isSameOriginRequest } from "../../../../lib/request-origin";
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return new NextResponse(null, { status: 403 });
  const response = NextResponse.redirect(
    new URL("/login", request.headers.get("origin")!),
    303,
  );
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
