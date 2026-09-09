import { PageIntro } from "@/components/studio/Shared";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("Privacy Policy", "How Vibecoderzz uses analytics and handles contact enquiries.", "/privacy");

export default function Privacy() {
  return (
    <>
      <PageIntro label="PRIVACY" title="Your data, handled with care." description="A plain-language overview of how we use website analytics and contact information." />
      <article className="privacy-page shell">
        <section>
          <h2>Analytics cookies</h2>
          <p>We only load Google Analytics after you choose “Accept analytics” in the cookie banner. It helps us understand site visits, pages viewed, scrolling, and which contact actions people use.</p>
          <p>Choosing “Reject analytics” means Google Analytics is not loaded. You can revisit your choice at any time using the Cookie settings link in the footer.</p>
        </section>
        <section>
          <h2>Contact enquiries</h2>
          <p>Our project brief opens a draft in your own email application. The website does not submit that brief to our servers. If you send an email, we use the information you provide to reply to your enquiry.</p>
        </section>
        <section>
          <h2>Your choices</h2>
          <p>You can control or delete cookies through your browser settings. For questions about this policy or your information, email {" "}<a href="mailto:Vibe.coderz83@gmail.com">Vibe.coderz83@gmail.com</a>.</p>
        </section>
        <p className="privacy-updated">Last updated: 10 September 2026.</p>
      </article>
    </>
  );
}
