# Niche receptionist demos: local review, 27 October 2026

This is an unpushed local change. No public deployment, DNS change, Resend provisioning or real email send was performed. The working tree was clean at baseline `0bfee0e860c6447460896ab844e712d2e0722a16`.

## Try it on Shah's Mac

- Garage doors: <http://127.0.0.1:3016/garage-doors>
- Heating and plumbing: <http://127.0.0.1:3016/heating-plumbing>
- Salons: <http://127.0.0.1:3016/salons>
- Emergency controls: <http://127.0.0.1:3016/studio-admin>

These are local addresses, not prospect outreach links. The frontend listens on `127.0.0.1:3016`; the existing Pipecat server listens on `127.0.0.1:8766`. The review service uses the existing local Gemini key in memory, the existing `gemini-3.8-live` model and Sulafat voice, and the isolated database `/private/tmp/vibecoderzz-niche-review.db`. No key was copied into the repository or browser. The local homepage sales flow has no calendar credentials; the production homepage is untouched.

Open a niche URL in a normal browser on this Mac. Press **Start talking**, allow microphone access, and play a customer using a made-up first name. For garage doors, ask for a garage door survey, use “Jamie”, and request Thursday at 2 pm. Confirm the receptionist's read-back. The page then shows the labelled sample owner email. The requested time is unchecked and no real appointment exists. When sending is enabled, the email form targets the participant's own entered and explicitly confirmed address. Sending is disabled for this review; its on-screen notice says so explicitly.

The local dashboard test account is `review@example.com`, password `local-review-password123`. This account exists only in the isolated localhost database. Its **Emergency off: stop all demos** button blocks new niche calls and sample email requests, invalidates older demo sessions, and closes active niche calls. Enable again for a fresh test. Do not use the agent playground audition to test a niche; the playground still configures the homepage agent.

The live review launcher is `/private/tmp/vibecoderzz-live-review.py`. It reads only existing Google model/voice credentials from the primary checkout's voice `.env`, overrides the database and local service credentials, removes calendar/email credentials, forces email sending off, and verifies a Google Live connection before starting the existing `server:app`. Run it with the primary checkout's existing voice virtual environment, from this worktree's `voice-agent/` directory. `--enable` is an explicit local initial enable; omit it on restart to preserve an emergency-off state. It creates no separate voice architecture.

The frontend can be restarted from this worktree using:

```sh
VOICE_AGENT_URL=http://127.0.0.1:8766 VOICE_AGENT_TOKEN=local-review-only npm run dev -- --hostname 127.0.0.1 --port 3016
```

## Implementation and boundaries

- The same `VoiceAssistant`, `/api/voice` proxy, session tokens, Pipecat transport, Gemini service, recovery, and `AgentConfig` compiler remain in use. A URL supplies only one validated key: `garage-doors`, `salons`, or `heating-plumbing`. No caller-supplied prompt, model or tool configuration reaches the model; sample-email addresses are handled by the webpage, not the model.
- Server-owned templates reuse the current published model/voice. All initial niche templates use natural contemporary British delivery. No local service area, regional accent, real client, opening hours, price or endorsement is invented. Voice snapshots and niche bindings stay pinned across reconnect/restart. A reconnect cannot switch niches or become the homepage agent.
- `complete_sample_appointment` handles sample requests. The 29 October outreach extension adds `record_demo_visitor_details` for explicitly volunteered owner details, separately from roleplayed customer details. It validates service and explicit confirmation, persists the confirmed request (allowing confirmed corrections until its one email attempt), then notifies the page to open its email preview. Live calendar and qualification tools are absent. The calendar factory and CRM write functions also refuse demo records as a second boundary.
- Demo transcript/session records are labelled `channel=demo`; they do not advance sales qualification and are excluded from the dashboard sales pipeline and conversion metrics. Sample details and email attempts live in additive `niche_demo_*` tables. Existing tables are not altered or deleted.
- No runtime recipient is fixed to Shah's inbox. Only the participant's own address plus explicit webpage consent can initiate one sample send after completion. The LLM cannot send mail or select a recipient. The server never accepts custom message bodies or bulk recipient lists.
- The Resend adapter uses the existing HTTP client, the documented send API, a stable idempotency key and a persisted attempt before network access. Limits are one send attempt per session, one per recipient in 24 hours, and ten globally per hour, shared through the database. An uncertain timeout is shown as unconfirmed and is never blindly retried. A checkbox is the participant's ownership attestation, not independent proof of mailbox ownership; a public campaign should review abuse controls before opening traffic.

## Email: verified and pending

The exact generated local content is in [niche-demo-sample-email.txt](niche-demo-sample-email.txt). It has no sender/recipient placeholders presented as real addresses, starts with `[SAMPLE / DEMO]`, and explicitly says nothing is booked. The adapter follows [Resend's send API](https://resend.com/docs/api-reference/emails/send-email).

Read-only Marketplace discovery found Resend as the messaging integration. Account listing found `resend-email-amethyst-flame`, status **Onboarding**, attached to Vercel project **amore**, not **portfolio**. This worktree is not linked to a Vercel project; the primary checkout is linked to `portfolio`. Neither this worktree nor the primary local voice configuration has `RESEND_API_KEY` or `DEMO_EMAIL_FROM`. Production Vercel variable names currently list only `VOICE_AGENT_TOKEN` and `VOICE_AGENT_URL`.

No usable Resend key or verified sender was established for this project. Sender domain status could not be checked without an authenticated Resend account/key; an onboarding resource elsewhere is not evidence of working delivery. No service was installed, claimed or moved. No DNS or account was changed.

Concrete proposal for review, not a configured identity: **Vibecoderzz Demo <demo@demo.vibecoderzz.com>**, on a Resend-verified dedicated sending subdomain. Confirm ownership, DNS access, the correct Resend workspace, and its existing plan before setup. A controlled first test could target the site's existing studio contact `Vibe.coderz83@gmail.com` only after Shah explicitly confirms that test recipient and the saved sample content. Public runtime delivery would still target the participant's own confirmed address.

Remaining steps require separate approval: choose/verify the sending identity, provision or connect the intended Resend resource if needed, place a narrowly scoped send key and sender in the existing backend secret store, approve one concrete test recipient/content, and verify actual inbox delivery. Normal existing Gemini usage applies to live voice tests. Resend plan limits/billing and any DNS or service charges have not been verified or approved; do not create a paid plan or new account implicitly.

## Release gates and emergency off

Both voice gates default off: backend environment `NICHE_DEMOS_ALLOWED=false`, plus the persisted authenticated dashboard switch. The local review alone sets the environment true and has its local dashboard switch on. Email has a separate `DEMO_EMAIL_SEND_APPROVED=false` gate and requires `RESEND_API_KEY` plus a verified `DEMO_EMAIL_FROM`. None of these are browser-exposed.

Off is enforced before session creation, at offers/reconnect, inside the live watcher, at sample completion, and in the email handler. Off increments the persisted generation, so re-enabling cannot revive an older demo. Workers check the database at roughly one-second intervals; the dashboard also cancels active demo tasks immediately on its worker and sends a client stop notification. Already accepted external email cannot be recalled. Homepage live calls/tools are unaffected by demo shutdown.

The existing SSM environment allowlist now supports the four new settings; merely deploying this code does not enable them. The main agent settings singleton is never published with niche content.

## Release targets and review checklist

Read-only inspection confirmed Vercel project `portfolio`, root directory `vibe-coderz`, Node 24, production alias <https://www.vibecoderzz.com>. The current production deployment was Ready: `dpl_2P2SRcaSL4CU7WiYnmQENmuTYBPk`, URL `portfolio-ac88gdhrz-ar162387s-projects.vercel.app`, created 16 October 2026. No release was performed here.

The existing backend is documented at <https://dev.vibecoderzz.com/voice/>; its unauthenticated `/health` returned 401, confirming the reachable protected endpoint. The documented service is `vibecoderzz-voice`, port 7860, checkout `/opt/vibecoderzz/portfolio/vibe-coderz/voice-agent`, PostgreSQL database `vibecoderzz_voice`, environment `/etc/vibecoderzz/voice-agent.env`, secrets prefix `/nimbess/prod/vibecoderzz/`. See [the existing deployment process](../voice-agent/README.md) and `voice-agent/deploy/`. These are documented targets; production files, secrets and database were not inspected or modified remotely.

Before any later approved release:

1. Review the local calls, exact sample email and changed files. Keep both release gates off until approval. Choose a verified sender and a concrete controlled recipient for any mail test.
2. Record the actual current frontend deployment ID/Git SHA and backend release/Git SHA; back up the live database and backend files while idle. The local baseline below is not proof that production has the same Git SHA.
3. Commit the reviewed source before publishing; earlier voice regression notes document why uncommitted working-tree deploys drifted. Release backend and frontend together through the existing process, without recreating the stack or running unrelated infrastructure installers.
4. Confirm additive tables initialize, homepage sales/recovery and calendar behavior remain intact, dashboard auth works, and niche calls remain blocked while off.
5. Enable only the approved demo scope. Check live spoken input, interruptions, reconnect, fictional appointment completion, automatic sample-email preview, and emergency off while a demo is active. Re-enable only for fresh sessions.
6. Only after specific mail approval, configure the verified Resend sender/key on the backend, enable the separate mail gate, send the one approved sample, and check actual inbox delivery. An accepted provider ID alone is not proof of delivery.
7. Approve public release and prospect link distribution separately. Do not put localhost addresses into outreach.

The installed Vercel CLI is 59.1.3; its own update notice recommends 65.4.0. Upgrade separately with `npm i -g vercel@latest` for compatibility before later approved provisioning/release work. No global tooling was upgraded here.

## Baseline and rollback

Verified baseline commit: `0bfee0e860c6447460896ab844e712d2e0722a16`. A complete-history Git bundle was created and verified at `/private/tmp/vibecoderzz-pre-niche-0bfee0e.bundle`. No commits, pushes or destructive resets were made.

The fastest operational rollback is the dashboard **Emergency off** button. For defense in depth, an operator can set `NICHE_DEMOS_ALLOWED=false` and `DEMO_EMAIL_SEND_APPROVED=false` in the existing backend environment through the approved release process, then restart when appropriate. The main published agent configuration needs no rollback because demos never change it.

For local source rollback without discarding later work, first copy this worktree (including new untracked files) or save a full backup; inspect `git status` and preserve any later edits. Restore only the tracked files listed below from the baseline using `git restore --source=0bfee0e860c6447460896ab844e712d2e0722a16 --worktree -- <listed paths>`. Move the new paths listed below into the backup directory instead of deleting them. Do not use `git reset --hard` or `git clean`. The existing Git commit and bundle remain recoverable.

Tracked files changed:

```text
src/app/api/studio-admin/[...path]/route.ts
src/app/api/voice/route.ts
src/app/api/voice/session/route.ts
src/app/layout.tsx
src/app/privacy/page.tsx
src/app/voice-agency.css
src/components/studio-admin/AgentPlayground.tsx
src/components/studio-admin/Dashboard.tsx
src/components/studio/VoiceAssistant.tsx
src/components/studio/voice-assistant.module.css
tests/voice-assistant-recovery.test.mjs
voice-agent/.env.example
voice-agent/agent_config.py
voice-agent/bot.py
voice-agent/calendar_tools.py
voice-agent/dashboard_store.py
voice-agent/deploy/pull-secrets.sh
voice-agent/server.py
```

New paths:

```text
docs/niche-demos.md
docs/niche-demo-sample-email.txt
docs/niche-demo-evals.md
docs/niche-demo-eval-results.json
docs/niche-demo-eval-g1-refinement.json
docs/niche-demo-eval-salon-refinement.json
src/app/[niche]/page.tsx
src/app/api/voice/demo-email/route.ts
src/components/studio-admin/DemoControls.tsx
src/components/studio/VoiceAssistantMount.tsx
src/lib/niche-demos.ts
voice-agent/niche_demos.py
voice-agent/test_niche_demos.py
```

For a later approved production rollback, turn demos off first, restore the recorded prior backend release and Vercel deployment together, and retain the additive demo tables. Do not restore a database snapshot over newer real conversations without a separate recovery decision. The previous production playground backup documented in `agent-playground.md` is `/opt/vibecoderzz/voice-releases/playground-20261015T181348Z/backup/`; verify its suitability before use.

## Verification completed

- 84 backend tests passed, including 15 niche boundary/consent/correction cases; 20 browser recovery/transport tests passed. Lint, TypeScript, shell syntax and whitespace checks passed. Production build passed.
- Local desktop and 390px mobile pages rendered without horizontal overflow; niche pages have one inline call panel and no duplicate sales launcher. The homepage retained its original sales launcher and no niche copy.
- Existing Gemini model/voice connection verified. Actual browser Pipecat/WebRTC audio playback, request read-back, confirmed sample persistence and automatic email preview were observed using silent synthetic input and typed sample details. Physical microphone capture and accent quality remain Shah's manual checks.
- Four researched generated-dialog cases were run: trapped roller door, no-hot-water boiler intake, gas smell, and new colour/patch-test enquiry with a direct human-identity question. Garage wording and salon policy wording received one focused refinement run each. See [the acceptance table and exact observed outputs](niche-demo-evals.md). These runs are not claims that every proposed scenario passed.
- No real email, calendar event, invitation, qualified lead or public deployment was created. Existing provider usage applied only to the explicitly authorized bounded voice reviews.

Final live-browser checks: the updated opener was observed exactly as “Johnny Garage Doors, how can I help?”. Authenticated emergency off returned success during an active synthetic-input voice call; the UI immediately ended the conversation, displayed the off message, and released browser audio. The local switch was then re-enabled for fresh user tests. The runtime remains localhost-only with email sending disabled.
