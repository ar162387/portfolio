# Receptionist configuration and voice playground

Implemented 15 October 2026. Backend released on 15 October 2026; frontend is delivered by the accompanying Git push.

## Use

Sign in to the existing studio dashboard and open **Agent playground** (`/studio-admin/playground`).

1. Select Sulafat and Cardiff (the existing baseline), another prebuilt voice, or another accent direction.
2. Edit the opener, pronunciation, optional delivery notes, qualification flow, and approved business facts.
3. Generate an audio audition. This is a short Live API opener sample, without microphone access or executable tools. It is not a full WebRTC conversation test.
4. Inspect the assembled prompt and registered tool schemas. The panel reflects actual server configuration; unavailable calendar credentials mean calendar tools are absent.
5. Save a draft, or publish explicitly for new conversations. Drafts never affect visitors. Load a prior publication from history and publish it to roll back.
6. Export/import JSON templates to reuse these settings on another installation. Imports are validated before entering the editor.

Variables in opener and flow: `{{company_name}}`, `{{pronunciation}}`. Unknown variables are rejected. Templates are literal substitution, never executable code. Blank flow inherits the original qualification script.

## Voice findings

Official documentation checked on 15 October 2026:

- [Google Live API capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities): native audio selects voices via `speech_config.voice_config.prebuilt_voice_config.voice_name`. Native audio does not support explicitly setting the language code. Keep the existing removal of Pipecat's `en-US` override; setting `en-GB` is not a reliable Cardiff control.
- [Google speech generation](https://ai.google.dev/gemini-api/docs/speech-generation): Sulafat is described as warm. The 30 featured voices are included in the editor. The separate TTS product also documents an extended regional voice library. Its catalogue and newer SDK interfaces should not be assumed compatible with this pinned Live integration without testing.
- [Pipecat Gemini Live](https://docs.pipecat.ai/api-reference/server/services/s2s/gemini-live): configure voice/model/system instructions through `GeminiLiveLLMService.Settings`; local VAD requires disabled provider VAD and realtime context aggregation. Existing 0.6-second local turn detection, interruption handling, recovery, and tool registration remain in place.

The Cardiff baseline and original script are preserved. Custom delivery notes are optional. Do not stack conflicting accents or theatrical Welsh spelling into the script. Keep short sentences, natural pauses, one question at a time, and respectful interruption handling. Real calls should be evaluated for opener, spontaneous answers, dates, names and email read-back, interruption, and booking close. A prompted regional accent can vary across utterances; no setting here guarantees an indistinguishable human or authentic Cardiff voice.

## Architecture

- `voice-agent/agent_config.py`: strict versioned Pydantic schema, supported voice list, model allowlist, template substitution, SQLAlchemy persistence and optimistic concurrency.
- `bot.py`: preserved baseline prompt plus configurable sections, and a shared tool registry used by the worker and dashboard.
- `server.py`: authenticated settings, prompt preview and bounded audio audition endpoints. Both service and dashboard credentials are required.
- Existing Next.js proxy: same-origin writes and HTTP-only dashboard cookie; service and provider secrets remain server-side.
- `AgentPlayground.tsx`: draft editor, voice audition, prompt inspection, tool schemas, revision restore, import/export.

Three additive database tables are created by the existing startup migration: `agent_settings`, `agent_revisions`, `conversation_agent_configs`. The initial draft/publication comes from the environment voice/model and the existing script. Subsequent restarts do not overwrite saved settings. Each conversation pins a complete published configuration at its first connection; reconnects reuse that snapshot, even across service restarts. Pre-upgrade conversations acquire a snapshot when they next connect.

Publishing uses a version compare-and-swap; conflicting edits return HTTP 409 instead of overwriting another admin's work. Publication history records author and time. The UI exposes the latest 30 publications; older records stay in the database. Back up this database with the existing transcripts.

Only approved models appear in the selector. `GEMINI_LIVE_MODEL` supplies the baseline. Additional compatible model IDs can be enabled through comma-separated `AGENT_ALLOWED_MODELS`; test them against the pinned Pipecat/Google SDK before adding them. Changing provider or credentials is not a browser setting.

The prompt compiler keeps calendar rules, explicit confirmation, successful-booking checks, closing instructions, privacy, and recovery rules outside editable flow sections. Backend booking validation still applies. These boundaries reduce regression risk; arbitrary admin wording can still confuse an LLM, so audition and conversation checks remain necessary.

## Reuse for clients and extension

This release is a reusable configuration foundation for the existing AI-agent/custom-CRM sales receptionist. It is not a multi-tenant receptionist platform or a new client CRM.

For a client installation:

1. Use a separate deployment, database, dashboard account, provider credentials and calendar account. Do not share transcript databases across unrelated clients.
2. Import the settings JSON, customise the business name, voice, opener, flow and approved facts.
3. Adapt the code-owned service scope and lead qualification fields to that client's actual services. The current scope and lead enum intentionally remain AI voice agents/custom CRM, preserving this website's behaviour.
4. Configure their calendar event and credentials. Appointment duration currently remains the existing 30-minute rule; changing the duration requires matching calendar configuration and prompt/schema updates.
5. Add CRM integration through a backend handler, then register its `FunctionSchema` in `registered_tools`. The dashboard will show it automatically. Keep credentials outside exported templates; add idempotency, authorisation, failure handling and tests around any external writes.
6. Perform a full call with interruptions and a sandbox booking before release.

A general CRM UI, arbitrary client service categories, full conversational sandbox, real-time tool event timeline, multi-tenancy, and no-code creation of new tool handlers are future extensions, not represented as completed features.

## Release and rollback

Deploy backend (`agent_config.py`, `bot.py`, `server.py`) and frontend changes together using the existing deployment process. Back up the database and backend files first; restart the voice service when idle. Startup creates additive tables. Existing secrets remain unchanged. The first publication is the existing voice/model/script; deploying does not itself publish a changed opener.

Validate authenticated dashboard access, preview, save, publish and recovery. An audio audition uses the actual configured provider and incurs normal provider usage; concurrent auditions are bounded per process, with a 25-second provider timeout and a 30-second audio-size cap. For multi-worker/high-admin-volume deployments, add distributed quotas.

For configuration rollback, load a previous revision and publish. For application rollback, restore the prior backend/frontend release; the additional tables may remain. Avoid deleting transcript tables.

## Validation

- 69 backend tests passed, including 14 new configuration cases: baseline preservation, validation, draft isolation, publication, rollback, optimistic locking, persistent recovery snapshots and authenticated endpoints.
- 14 existing frontend recovery/watchdog tests passed.
- Production Next.js build, TypeScript and targeted ESLint passed.
- Local authenticated browser: sign-in, draft edit/save, publish, desktop and mobile render checked using an isolated SQLite database. Calendar credentials were disabled for this preview.
- Real Gemini/Sulafat opener audition returned playable 24 kHz WAV audio (4.37 seconds). This confirms provider and browser audio delivery, not subjective accent fidelity or full production-call behaviour.
- Production backend released after an idle check and database backup. Authenticated health and settings/prompt endpoints passed; Sulafat, Gemini 3.8 and all three existing tools were verified. No real booking or lead write was performed by the audition.
- Backend rollback and database snapshot: `/opt/vibecoderzz/voice-releases/playground-20261015T181348Z/backup/`. The live calendar implementation was preserved, including the midnight query overrun and uncertain-booking timeout message.
