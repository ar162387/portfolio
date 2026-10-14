import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, AudioLines, ClipboardCheck, Headphones, SlidersHorizontal } from "lucide-react";
import { AssistantTrigger } from "./AssistantTrigger";
import { Button, Label } from "./Shared";

export function DemoSection() {
  const available = Boolean(process.env.VOICE_AGENT_URL && process.env.VOICE_AGENT_TOKEN);
  return <section className="voice-demo-section shell" id="demo">
    <div><Label>HEAR HOW WE THINK. TRY HOW WE TALK.</Label><h2>Go on.<br /><em>Ask the awkward question.</em></h2><p>A caller changes their mind. A date is unavailable. Someone asks something unexpected. That&apos;s where a useful agent earns its place.</p></div>
    <div className="voice-demo-invite"><AudioLines size={34} strokeWidth={1.3} /><h3>{available ? "Meet the studio's own AI assistant." : "Let's put your calls to the test."}</h3><p>{available ? "Ask about our services or discuss a project. This is our website assistant; your business's receptionist is configured and tested separately." : "Tell us the questions your team hears every day. We'll walk through a relevant demo and agree what your receptionist should handle."}</p>{available ? <AssistantTrigger /> : <Button href="/contact">Request a demo for your business</Button>}<small>{available ? "Opens a conversation. Your microphone stays off until you choose to start." : "A real conversation about your workflow. No need to replace your CRM."}</small></div>
  </section>;
}

export function CareSection() {
  const care = [
    { Icon: ClipboardCheck, title: "Your rules, before the first call.", text: "We agree the answers, coverage and booking rules. And what goes straight to a person." },
    { Icon: Headphones, title: "The awkward calls get attention.", text: "Call reviews help catch gaps in the conversation. We agree a review and support plan with you before launch." },
    { Icon: SlidersHorizontal, title: "Changes have a process.", text: "New opening hours? Different services? We test agreed updates and keep your team clear on what changed." },
  ];
  return <section className="voice-care-section shell" id="ongoing-care"><div className="section-heading"><div><Label>A TEAM BEHIND THE AGENT</Label><h2>The first call<br />is just the <em>start.</em></h2></div><p>Your business changes. Your receptionist needs care, too. Setup and ongoing responsibilities are part of the conversation from day one.</p></div><div className="voice-care-grid">{care.map(({ Icon, title, text }) => <article key={title}><Icon size={26} strokeWidth={1.4} /><h3>{title}</h3><p>{text}</p></article>)}</div></section>;
}

export function FounderNote() {
  return <section className="founder-note shell"><figure className="founder-portrait"><Image src="/images/shah-founder-portrait.png" alt="Shah Abdur Rehman, founder of Vibecoderzz, holding a telephone in a studio portrait" width={1122} height={1402} sizes="(max-width: 760px) calc(100vw - 48px), (max-width: 1100px) 38vw, 440px" /></figure><div><Label>SHAH ABDUR REHMAN / FOUNDER</Label><h2>I build it.<br /><em>Then I try to break it.</em></h2><p>A demo should stand up to more than a perfect question. I share the builds, the awkward tests and the decisions behind them, so you can see how I work before we work together.</p><Link className="text-link" href="https://www.instagram.com/vibecoderzai/" target="_blank" rel="noopener noreferrer">See the work behind the work <ArrowUpRight size={16} /></Link></div></section>;
}
