import { PageIntro, Label } from "@/components/studio/Shared";
import { ContactForm } from "@/components/studio/Interactive";
import { studio } from "@/data/studio";
import { pageMetadata } from "@/lib/seo";
import { PhoneContacts } from "@/components/studio/PhoneContacts";
import { groups } from "@/data/studio";
export const metadata = pageMetadata(
  "Request a Demo or Discuss Your Workflow",
  "Request an AI receptionist demo or discuss custom CRM, booking and invoicing software for your service business.",
  "/contact",
);
export default async function Contact({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  return (
    <>
      <PageIntro
        label="A DEMO AROUND YOUR BUSINESS"
        title="Bring us the call you wish you could delegate."
        description="The routine question. The booking request. The enquiry that arrives when everyone's busy. Tell us what happens today, and we'll work through a useful next step."
      />
      <section className="contact-layout shell">
        <ContactForm initialService={groups[service === "software" ? 1 : 0].name} />
        <noscript>
          <style>{`.guided-brief { display: none; }`}</style>
          <div className="detail-aside">
            <h2>Send us your starting point.</h2>
            <p>
              Email your idea, the service you need, and an approximate budget.
              We’ll take it from there.
            </p>
            <a className="text-link" href={`mailto:${studio.email}`}>
              {studio.email} ↗
            </a>
          </div>
        </noscript>
        <aside className="contact-aside">
          <Label>DIRECT IS GOOD, TOO</Label>
          <h3>Say hello.</h3>
          <a href={`mailto:${studio.email}`}>{studio.email} ↗</a>
          <PhoneContacts placement="contact" />
          <p>
            Central London, United Kingdom
            <br />
            Serving the USA, UK and Australia
          </p>
          <h3 style={{ marginTop: 40 }}>What happens next?</h3>
          <p>
            We’ll ask about your current calls and tools, then agree a relevant
            demo. You can test the questions your callers would actually ask.
            If you’re here for software, we’ll trace the workflow before
            proposing what to build. Scope and costs come before a commitment.
          </p>
        </aside>
      </section>
    </>
  );
}
