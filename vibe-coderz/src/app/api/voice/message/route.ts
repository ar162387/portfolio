import { NextRequest, NextResponse } from "next/server";
import { services, studio } from "@/data/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 35;

const salesServiceSlugs = new Set(["voice-agents", "custom-software"]);

export async function POST(request: NextRequest) {
  const backend = process.env.VOICE_AGENT_URL?.replace(/\/$/, "");
  const token = process.env.VOICE_AGENT_TOKEN;
  if (!backend || !token) return NextResponse.json({ error: "Assistant unavailable." }, { status: 503 });
  try {
    const origin = request.headers.get("origin") || "";
    if (new URL(origin).host !== request.headers.get("host")) {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
    }
    const input = await request.json() as Record<string, unknown>;
    if (
      typeof input.conversationId !== "string" || input.conversationId.length > 36 ||
      typeof input.sessionToken !== "string" || input.sessionToken.length > 500 ||
      typeof input.messageId !== "string" || input.messageId.length < 8 || input.messageId.length > 80 ||
      typeof input.text !== "string" || !input.text.trim() || input.text.length > 2000
    ) return NextResponse.json({ error: "Invalid message." }, { status: 400 });
    const response = await fetch(`${backend}/message/stream`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: input.conversationId,
        session_token: input.sessionToken,
        message_id: input.messageId,
        text: input.text,
        studio_knowledge: {
          name: studio.name,
          email: studio.email,
          services: services
            .filter(({ slug }) => salesServiceSlugs.has(slug))
            .map(({ name, detail, fit }) => ({ name, detail, fit })),
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => ({ error: "No response." }));
      return NextResponse.json(body, { status: response.status });
    }
    return new Response(response.body, {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "The assistant did not respond in time." }, { status: 504 });
  }
}
