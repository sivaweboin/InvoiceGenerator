import type { NextRequest } from "next/server";

// Forwarders can expose a public host while Next sees a localhost URL.
export function isSameOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || (fetchSite && fetchSite !== "same-origin")) return false;
  try {
    const url = new URL(origin);
    if (url.origin !== origin || !["http:", "https:"].includes(url.protocol))
      return false;
    const hosts = [
      request.headers.get("host"),
      request.headers.get("x-forwarded-host"),
    ];
    return hosts.some(
      (host) =>
        host &&
        !host.includes(",") &&
        host.toLowerCase() === url.host.toLowerCase(),
    );
  } catch {
    return false;
  }
}
