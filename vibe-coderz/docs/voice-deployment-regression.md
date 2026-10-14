# Voice frontend deployment regression — 14 October 2026

The production deployment `dpl_CususQdWmRWBhmoT3VzJ9XVbpLDg` was built from Git commit `9c29dc29efdaa128c2f1cdb6200c336b0aa569e8` on 13 October. That commit added phone contacts and the theme switch. It did not include the voice redesign or reliability changes.

The 4–5 October production releases were built from an uncommitted working-tree snapshot, as recorded in `voice-reliability-plan.md` and `voice-interface-redesign.md`. Git still contained the older bottom-left voice launcher. The subsequent Git-triggered deployment therefore replaced the previously deployed working-tree version with the older voice frontend. No voice files were reverted in the header commit; the repository and deployed application already differed.

The restoration commits the existing right-side launcher, compact sales representative panel, watchdog/recovery logic, transport cancellation handling, signaling diagnostics, input timeout, and cookie placement/settings behavior. The header, phone numbers, and three-position theme switch are preserved. Backend/calendar changes, database files, and credentials are excluded.

## Verification

- All 18 existing frontend voice regression tests pass.
- Targeted frontend lint and the Next.js production build pass.
- Before restoration, production `/api/voice` returned 200 and `available: true`. A Chromium session using synthetic silent audio returned 200 for session creation and signaling and reached the listening state; it was ended. This establishes basic connectivity, not a full voice-response or impaired-network test.
- The local preview uses `127.0.0.1:7860`; no voice service was listening there during the investigation. Its health/session requests returned 503. This is distinct from the production connection check.
- Separate local calendar changes had three failing calendar tests. They are not included in this frontend restoration and the EC2 service is not changed.

Future releases should commit the intended deployable source before publishing and verify that the production deployment's Git SHA matches that source. Publishing a local working-tree snapshot without committing it leaves the next Git-triggered deployment able to replace it with older behavior.
