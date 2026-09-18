import { NextRequest, NextResponse } from "next/server";
import { services, studio } from "@/data/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 40;

const unavailable = () => NextResponse.json({ error: "Voice is temporarily unavailable." }, { status: 503 });
const salesServiceSlugs = new Set(["voice-agents", "custom-software"]);

async function forward(request: NextRequest) {
  const backend = process.env.VOICE_AGENT_URL;
  const token = process.env.VOICE_AGENT_TOKEN;
  if (!backend || !token) return unavailable();
  // Browser requests stay same-origin; the backend credential never reaches the client.
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try { sameOrigin = !!origin && new URL(origin).host === request.headers.get("host"); } catch { /* Invalid origin. */ }
  if (request.method !== "GET" && !sameOrigin) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }
  try {
    let body: string | undefined;
    if (request.method !== "GET") {
      if (!request.headers.get("content-type")?.includes("application/json")) {
        return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
      }
      const raw = await request.text();
      if (raw.length > 32_000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
      let payload;
      try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      }
      // Whitelist transport fields. Business context always comes from our published content.
      body = JSON.stringify(request.method === "POST" ? {
        sdp: payload.sdp, type: payload.type, pc_id: payload.pc_id, restart_pc: payload.restart_pc,
        greet: payload.requestData?.greet !== false,
        conversation_id: payload.requestData?.conversation_id,
        session_token: payload.requestData?.session_token,
        channel: ["voice", "push_to_talk", "text"].includes(payload.requestData?.channel)
          ? payload.requestData.channel : "voice",
        studio_knowledge: {
          name: studio.name,
          email: studio.email,
          services: services
            .filter(({ slug }) => salesServiceSlugs.has(slug))
            .map(({ name, detail, fit }) => ({ name, detail, fit })),
        },
      } : { pc_id: payload.pc_id, candidates: payload.candidates });
    }
    const response = await fetch(new URL(request.method === "GET" ? "health" : "api/offer", `${backend.replace(/\/$/, "")}/`), {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body, cache: "no-store", signal: AbortSignal.timeout(request.method === "GET" ? 4000 : 30000),
    });
    if (!response.ok) {
      const status = response.status === 429 ? 429 : response.status === 400 || response.status === 422 ? 400 : 503;
      return NextResponse.json({ error: status === 429 ? "The assistant is busy. Please try again shortly." : "Voice is temporarily unavailable." }, { status });
    }
    if (request.method === "GET") {
      const iceResponse = await fetch(new URL("ice", `${backend.replace(/\/$/, "")}/`), {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(4000),
      });
      const ice = iceResponse.ok ? await iceResponse.json() : { ice_servers: [] };
      return NextResponse.json({ available: true, iceServers: ice.ice_servers || [] });
    }
    if (response.status === 204) return new Response(null, { status: 204 });
    return NextResponse.json(await response.json());
  } catch {
    return unavailable();
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
