import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "vibecoderzz_studio_session";
const allowed = new Set(["login", "logout", "me", "metrics", "conversations"]);

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).host === request.headers.get("host"); } catch { return false; }
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const backend = process.env.VOICE_AGENT_URL;
  const serviceToken = process.env.VOICE_AGENT_TOKEN;
  if (!backend || !serviceToken) return NextResponse.json({ error: "Dashboard is not configured." }, { status: 503 });
  const { path } = await context.params;
  if (!path.length || !allowed.has(path[0]) || (path.length > 2) || (path.length === 2 && path[0] !== "conversations")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (request.method !== "GET" && !sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  const isLogin = path[0] === "login";
  const token = request.cookies.get(COOKIE)?.value || "";
  if (!isLogin && !token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: string | undefined;
  if (request.method !== "GET") {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
    }
    body = await request.text();
    if (body.length > 4_000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }
  const upstreamUrl = new URL(`dashboard/${path.join("/")}`, `${backend.replace(/\/$/, "")}/`);
  if (request.method === "GET") upstreamUrl.search = request.nextUrl.search;
  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceToken}`,
        ...(token ? { "X-Dashboard-Session": token } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await upstream.json().catch(() => ({ error: "Dashboard request failed." }));
    const response = NextResponse.json(payload, { status: upstream.status });
    if (isLogin && upstream.ok && typeof payload.token === "string") {
      response.cookies.set(COOKIE, payload.token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
      return NextResponse.json({ ok: true }, { headers: response.headers });
    }
    if (path[0] === "logout" || upstream.status === 401) response.cookies.delete(COOKIE);
    return response;
  } catch {
    return NextResponse.json({ error: "Dashboard service is unavailable." }, { status: 503 });
  }
}

export const GET = proxy;
export const POST = proxy;
