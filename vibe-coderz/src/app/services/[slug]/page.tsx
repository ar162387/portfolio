import { DeliveryBlueprint } from "@/components/studio/Experience";
import { notFound } from "next/navigation";
import Link from "next/link";
import { services, studio } from "@/data/studio";
import { PageIntro, Label, Button, CTA } from "@/components/studio/Shared";
import { pageMetadata, jsonLd, absolute } from "@/lib/seo";
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
        label={`${s.code} / ${s.group.toUpperCase()}`}
        title={s.name}
        description={s.summary}
      />
      <section className="detail-layout shell">
        <div className="detail-body">
          <h2>Built around the work that matters.</h2>
          <p>{s.detail}</p>
          <h2>What we can deliver</h2>
          <DeliveryBlueprint
            items={s.deliverables}
            group={s.group}
            service={s.slug}
          />
          <p>
            Scope, integrations, and handover are agreed together before
            development begins. We make the decisions and trade-offs visible
            throughout the project.
          </p>
          <Link href="/work" className="text-link">
            Explore our project work ↗
          </Link>
        </div>
        <aside className="detail-aside">
          <Label>IS THIS FOR YOU?</Label>
          <h3>A good fit for</h3>
          <p>{s.fit}</p>
          <Button href="/contact">Discuss your project</Button>
        </aside>
      </section>
      <section className="shell page-content">
        <Label>RELATED SERVICES</Label>
        <div className="service-links">
          {services
            .filter((x) => x.group === s.group && x.slug !== s.slug)
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
      <CTA />
    </>
  );
}
