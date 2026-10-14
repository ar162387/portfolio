"use client";

import { useState } from "react";
import { ArrowRight, Check, ChevronRight, ClipboardList, PhoneIncoming } from "lucide-react";

const examples = [
  {
    name: "Home services",
    context: "You're on a job. Another enquiry comes in.",
    caller: "Hi, do you service boilers? Monday morning would be ideal.",
    response: "I can help with a service enquiry. What's your postcode and the best number for the team to reach you?",
    note: "Boiler service enquiry",
    details: [["Area", "Within service area"], ["Preferred time", "Monday morning"], ["Next step", "Team to confirm availability"]],
    takeaway: "The team gets the request and callback details, ready to follow up.",
  },
  {
    name: "Health & beauty",
    context: "You're with a client. Someone wants an appointment.",
    caller: "I'd like to book a first consultation. Is Tuesday afternoon possible?",
    response: "I can take an appointment request. May I have your name and the best number for reception to contact you?",
    note: "First consultation request",
    details: [["Visit", "First consultation"], ["Preferred time", "Tuesday afternoon"], ["Next step", "Reception to confirm availability"]],
    takeaway: "Reception gets a clear appointment request, without interrupting the session.",
  },
];

export function CallExample() {
  const [example, setExample] = useState(0);
  const [step, setStep] = useState(0);
  const current = examples[example];
  const steps = ["The call", "The answer", "Your next step"];
  return (
    <section className="call-example" id="call-example" aria-label="Illustrated receptionist call flow">
      <div className="call-example-top"><span className="call-example-kicker"><PhoneIncoming size={15} /> A CALL WITH SOMEWHERE TO GO</span><span>0{step + 1} / 03</span></div>
      <div className="call-example-options" role="group" aria-label="Choose a business example">
        {examples.map((item, index) => <button type="button" key={item.name} aria-pressed={example === index} onClick={() => { setExample(index); setStep(0); }}>{item.name}</button>)}
      </div>
      <p className="call-example-context">{current.context}</p>
      <div className="call-example-stage" aria-live="polite" aria-atomic="true">
        {step < 2 ? <>
          <span className="call-stage-label">{step === 0 ? "THE CALLER" : "THE RECEPTIONIST"}</span>
          <blockquote>{step === 0 ? current.caller : current.response}</blockquote>
          <div className="call-example-wave" aria-hidden="true">{[12, 23, 16, 37, 29, 48, 31, 21, 42, 27, 15, 25, 10].map((height, index) => <i key={index} style={{ height }} />)}</div>
        </> : <div className="call-outcome">
          <span className="call-stage-label"><ClipboardList size={15} /> THE NOTE YOUR TEAM RECEIVES</span>
          <h3>{current.note}</h3>
          <span className="call-request-state"><Check size={13} /> Request captured</span>
          <dl>{current.details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <p>{current.takeaway}</p>
        </div>}
      </div>
      <div className="call-example-progress" role="group" aria-label="Explore the call stages">
        {steps.map((label, index) => <button type="button" key={label} aria-pressed={step === index} onClick={() => setStep(index)}><span>{index + 1}</span>{label}{index < 2 && <ChevronRight size={13} aria-hidden="true" />}</button>)}
      </div>
      <div className="call-example-bottom"><small>Illustrated example · sample data</small>{step < 2 ? <button type="button" onClick={() => setStep(step + 1)}>See {step === 0 ? "the answer" : "the next step"} <ArrowRight size={15} /></button> : <button type="button" onClick={() => setStep(0)}>Start again <ArrowRight size={15} /></button>}</div>
    </section>
  );
}
