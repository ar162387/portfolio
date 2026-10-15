import { DiscoveryCallAutoOpen, DiscoveryCallLink } from "@/components/studio/DiscoveryCallLink";
import { ArrowDown, ArrowUpRight, Moon, PhoneIncoming, Users } from "lucide-react";
import { CallExample } from "@/components/studio/CallExample";
import { CareSection, DemoSection, FounderNote } from "@/components/studio/VoiceSections";
import { Button, Label, ServicesSection, Process, CTA } from "@/components/studio/Shared";

export const metadata = { alternates: { canonical: "/" } };

const questions = [
  ["Does this replace our receptionist?", "It can cover routine enquiries when your team is busy, or provide agreed after-hours coverage. We decide what stays with your staff and when the agent should hand over. Your team remains part of the call flow."],
  ["Can it actually book an appointment?", "Where your calendar supports the required integration, we can build and test direct booking. Otherwise, the agent captures a request for your team to confirm. Callers should always know which one has happened."],
  ["What if it doesn't know the answer?", "We define the information it can use and the questions that go to a person. The next step may be a transfer or a callback request, depending on your coverage and phone setup."],
  ["Will we need a new CRM?", "Only if your current workflow needs one. We review your existing tools first. Custom CRM, booking and invoicing software is a separately scoped project."],
  ["What does it cost?", "The quote depends on your call flow, integrations, usage and support needs. We agree setup costs, ongoing care, included usage and any overage rate before launch. Bring your call volumes if you have them."],
  ["Do you only work in one industry?", "We work across Home Services and Health & Beauty in the USA, UK and Australia. The call flow is tailored to your business. We check the fit of each workflow and integration together."],
];

export default function Home() {
  return <>
    <DiscoveryCallAutoOpen />
    <section className="hero voice-hero shell">
      <div className="hero-topline"><Label>AI VOICE AGENTS FOR SERVICE BUSINESSES</Label><span className="availability"><i /> USA · UK · Australia</span></div>
      <div className="hero-body">
        <div className="hero-copy">
          <h1>You’re needed<br /><em>elsewhere.</em></h1>
          <p>On a job. With a client. Finally off the clock.<br />We build and look after AI receptionists that answer routine questions, capture enquiries and help callers book.</p>
          <div className="hero-actions"><Button href="#call-example">See a call unfold</Button><DiscoveryCallLink className="text-link">Let’s talk about your calls <ArrowUpRight size={17} /></DiscoveryCallLink></div>
          <div className="hero-footnote"><span className="tiny-cross" aria-hidden="true">✳</span><span>Your call flow. Your booking rules.<br />A team behind the agent.</span></div>
        </div>
        <CallExample />
      </div>
      <div className="hero-bottom"><span>HOME SERVICES · HEALTH & BEAUTY</span><a href="#coverage">YOUR DAY, WITH FEWER INTERRUPTIONS <ArrowDown size={14} /></a></div>
    </section>
    <section className="voice-coverage shell" id="coverage">
      <div className="section-heading"><div><Label>THE PHONE DOESN’T CHECK YOUR DIARY</Label><h2>Good timing?<br /><em>Rarely.</em></h2></div><p>The call matters. So does the work in front of you. Give routine enquiries a way forward when your team can’t pick up.</p></div>
      <div className="voice-coverage-grid">
        <article><PhoneIncoming size={25} strokeWidth={1.4} /><span>ON THE JOB</span><h3>Hands full.<br />Phone ringing.</h3><p>A service enquiry needs the right questions, a callback number and a clear next step. Your team gets the details to act on.</p></article>
        <article><Users size={25} strokeWidth={1.4} /><span>WITH A CLIENT</span><h3>One person in front of you.<br />Another on the line.</h3><p>Routine questions and appointment enquiries can follow an agreed flow, while your team gives the person in the room their attention.</p></article>
        <article><Moon size={25} strokeWidth={1.4} /><span>AFTER HOURS</span><h3>Closed for the day.<br />Still worth answering.</h3><p>Agree what can be answered or requested outside opening hours, and what needs your team when they’re back.</p></article>
      </div>
    </section>
    <DemoSection />
    <ServicesSection />
    <CareSection />
    <FounderNote />
    <Process />
    <section className="faq-section shell"><Label>BEFORE YOU HAND OVER THE PHONE</Label><div>{questions.map(([q, a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
    <CTA />
  </>;
}
