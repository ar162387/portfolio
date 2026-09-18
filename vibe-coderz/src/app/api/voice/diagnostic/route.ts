import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (value: unknown, limit: number) => typeof value === "string" ? value.slice(0, limit) : "unknown";

export async function POST(request: NextRequest) {
  const backend = process.env.VOICE_AGENT_URL?.replace(/\/$/, "");
  const token = process.env.VOICE_AGENT_TOKEN;
  if (!backend || !token) return NextResponse.json({ ok: false }, { status: 503 });
  try {
    const origin = request.headers.get("origin") || "";
    if (new URL(origin).host !== request.headers.get("host")) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    const input = await request.json() as Record<string, unknown>;
    if (typeof input.conversationId !== "string" || typeof input.sessionToken !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const response = await fetch(`${backend}/diagnostic`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: input.conversationId,
        session_token: input.sessionToken,
        event: text(input.event, 20),
        connection_state: text(input.connectionState, 30),
        ice_transport: text(input.iceTransport, 10),
        local_candidate_type: text(input.localCandidateType, 20),
        remote_candidate_type: text(input.remoteCandidateType, 20),
        round_trip_ms: typeof input.roundTripMs === "number" ? input.roundTripMs : null,
        packets_lost: typeof input.packetsLost === "number" ? input.packetsLost : null,
        jitter_ms: typeof input.jitterMs === "number" ? input.jitterMs : null,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : response.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
