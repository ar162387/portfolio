import { ReadingGuide } from "@/components/studio/Experience";
import { notFound } from "next/navigation";
import Link from "next/link";
import { articles } from "@/data/studio";
import { PageIntro, CTA } from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  return a
    ? pageMetadata(a.title, a.summary, `/insights/${slug}`)
    : { title: "Article not found" };
}
export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  if (!a) notFound();
  return (
    <>
      <nav className="breadcrumbs shell" aria-label="Breadcrumb">
        <Link href="/insights">Studio notes</Link>
        <span>/</span>
        <span>{a.category}</span>
      </nav>
      <PageIntro
        label={`${a.category} / BY VIBECODERZZ`}
        title={a.title}
        description={a.summary}
      />
      <div className="reading-layout shell">
        <ReadingGuide sections={a.sections.map(([heading]) => heading)} />
        <article className="article-body">
          {a.sections.map(([h, p], i) => (
            <section key={h} id={`note-section-${i}`}>
              <h2>{h}</h2>
              <p>{p}</p>
            </section>
          ))}
          {a.source && (
            <p className="source-link">
              <a href={a.source}>
                Further reading: Google’s SEO Starter Guide ↗
              </a>
            </p>
          )}
          <Link
            className="text-link"
            style={{ marginTop: 40 }}
            href="/insights"
          >
            Back to all notes ↗
          </Link>
        </article>
      </div>
      <CTA />
    </>
  );
}
