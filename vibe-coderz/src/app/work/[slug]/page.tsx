import { ProjectGallery } from "@/components/studio/Experience";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { projects } from "@/data/studio";
import { PageIntro, Label, Button, CTA } from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";
const context: Record<
  string,
  { problem: string; approach: string; features: string[] }
> = {
  "blackstone-crm": {
    problem:
      "Sales teams need a shared place for customer records, inventory, invoices, and financial activity. When these are disconnected, routine work becomes harder to track.",
    approach:
      "Bring core sales workflows into one role-based interface, with navigation organised around the tasks the team performs every day.",
    features: [
      "Customer and invoice management",
      "Inventory and financial reporting",
      "Role-based access and activity records",
    ],
  },
  "around-you": {
    problem:
      "Local commerce needs to connect customers, merchants, and delivery runners while accounting for where each order can actually be delivered.",
    approach:
      "Use a location-aware mobile architecture with geospatial validation and real-time updates to connect ordering and fulfilment.",
    features: [
      "Multi-shop carts and merchant tools",
      "PostGIS delivery-zone validation",
      "Real-time order and runner tracking",
    ],
  },
  "bms-system": {
    problem:
      "Building managers juggle residents, bookings, inspections, documents, and announcements across many daily interactions.",
    approach:
      "Organise work around the selected building, with shared records, scoped access, and real-time alerts that keep the relevant people informed.",
    features: [
      "Amenity bookings and inspections",
      "Document library and expiry reminders",
      "Targeted announcements and real-time alerts",
    ],
  },
  "tgif-food": {
    problem:
      "A restaurant needs a customer ordering experience and an operational workspace that can keep menus, orders, and payments in step.",
    approach:
      "Connect a customer-facing delivery platform with a CMS for daily menus, catalogue changes, and order handling.",
    features: [
      "Daily menu publishing and item management",
      "Stripe payment integration",
      "Role-based CMS and order management",
    ],
  },
  "yapp-multimedia": {
    problem:
      "Combining a still image with recorded audio should be possible without a complicated video editing workflow.",
    approach:
      "Build a focused Flutter experience around capture, recording, media processing, and playback, using provider-based state management.",
    features: [
      "Image capture and audio recording",
      "FFmpeg-based video creation",
      "Playback, renaming, deletion, and sharing",
    ],
  },
};
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = projects.find((p) => p.id === slug);
  return p
    ? pageMetadata(`${p.title} Case Study`, p.brief, `/work/${slug}`)
    : { title: "Project not found" };
}
export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = projects.find((p) => p.id === slug);
  if (!p) notFound();
  const c = context[p.id];
  return (
    <>
      <nav className="breadcrumbs shell" aria-label="Breadcrumb">
        <Link href="/work">Selected work</Link>
        <span>/</span>
        <span>{p.title}</span>
      </nav>
      <PageIntro
        label={p.category.toUpperCase()}
        title={p.title}
        description={p.description}
      />
      <section className="shell">
        <div className="project-facts">
          <div>
            <Label>DISCIPLINE</Label>
            <p>{p.category}</p>
          </div>
          <div>
            <Label>CONTRIBUTION</Label>
            <p>{p.role}</p>
          </div>
          <div>
            <Label>TECHNOLOGY</Label>
            <p>{p.tech}</p>
          </div>
        </div>
        <div className="case-hero-image">
          <Image
            src={p.image}
            alt={`${p.title} product screenshot`}
            fill
            priority
            sizes="(max-width: 760px) 95vw, 85vw"
          />
        </div>
      </section>
      <section className="detail-layout shell">
        <div className="detail-body">
          <h2>The problem</h2>
          <p>{c.problem}</p>
          <h2>The approach</h2>
          <p>{c.approach}</p>
          <h2>Inside the product</h2>
          <ul>
            {c.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
        <aside className="detail-aside">
          <Label>PROJECT NOTES</Label>
          <h3>Explore the build</h3>
          <p>
            This overview describes the delivered functionality. Business impact
            metrics have not been published.
          </p>
          <a
            className="text-link"
            href={p.links.github}
            target="_blank"
            rel="noreferrer"
          >
            View project repository ↗
          </a>
        </aside>
      </section>
      <section className="shell">
        <ProjectGallery images={p.screenshots} title={p.title} />
        <div className="page-content">
          <Button href="/work">Back to selected work</Button>
        </div>
      </section>
      <CTA />
    </>
  );
}
