import { ArrowDown } from "lucide-react";
import type { Metadata } from "next";
import Script from "next/script";
import { createElement } from "react";

const widgetText = {
  start_call: "Start call / بدء المكالمة",
  new_call: "New call / مكالمة جديدة",
  end_call: "End call / إنهاء المكالمة",
  mute_microphone: "Mute microphone / كتم الميكروفون",
  listening_status: "Listening / أسمعك",
  speaking_status: "Speaking / يتحدث",
  connecting_status: "Connecting / جارٍ الاتصال",
  reconnecting_status: "Reconnecting / جارٍ إعادة الاتصال",
  send_message: "Send / إرسال",
  input_label: "Message / رسالة",
  input_placeholder: "Send a message / أرسل رسالة",
  input_placeholder_new_conversation: "Start a conversation / ابدأ محادثة",
  initiate_feedback: "How was the call? / كيف كانت المكالمة؟",
  user_ended_conversation: "Call ended / انتهت المكالمة",
  agent_ended_conversation: "Call ended / انتهت المكالمة",
  accept_terms: "Accept / موافق",
  dismiss_terms: "Cancel / إلغاء",
  error_occurred: "Connection error / خطأ في الاتصال",
};

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
          <span>Tap the phone to call</span>
          <span lang="ar" dir="rtl">اضغط على الهاتف للاتصال</span>
        </p>
        <ArrowDown aria-hidden="true" size={22} className="relative z-[1] mx-auto mt-2 block text-[var(--accent-strong)]" />

        {createElement("elevenlabs-convai", {
          "agent-id": "agent_2201m79rq68hfsx855wpt5p0rwcv",
          "always-expanded": "true",
          "text-input": "false",
          "placement": "bottom",
          "mobile-fullscreen": "false",
          "show-resize-button": "false",
          "show-conversation-id": "false",
          "text-contents": JSON.stringify(widgetText),
          className: "!relative !inset-auto -mt-16 block h-[385px] w-full !z-auto",
          style: {
            "--el-base": "var(--paper)",
            "--el-base-primary": "var(--ink)",
            "--el-base-subtle": "var(--muted)",
            "--el-base-border": "var(--line)",
            "--el-base-hover": "var(--surface-raised)",
            "--el-accent": "var(--accent-strong)",
            "--el-accent-border": "var(--accent-strong)",
            "--el-overlay-padding": "20px",
          },
        })}

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

      <Script
        src="https://unpkg.com/@elevenlabs/convai-widget-embed@0.25.2/dist/index.js"
        strategy="afterInteractive"
      />
    </section>
  );
}
