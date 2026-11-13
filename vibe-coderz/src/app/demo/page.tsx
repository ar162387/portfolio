import type { Metadata } from "next";
import Script from "next/script";
import { createElement } from "react";

const agentId = "agent_2201m79rq68hfsx855wpt5p0rwcv";
const hostedDemoUrl = `https://elevenlabs.io/app/talk-to?agent_id=${agentId}`;

export const metadata: Metadata = {
  title: "Sky Global Holidays Voice Demo",
  description: "Try the Sky Global Holidays AI travel assistant in Saudi Arabic.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="mb-3 text-4xl font-semibold tracking-tight sm:text-6xl">
        Sky Global Holidays
      </h1>
      <p lang="ar" className="mb-6 text-xl">جرّب المساعد السياحي باللهجة السعودية</p>
      <p className="max-w-lg leading-relaxed">
        Start a call in Saudi Arabic. Ask about a family trip, change your travel dates, or compare two itineraries.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-5 sm:p-7">
        <h2 className="mb-2 text-lg font-semibold">Try asking</h2>
        <p lang="ar" dir="rtl" className="text-start text-lg leading-relaxed">
          أبي أسافر من الرياض لجورجيا مع العائلة، وش تقترح علي؟
        </p>
        <p className="mt-4 text-sm leading-relaxed">
          Use sample trip details. The AI assistant can summarize a request during the demo.
        </p>
        <a href={hostedDemoUrl} className="mt-5 inline-block text-sm underline underline-offset-4">
          Open the call in a separate page
        </a>
      </div>
      {createElement("elevenlabs-convai", {
        "agent-id": agentId,
        "start-call-text": "ابدأ المكالمة",
        "end-call-text": "إنهاء المكالمة",
      })}
      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed"
        strategy="afterInteractive"
      />
    </section>
  );
}
