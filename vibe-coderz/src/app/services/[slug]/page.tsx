import { DeliveryBlueprint } from "@/components/studio/Experience";
import { notFound } from "next/navigation";
import Link from "next/link";
import { services, studio } from "@/data/studio";
import { PageIntro, Label, Button, CTA } from "@/components/studio/Shared";
import { pageMetadata, jsonLd, absolute } from "@/lib/seo";
import { CareSection, DemoSection } from "@/components/studio/VoiceSections";
import { CallExample } from "@/components/studio/CallExample";
export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = services.find((s) => s.slug === slug);
  return s
    ? pageMetadata(s.name, s.detail, `/services/${slug}`)
    : { title: "Service not found" };
}
export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = services.find((s) => s.slug === slug);
  if (!s) notFound();
  return (
    <>
      <nav aria-label="Breadcrumb" className="breadcrumbs shell">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/services">Services</Link>
        <span>/</span>
        <span>{s.name}</span>
      </nav>
      <PageIntro
        label={s.slug === "voice-agents" ? "AI VOICE RECEPTIONISTS / THE FRONT DESK" : "CUSTOM CRM & SOFTWARE / BEHIND THE DESK"}
        title={s.slug === "voice-agents" ? "You’re needed elsewhere. Your callers still need you." : "The call is over. The admin doesn’t have to take all day."}
        description={s.summary}
      />
      <section className="detail-layout shell">
        <div className="detail-body">
          <h2>{s.slug === "voice-agents" ? "A receptionist built around your working day." : "From enquiry to booking and invoice."}</h2>
          <p>{s.detail}</p>
          <h2>{s.slug === "voice-agents" ? "What goes into a useful call." : "What your team needs to get the job done."}</h2>
          <DeliveryBlueprint
            items={s.deliverables}
            group={s.group}
            service={s.slug}
          />
          <p>
            {s.slug === "voice-agents" ? "An appointment request stays a request until it is confirmed. We agree the actions your agent can take, test the connections and decide what happens when it needs a person." : "We agree the workflow, integrations and handover before development begins. Your team sees the working product along the way, so the build stays close to the work."}
          </p>
          <Link href="/work" className="text-link">
            Explore our project work ↗
          </Link>
        </div>
        <aside className="detail-aside">
          <Label>IS THIS FOR YOU?</Label>
          <h3>A good fit for</h3>
          <p>{s.fit}</p>
          <Button href={s.slug === "voice-agents" ? "/contact" : "/contact?service=software"}>{s.slug === "voice-agents" ? "Request your demo" : "Discuss your workflow"}</Button>
        </aside>
      </section>
      {s.slug === "voice-agents" && <><section className="voice-service-heading shell"><Label>FROM HELLO TO A USEFUL NEXT STEP</Label><h2>Follow the enquiry.</h2><p>Explore an illustrated call flow. Then tell us what your own callers need.</p></section><div className="voice-example-detail"><CallExample /></div><DemoSection /><CareSection /></>}
      <section className="shell page-content">
        <Label>{s.slug === "voice-agents" ? "SOFTWARE FOR THE NEXT STEP" : "HELP WITH THE FIRST ENQUIRY"}</Label>
        <div className="service-links">
          {services
            .filter((x) => x.slug !== s.slug)
            .map((x) => (
              <Link key={x.slug} href={`/services/${x.slug}`}>
                {x.name}
                <span>↗</span>
              </Link>
            ))}
        </div>
      </section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@type": "Service",
            name: s.name,
            description: s.detail,
            url: absolute(`/services/${s.slug}`),
            provider: {
              "@type": "Organization",
              name: studio.name,
              url: studio.url,
            },
          }),
        }}
      />
      <CTA software={s.slug === "custom-software"} />
    </>
  );
}
