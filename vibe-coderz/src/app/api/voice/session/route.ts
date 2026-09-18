import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backendConfig() {
  const backend = process.env.VOICE_AGENT_URL;
  const token = process.env.VOICE_AGENT_TOKEN;
  return backend && token ? { backend: backend.replace(/\/$/, ""), token } : null;
}

function sameOrigin(request: NextRequest) {
  try { return new URL(request.headers.get("origin") || "").host === request.headers.get("host"); }
  catch { return false; }
}

export async function POST(request: NextRequest) {
  const config = backendConfig();
  if (!config) return NextResponse.json({ error: "Assistant unavailable." }, { status: 503 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
  }
  try {
    const input = await request.json() as { channel?: string };
    const channel: "voice" | "push_to_talk" | "text" = input.channel === "push_to_talk"
      ? "push_to_talk" : input.channel === "text" ? "text" : "voice";
    const response = await fetch(`${config.backend}/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) throw new Error("session failed");
    const payload = await response.json();
    return NextResponse.json({
      conversationId: payload.conversation_id,
      sessionToken: payload.session_token,
      iceServers: payload.ice_servers || [],
    });
  } catch {
    return NextResponse.json({ error: "Assistant unavailable." }, { status: 503 });
  }
}
