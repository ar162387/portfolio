# Niche demos and outreach activity, 29 October 2026

Shah approved pushing the niche demos, recording who interacts and their generated cards in the private dashboard, and making the demos live for outreach. This release reuses the existing Gemini/Pipecat service and Vercel site.

The authenticated dashboard now has **Who tried each demo**: filter by niche, search visitor-provided name/business/contact or card details, and open the saved demo card plus full transcript. All sessions, including anonymous and incomplete ones, are visible. Historical demo sessions also appear. These records stay separate from real consultation conversions and calendar bookings.

Visitors can optionally share their actual business details with a clear follow-up confirmation. Those details are kept separate from the acted sample customer. A narrowly scoped conversation tool can also save owner details explicitly volunteered for studio follow-up; it never treats the roleplayed customer's name as the real prospect. No outreach message is sent automatically, no hidden identity lookup occurs, and supplying a sample-email address is not treated as consent to marketing.

The shared server/database schema gains an additive `niche_demo_visitors` table. Existing conversations, published agent settings and Cal.com configuration are retained. The dashboard can read historic records when demos are off. The release gate, authenticated emergency-off switch and independent email-send gate remain enforced.

Public routes after release:

- https://www.vibecoderzz.com/garage-doors
- https://www.vibecoderzz.com/heating-plumbing
- https://www.vibecoderzz.com/salons
- https://www.vibecoderzz.com/studio-admin

No real email delivery is included in this release. Resend still requires the separately approved verified sender and controlled delivery check described in `niche-demos.md`.

Validation: 86 backend tests and 20 browser/transport tests passed; lint and TypeScript passed. Production build is checked before pushing. A deployment is considered live only after backend health, dashboard endpoints, public page responses, and an actual voice smoke check succeed.

Rollback: use dashboard Emergency off immediately. Original source baseline is `0bfee0e860c6447460896ab844e712d2e0722a16`; the verified complete-history bundle is `/private/tmp/vibecoderzz-pre-niche-0bfee0e.bundle`. Before the backend release, record its actual current source hashes/Git SHA and back up its files/database/environment. Restore that exact backend backup and the prior Vercel deployment together if needed; retain additive tables and newer conversations. Never overwrite the live database with an older snapshot without a separate recovery decision.
