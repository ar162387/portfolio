import { ArrowDown } from "lucide-react";
import type { Metadata } from "next";
import { VoiceAssistant } from "@/components/studio/VoiceAssistant";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sky Global Holidays Demo",
  description: "Try the Sky Global Holidays travel assistant in English and Saudi Arabic.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
      <header className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Sky Global Holidays <span className="whitespace-nowrap text-[var(--muted)]">Demo</span>
        </h1>
        <p lang="ar" dir="rtl" className="mt-3 text-xl">تجربة سكاي العالمية للعطلات</p>
      </header>

      <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 pt-6 pb-4 sm:px-7">
        <h2 className="text-center text-xl font-semibold">
          Talk to the travel assistant <span lang="ar" dir="rtl" className="mt-1 block text-base">تحدّث مع المساعد السياحي</span>
        </h2>
        <p className="mt-3 text-center text-sm text-[var(--muted)]">
          Speak in English or Saudi Arabic.
          <span lang="ar" dir="rtl" className="mt-1 block">تحدّث بالإنجليزية أو باللهجة السعودية.</span>
        </p>

        <p className="relative z-[1] mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm font-semibold">
          <span>Select Start talking to call</span>
          <span lang="ar" dir="rtl">اضغط على زر بدء المحادثة للاتصال</span>
        </p>
        <ArrowDown aria-hidden="true" size={22} className="relative z-[1] mx-auto mt-2 block text-[var(--accent-strong)]" />

        <div className="mx-auto mt-4 max-w-xl">
          <VoiceAssistant niche="sky-global-holidays" inline />
        </div>
        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          Google Gemini processes call audio. Text is saved for demo review. <Link href="/privacy">Privacy details</Link>
          <span lang="ar" dir="rtl" className="mt-1 block">يعالج Google Gemini صوت المكالمة، ويُحفظ النص لمراجعة التجربة.</span>
        </p>

        <div className="mt-4 grid gap-4 border-t border-[var(--line)] px-2 pt-5 text-sm leading-relaxed sm:grid-cols-2 sm:gap-8">
          <div lang="en">
            <h3 className="font-semibold">Try asking</h3>
            <p>“I’m planning a family trip from Riyadh to Georgia. What would you suggest?”</p>
            <p className="mt-2 text-[var(--muted)]">Use sample travel details for this demo.</p>
          </div>
          <div lang="ar" dir="rtl">
            <h3 className="font-semibold">جرّب تسأل</h3>
            <p>«أبي أسافر من الرياض لجورجيا مع العائلة، وش تقترح علي؟»</p>
            <p className="mt-2 text-[var(--muted)]">استخدم تفاصيل سفر افتراضية في هذه التجربة.</p>
          </div>
        </div>
      </div>

    </section>
  );
}
