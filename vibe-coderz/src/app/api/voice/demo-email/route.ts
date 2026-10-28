import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const backend = process.env.VOICE_AGENT_URL?.replace(/\/$/, "");
  const token = process.env.VOICE_AGENT_TOKEN;
  if (!backend || !token) return NextResponse.json({ error: "Demo unavailable." }, { status: 503 });
  try {
    if (new URL(request.headers.get("origin") || "").host !== request.headers.get("host")) {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
    }
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (!input || typeof input.conversationId !== "string" || input.conversationId.length > 36 ||
      typeof input.sessionToken !== "string" || input.sessionToken.length > 500) {
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    }
    const response = await fetch(`${backend}/demo-email`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: input.conversationId, session_token: input.sessionToken, consent: input.consent }),
      cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json();
    return NextResponse.json(response.ok ? payload : { error: payload.detail || "Sample email unavailable." }, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Sample email could not be confirmed. Please check your inbox before trying again." }, { status: 503 });
  }
}
