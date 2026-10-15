# Calendar booking correction — 5 October 2026

The live Cal.com event (`7096462`, `free-discovery-call`) originally inherited a Monday–Friday, 09:00–17:00 Asia/Karachi schedule. The agent additionally filtered every slot outside 09:00–20:00 in the visitor timezone. For America/Chicago, the host schedule converted to approximately 23:00–07:00, so every slot was discarded even though Cal.com returned openings. The event duration was 30 minutes.

## Live configuration and backend

- Attached a dedicated schedule (`2453736`, “Vibecoderzz 24/7 consultations”) in Asia/Karachi, every day 00:00–23:59. Cal.com merges consecutive daily windows; verified appointments across midnight. The original default working-hours schedule is preserved.
- Changed the event to 60 minutes, 30-minute start intervals, zero minimum notice and zero buffers. Seats and manual confirmation are disabled. Host profile remains Asia/Karachi.
- Removed visitor-hour filtering. Cal.com is the source of truth for availability and booking conflicts.
- Converted inclusive visitor-local dates to UTC query bounds, accounting for DST. Extended the query end to include one-hour appointments crossing midnight, while filtering returned starts to the requested local dates.
- Accept both documented string slot responses and object responses, and request `format=range` explicitly. Malformed/error responses produce an error rather than an empty calendar.
- “First available” searches automatically in bounded ranges up to 90 days. The prompt includes the current UTC date/time for resolving relative dates.
- Booking requires explicit customer confirmation and a previously offered timestamp. Normalize it to UTC, recheck Cal.com immediately before creation, preserve the attendee IANA timezone, and never submit conflict overrides.
- Uncertain booking failures do not claim that a booking definitely was or was not created.

Both `bot.py` and `calendar_tools.py` are deployed on the existing EC2 voice service. The deployed service returned openings for Asia/Karachi, America/Chicago, and Europe/London and passed authenticated health checks after restart.

Rollback files are retained on the server at `/opt/vibecoderzz/voice-releases/rollback-calendar-20261005/`. Restore those two Python files and restart `vibecoderzz-voice` to restore the prior backend. A second snapshot before the midnight-boundary follow-up is at `rollback-calendar-midnight-20261005/`. Original event/schedule configuration was captured locally at `/tmp/vibecoderzz-cal-before.json`; restoring code alone does not revert the Cal.com configuration.

## Dashboard

The dashboard appointment field now explicitly formats Asia/Karachi time and labels it Pakistan time. Other dashboard timestamps continue to use browser time. This frontend change is built in preview `dpl_pNr6kaX7mzR9mrrZtWZEDB8frm2e`: https://portfolio-q4vpjxnzo-ar162387s-projects.vercel.app. Following the user's explicit approval, a fresh production build with production environment settings was published as `dpl_9DuCaFuvawXGqmCAysH3yuoeU6Se` (https://portfolio-25ozyokw6-ar162387s-projects.vercel.app), and Vercel confirmed the alias https://www.vibecoderzz.com. Preview has no production voice credentials, so it was not promoted blindly. Previous frontend production deployment `dpl_GUQgdBfzT6E8TWGWyzVH5sN3GGE8` is retained for rollback.

## Verification and limits

- 53 Python tests pass, including timezone/DST bounds, API response formats, overnight openings, first-available search, errors, unoffered slots, unavailable slots, booking timezone payloads, midnight crossings, and requested times beyond the initial suggestions.
- 17 frontend regression tests, TypeScript, targeted ESLint, whitespace checks, and production Next.js build pass.
- Live Cal.com query for Saturday 10 October returns all 48 half-hour starts from 00:00 to 23:30 for one-hour consultations, including the appointment finishing Sunday 00:30.
- Live temporary one-hour reservations reject attempts at the same start and starts 30 minutes before/after; a start exactly one hour later succeeds. All temporary reservations were deleted. Cal.com's slot-list endpoint still listed these temporary holds; reservation conflict enforcement was tested through reservation creation itself.
- No real booking or invitation emails were created during testing. Booking POST success/conflict paths and attendee timezone propagation were tested with mocks. Host timezone is verified via Cal.com's live profile, but actual email delivery/rendering has not been exercised.

API references: https://cal.com/docs/api-reference/v2/slots/get-available-time-slots-for-an-event-type and https://cal.com/docs/api-reference/v2/slots/reserve-a-slot.

## Follow-up: requested afternoon/evening times

The initial correction still limited every availability result to eight suggestions. The assistant treated those early-morning suggestions as the entire day's schedule and rejected 14:00, 16:00, and 21:00 without another lookup, although Cal.com confirmed all three were available.

Single-day queries now return all openings. Multi-day suggestions explicitly report truncation and total availability. The tool accepts `preferred_time` in the visitor's local 24-hour time and filters the complete result before producing suggestions. The prompt requires a fresh exact-time lookup whenever the customer requests a different time; absence from an earlier shortlist cannot justify rejection.

Deployed both Python files to the existing voice service and verified actual tool responses against live Cal.com for 5 October in Asia/Karachi: 14:00, 16:00, and 21:00 each returned `requested_time_status=available`. The restarted service passed authenticated health checks. Regression coverage includes choosing 21:00 after receiving morning suggestions and completing the mocked booking path. No real appointment was created.

Rollback snapshot: `/opt/vibecoderzz/voice-releases/rollback-calendar-requested-time-20261005/`. Deployed SHA-256: `bot.py` = `c9acd14409803d9bac5a1cd46dc0e63971686421dacdf8ff4449a66a6a94cfaa`; `calendar_tools.py` = `60cc7e2530e5fd45f1b5edea7bbb0c7af256e67515abd076e22309076017be04`.
