# Agency website and launch-kit verification

14 October 2026. Website implementation is local; no production deployment, Instagram edits, comments, DMs or scheduling were performed.

## Website

- `npm run lint`: passed.
- `npm run build`: passed, including TypeScript and page generation.
- `node --test tests/*.test.mjs`: all 18 existing frontend voice regression tests passed. The initial run exposed an unnecessary cross-component import in the new assistant opener; removing that dependency restored the suite without weakening tests.
- HTTP 200: homepage, services overview, both service detail pages, about, contact with software selection, Open Graph image and sitemap. The social preview returned `image/png`.
- Desktop light/dark layouts inspected. Mobile inspected at 390px and 320px; document scroll width matched the viewport. Existing clipped project art and decorative orbit extend inside their containers without widening the page.
- Illustrated call flow: business selection, stage controls and resulting appointment-request state checked. Home and health/beauty use different examples; requests are not labelled as confirmed appointments.
- Software CTA: `/contact?service=software` correctly preselects Custom CRM & software. Business, country and workflow survive the steps and appear in the review. Sample details were used to prepare the enquiry; no email was sent.
- Assistant CTA: the real local health request returned 503 because the configured loopback service was not running. The new CTA showed its unavailable message and a walkthrough-request link.
- The healthy-response UI was checked first with a mocked health response, then against the running local service: the CTA opened the existing dialog, with no microphone stream active before Start talking. The mock was removed. No full spoken conversation or live booking was tested in this pass.

The published service descriptions supply the assistant's approved context through the existing voice proxy. No Python backend, calendar, dashboard or credential source changes were made in this implementation pass.

## Content

- Recommended name and alternatives fit the conservative 30-character name budget.
- Recommended bio: 134 characters including line breaks.
- Three spoken scripts: approximately 30.9s, 34.5s and 30.9s at 165 words/minute. No individual spoken beat exceeded four seconds; selected hooks were under three seconds. Actual recordings and demo pauses need a final edit.
- Three Reel captions and the carousel caption: READY on the installed caption-format linter, with one recognized action and three topic hashtags each.
- Three scripts passed the installed human-editing heuristic. Short bio and some editorial copy received REVIEW; manual judgement and evidence checking remain necessary. These scores are not external AI-detector results or predictions of reach.
- Demo scenarios are expressly illustrative until actual corresponding footage is recorded. No measured revenue, client conversion, missed-call statistic, guaranteed launch date or copied competitor pricing is asserted.
- Four-week CSV contains sixteen draft slots and no invented performance numbers.

## Review artifacts

- `output/playwright/agency-home-desktop.png`: full homepage, light theme.
- `output/playwright/agency-home-dark.png`: desktop hero and illustrated request state.
- `output/playwright/agency-home-320.png`: narrow mobile viewport.
- `output/playwright/agency-demo-mobile.png`: unavailable-assistant fallback.
- `output/playwright/agency-contact-mobile.png`: mobile enquiry review/preparation.
- `checks/`: local writing and timing receipts. Source scripts and captions are delivered as separate text files and embedded in the launch kit.

## Remaining launch work

Publish the approved website revision through the normal release workflow; inspect and record the founder's business demos; produce the founder footage and approved carousel artwork; update the Instagram fields and publish the first batch. Both local servers were left running. An end-to-end spoken conversation still needs checking before presenting this revision as verified live voice. The existing contact mechanism prepares an email draft for the visitor to send.
