# Sulafat / Cardiff voice — 15 October 2026

The user selected the Sulafat–Cardiff audition from the British accent trials.
Changed production from Puck to Sulafat and added the trial's mild Cardiff Welsh
English instruction to the live agent's speaking-style prompt. This is Sulafat
with a prompted accent, not an extended regional catalog voice ID.

Deployed prompt:
“Speak in a natural, mild Cardiff Welsh English accent, retaining clear everyday
pronunciation. Keep this regional accent consistent, with natural pauses and no
exaggerated emotion or accent.”

AWS Parameter Store `/nimbess/prod/vibecoderzz/GEMINI_VOICE` is now Sulafat,
SecureString version 3. The EC2 service env and running process both use Sulafat.
Only the speaking-style prompt in the existing deployed bot.py was edited;
existing agent code, model and 30-minute booking settings were preserved. Local
bot.py has the same prompt edit and the local voice setting is aligned.

Restarted vibecoderzz-voice when idle. Authenticated health returned available,
zero sessions and zero pending. Generated prompt was checked for both the Cardiff
instruction and existing 30-minute appointment rule. Sulafat audio generation was
already exercised by the audition. No new full website conversation was performed
as part of the configuration release.

Rollback: /opt/vibecoderzz/voice-releases/rollback-sulafat-cardiff-20261015T101847Z/
contains previous bot.py and voice-agent.env (Puck). To revert, restore both files,
set the Parameter Store voice back to Puck, and restart when idle.

Deployed bot.py SHA-256:
57f5b1f4df748eec5aa28d4801e3d1be2e445f856665bae1e2aabcf663a24c21

No frontend deployment was needed.


## Delivery correction after user listening feedback

The user reported that the website did not sound like the selected audition.
Verified that Vercel production forwards to the same EC2 service and its running
voice was Sulafat; this was not an unpublished frontend setting.

Found a configuration difference: Pipecat supplies an en-US language code by
default, whereas the audition omitted the language code. The delivery instruction
was also deep in the production prompt. Updated ReliableGeminiLiveService to put
the speech configuration at the same top-level LiveConnectConfig field used by
the audition and clear the language code. This applies on initial and recovered
sessions. Moved an audition-aligned Cardiff delivery instruction to the beginning
of the system prompt. Existing model, tools and appointment rules remain present.
This identifies and removes configuration differences; an acoustic causal claim
that en-US alone caused the prior sound was not independently proven.

55 backend tests pass, including a new test for Sulafat, language-code omission,
prompt precedence and preserved VAD/tools. Deployed only the new constant, the
connection handler and prompt prefix to the existing live bot.py. Restarted idle.
Rollback: /opt/vibecoderzz/voice-releases/rollback-cardiff-delivery-20261015T102833Z/.
Deployed bot.py SHA-256:
93df86cc84fa833055b8a50ca8517bc6df7cf05bd163cb86af52b21d2aad9d19

Captured the configuration assembled by the deployed Pipecat service: Sulafat,
no language override, Cardiff delivery instruction first, and booking tools
present. A separate direct-provider probe using that configuration timed out
while waiting for a complete response (tool responses were not implemented in
that probe); it is not counted as a successful speech test.

Then ran a real production browser call using synthetic microphone input, with
no physical microphone capture. It connected, rendered the expected greeting in
the transcript, decoded and played remote audio, and reached Listening. Recorded
the remote track to output/voice-validation/sulafat-cardiff-live-website.webm and
converted the greeting to MP3 with trailing silence trimmed. The MP3 decodes
without errors. This demonstrates actual website audio delivery, not subjective
confirmation of Cardiff accent identity. The recording is supplied for user
listening comparison. Ended the test call; health reports available, zero sessions
and zero pending. Recent live service logs include the new configuration event.

## Audition-controlled comparison and second delivery revision

The user rejected the first website recording. Regenerated the original audition
using its original prompt and passage, same Live model, SDK and API key as the
website. The user explicitly confirmed that fresh clip matches their desired voice.
See `output/voice-validation/control-original-prompt.mp3`.

The production prompt still combined receptionist delivery with a playful sales
persona and a marketing-heavy greeting. Replaced competing style instructions with
the audition-derived receptionist delivery and a short greeting: “Hi, thanks for
visiting Vibecoderzz. How can I help with your business today?” The agent still
qualifies voice-agent/CRM enquiries, observes its scope, and requires explicit
confirmation before a real 30-minute booking.

Moved supported legacy GenerationConfig settings to LiveConnectConfig top-level,
matching the audition setup shape, preserving values, tools, manual VAD and system
instructions. Language override remains absent and voice remains Sulafat. This is
configuration alignment, not proof that any one field caused the audible difference.

55 focused backend tests pass. Deployed only the constant, connection method and
specific prompt sections into existing production code. Restarted idle; authenticated
health passed with zero sessions/pending. Backend-only deployment, no frontend build.
Rollback: /opt/vibecoderzz/voice-releases/rollback-cardiff-audition-delivery-20261015T104534Z/.
Deployed bot.py SHA-256:
798275b02ae2e51c33ef1e97da650daf1497c0e07f9670e61568081eb291f967

Offline pitch statistics and CAMPPlus speaker embeddings were examined. Neither
is calibrated to determine synthetic voice or accent identity. The user preferred
the original-prompt regeneration even though its reference cosine score was lower
than the rejected website recording. Do not treat frequency/embedding similarity
as a substitute for listening or report a match percentage. The attempted Gemini
audio comparison failed with provider 503 errors and supplies no listening evidence.

After this revision, a fresh production browser call rendered and played the new
receptionist greeting. Remote-track capture:
`output/voice-validation/sulafat-cardiff-live-website-v2.webm`, with trimmed
`sulafat-cardiff-live-website-v2.mp3` (5.65 seconds, MP3 decodes cleanly).
Ended the test call; final authenticated health returned available=true,
sessions=0, pending=0. The configuration log event was present for the new call.
The user was asked to compare this actual live recording with their chosen sample;
subjective match is pending. Synthetic microphone input only; no physical mic used.

## User acceptance and brand pronunciation

The user confirmed the v2 production recording “matches perfectly.” They asked
whether the changed opener affected functionality: the opening and delivery/persona
wording changed, while qualification, scope, tool handling and booking rules stayed
in place. The user requested the spoken brand be “Vibe Coderz.”

Changed brand mentions within system_prompt to spaced “Vibe Coderz” and added:
`Pronounce the company name as two words: "Vibe Coderz" (Vibe Coders).`
Voice configuration and the approved Cardiff delivery constant are unchanged.
Two focused voice tests passed. Deployed that targeted prompt edit only; service
restarted idle and authenticated health passed. Backup:
/opt/vibecoderzz/voice-releases/rollback-brand-pronunciation-20261015T105012Z/.
Deployed bot.py SHA-256:
260bc76dc71686c1bd071064dd867ca500191fc1890f248d686e0a561f34db78

A fresh production browser call spoke and transcribed the spaced brand name.
Recorded to output/voice-validation/sulafat-cardiff-vibe-coderz.mp3; MP3 decodes
cleanly. Ended the test call.

## Restore original script at user's request

The user clarified that only an accent change was requested. Restored original
sales-consultant role, opening and speaking-style wording. Retained the accepted
Sulafat/Cardiff delivery constant, audio connection configuration and spaced spoken
brand pronunciation. Opening is again:
“Hey, welcome to Vibe Coderz. I'm your sales consultant here. We turn missed leads
and messy operations into systems that actually work. What's holding your business
back right now?”

Qualification, service boundaries, tool calls and 30-minute booking logic are
unchanged. 55 backend tests passed. Targeted production prompt edit only; idle
restart and authenticated health passed. Rollback:
/opt/vibecoderzz/voice-releases/rollback-original-sales-script-20261015T105229Z/.
Deployed bot.py SHA-256:
ff7f888b2a6efd2106fef42113aa22f6454119b496537d3158f58208b72b5c8f

Fresh production call spoke the full original opener with spaced Vibe Coderz brand.
Saved output/voice-validation/sulafat-cardiff-original-opener.mp3; decoded cleanly.
Test call ended. Voice settings preserved; no new subjective accent confirmation
claimed for the restored script.

## Correct over-broad restoration

User reported accent regression after restoring the old opener. Restoring the
old persona/style alongside the opener was too broad. Reinstated the exact role
and conversational-length sections from the user-approved v2/v3 delivery. Kept
the user's full original sales opener byte-for-byte unchanged (release asserts
this), with the requested spaced company pronunciation. Accepted delivery
constant, Sulafat voice and audio configuration remain unchanged. No booking,
qualification, tool, or service-scope logic changes.

55 backend tests pass. Idle production restart and authenticated health passed.
Rollback: /opt/vibecoderzz/voice-releases/rollback-cardiff-original-opener-20261015T105849Z/.
Deployed bot.py SHA-256:
b046e7e755aa5c0dc2c94a61a0a851d6f74e128a32f64d3d8bc432a5588f875a

Fresh real website call spoke the full unchanged opener, recorded to
output/voice-validation/cardiff-approved-delivery-original-opener.mp3.
MP3 decodes cleanly. Test call ended. Subjective match of this combined
script/delivery is not asserted without user listening feedback.

## Final user scope: original accent instructions only

The user stopped integration experiments, requested exact original MP3 provenance,
and then authorized only the original accent approach with all agent behavior
preserved. The original audition was gemini-3.8-live / Sulafat, with the Cardiff
request in system_instruction; no reference audio or speed processing.

Production now uses these original delivery sentences verbatim:
“Speak in a natural, mild Cardiff Welsh English accent, retaining clear everyday
pronunciation. Use your natural default voice and accent, clear conversational
pacing and natural pauses. Convey the questions, reassurance and apology naturally.
Do not exaggerate emotion. Keep the requested regional accent consistent.”

Audition-only passage-reading/no-introduction directives were omitted to preserve
the live conversation and its opener. Original sales-consultant role and speaking
style are restored. Exact full sales opener and Vibe Coderz pronunciation retained.
No tool, calendar, reminder, qualification or transport logic was deployed or changed.
The existing native audio configuration/model/voice remained in place.

Reference conditioning and speed-processing experiments were never deployed. Their
inactive source/tests are archived under output/voice-validation/prototype. Removed
experimental imports, startup hooks and pace processor from local bot.py; stopped
private test servers and removed their generated preview build. The local ignored
.env model is now aligned with production (gemini-3.8-live); the earlier local
preview had been using gemini-2.5-flash-native-audio-preview-12-2025. This explained
local integration failures, not the reported production accent mismatch.

55 focused backend tests passed. Deployed only the delivery constant and restoration
of original role/style into existing production bot.py. Exact opener was asserted
unchanged; idle restart and authenticated health passed with zero sessions/pending.
Rollback: /opt/vibecoderzz/voice-releases/rollback-original-accent-only-20261015T114826Z/.
Deployed bot.py SHA-256:
5a11fc9025ea572c0d63f00afd7de37556cf404b197097ee28a61906b2bf6bb2
No claim of a subjectively verified voice match for this final configuration.

## Restore to accepted Vibe Coderz checkpoint

The user explicitly requested undoing all work after the previously accepted
Sulafat–Cardiff / Vibe Coderz checkpoint. Restored the saved production bot.py
byte-for-byte, verified SHA-256
260bc76dc71686c1bd071064dd867ca500191fc1890f248d686e0a561f34db78.
This restores the short receptionist opener, original accepted delivery constant,
role/style and native audio configuration, plus spaced brand pronunciation.

The production frontend aliases still point at the same checkpoint deployment
dpl_GQAF6vVfJnR4UJsYyiTrwVLPR7Sk; no frontend deployment change was necessary.
Gemini model/voice remain gemini-3.8-live / Sulafat. Backend was idle before restart;
authenticated health returned available with zero sessions and pending.

Local bot.py is identical to restored production. Removed later reference-audio
hooks and moved their active source/tests out of the backend; copies remain in
the private safety backup and existing prototype archive. Preserved pre-existing
work, collected audio and operational records. Restored matching prompt tests;
55 backend tests passed. Safety backup:
/opt/vibecoderzz/voice-releases/before-approved-checkpoint-restore-20261015T120957Z/.

A fresh production browser call received remote audio, captured to
output/voice-validation/restored-approved-cardiff-checkpoint.mp3; MP3 decodes
cleanly. The dialog had closed before transcript collection; no new transcript
assertion is made. Final authenticated service health was available with zero
sessions and zero pending. The exact saved source and unchanged voice settings
establish the checkpoint restoration; no new subjective match is asserted.
