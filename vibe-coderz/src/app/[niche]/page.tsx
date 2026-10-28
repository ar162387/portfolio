import Link from "next/link";
import { notFound } from "next/navigation";
import { VoiceAssistant } from "@/components/studio/VoiceAssistant";
import { isNicheKey, nicheDemos } from "@/lib/niche-demos";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Try a sample receptionist", robots: { index: false, follow: false } };

export default async function NicheDemoPage({ params }: { params: Promise<{ niche: string }> }) {
  const { niche } = await params;
  if (!isNicheKey(niche)) notFound();
  const demo = nicheDemos[niche];
  return <section className="niche-demo-page">
    <p className="eyebrow">TRY THE FRONT DESK / UK SAMPLE DEMO</p>
    <h1>{demo.title}</h1>
    <p>Play a customer calling <strong>{demo.business}, a fictional business.</strong> {demo.suggestion} Use a made-up first name.</p>
    <p>This is an AI demo. No real booking or calendar invitation is created.</p>
    <p className="niche-demo-note">Start enables your microphone. Google Gemini processes audio and text; text is saved for demo review. Use sample details only. <Link href="/privacy">Privacy details</Link>.</p>
    <VoiceAssistant niche={niche} inline />
    <p>Confirm a sample appointment request during the call to preview the email an owner would receive. You can then choose to send that labelled sample to your own inbox.</p>
    <p className="niche-demo-note">Demos must be enabled by the studio before a call can start. The homepage has our usual studio sales assistant.</p>
  </section>;
}
