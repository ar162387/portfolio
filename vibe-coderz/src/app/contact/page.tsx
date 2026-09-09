import { PageIntro, Label } from "@/components/studio/Shared";
import { ContactForm } from "@/components/studio/Interactive";
import { studio } from "@/data/studio";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Start a Project",
  "Tell Vibe Coderzz about your software, AI automation, or digital growth project. Based in Lahore, working worldwide.",
  "/contact",
);
export default function Contact() {
  return (
    <>
      <PageIntro
        label="LET’S MAKE SOMETHING USEFUL"
        title="Every good build starts with a conversation."
        description="An early idea, a stubborn problem, or a product ready for its next chapter. Tell us where you are and where you want to go."
      />
      <section className="contact-layout shell">
        <ContactForm />
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
          <p>
            Lahore, Pakistan
            <br />
            Working with clients worldwide
          </p>
          <h3 style={{ marginTop: 40 }}>What happens next?</h3>
          <p>
            We’ll review your brief, ask a few useful questions, and work out
            whether we’re a good fit. Then we can define a sensible scope and
            next step.
          </p>
        </aside>
      </section>
    </>
  );
}
