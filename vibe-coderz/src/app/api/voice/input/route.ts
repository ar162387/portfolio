import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const backend = process.env.VOICE_AGENT_URL?.replace(/\/$/, "");
  const token = process.env.VOICE_AGENT_TOKEN;
  if (!backend || !token) return NextResponse.json({ ok: false }, { status: 503 });
  try {
    const origin = request.headers.get("origin") || "";
    if (new URL(origin).host !== request.headers.get("host")) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ ok: false }, { status: 415 });
    }
    const input = await request.json() as Record<string, unknown>;
    if (
      typeof input.conversationId !== "string" || input.conversationId.length > 36 ||
      typeof input.sessionToken !== "string" || input.sessionToken.length > 500 ||
      typeof input.messageId !== "string" || input.messageId.length < 8 || input.messageId.length > 80 ||
      typeof input.text !== "string" || !input.text.trim() || input.text.length > 2_000
    ) return NextResponse.json({ ok: false }, { status: 400 });

    const response = await fetch(`${backend}/input`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: input.conversationId,
        session_token: input.sessionToken,
        message_id: input.messageId,
        text: input.text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    const result = response.ok ? await response.json() : { ok: false };
    return NextResponse.json(result, { status: response.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
