# Studio voice assistant

Local prototype: Next.js widget → same-origin signaling proxy → Python Pipecat → Gemini Live.
The browser uses Pipecat SmallWebRTC. Gemini supplies native audio and input/output
transcripts. There is no separate STT or TTS provider. Typed messages share the same Gemini session, with optional audio playback.
When Cal.com is configured, the agent can check live availability and create a booking
after the visitor explicitly confirms the slot and contact details. Text transcripts,
lead qualification and booking milestones are stored for the private lead dashboard.
Raw microphone audio is not stored. Outbound follow-up is not included yet.

## Local setup

Use Python 3.12 and `uv`:

```sh
cd voice-agent
uv venv --python 3.12
uv pip install -r requirements.txt
cp .env.example .env
```

Set `GOOGLE_API_KEY` in `voice-agent/.env`. Create a random `VOICE_AGENT_TOKEN`
(for example `python -c "import secrets; print(secrets.token_urlsafe(32))"`) and
set the same value in `voice-agent/.env` and the website's `.env.local`.
Both files are ignored by Git. Keep existing environment settings when editing.
Set `DASHBOARD_ADMIN_EMAIL` and a password of at least 12 characters. Local development
uses `DATABASE_URL=sqlite:///./voice_agent.db`. Open `/studio-admin/login` after both
services are running.

In the root `.env.local`, also set:

```dotenv
VOICE_AGENT_URL=http://127.0.0.1:7860
```

Run the service from `voice-agent`:

```sh
.venv/bin/python -m uvicorn server:app --host 127.0.0.1 --port 7860
```

Run `npm run dev` from the website root. Open its localhost URL and choose
**Talk to the studio → Start talking**. Allow microphone access. You should hear
the AI introduction, see both transcripts, and be able to interrupt, mute and end.
The widget is hidden when `VOICE_AGENT_URL` is absent. Restart Next.js after changing
environment values; production rendering also needs them at build time.

## Behaviour

- The proxy supplies approved facts directly from `src/data/studio.ts`, so service
  content is not duplicated. It discards client-supplied business instructions.
- The backend holds active model context in memory and writes text turns and structured
  lead milestones to the dashboard database. The website does not store raw audio.
- Audio and conversation data go to Google. Google's free-tier data-use terms
  apply. The widget and privacy page explain this before microphone activation.
- Backend HTTP calls require the private shared token. Browser signaling is
  same-origin. No Google key or shared token appears in client code.
- Prototype limits: two concurrent sessions, ten starts per minute globally,
  60 seconds of visitor silence, and a five-minute maximum session duration.
  After 60 seconds of silence following an agent turn, the website plays one closing
  message and ends the connection.
  The server also enforces the five-minute maximum, releases unconnected sessions
  after 20 seconds, and releases lost clients after 15 seconds. Database failures
  cannot retain a session slot. Authenticated health reports session/pending counts.
- The server health endpoint checks configuration, not Google quota/model access.
  Provider failures are handled by the client connection/error states.
- Open mic, push-to-talk and typing share one Gemini Live session and history. Typed
  input is sent through Pipecat's reliable RTVI channel and receives the same native
  audio voice response as speech. There is no separate text-only model or automatic
  text fallback. Microphone selection and a separate assistant-audio mute are available.
- Production voice defaults to `gemini-3.8-live`. If that Live session fails, the
  coordinator makes one voice-to-voice recovery attempt with the same model, `Aoede`
  voice, prompt, tools, and completed conversation history. It never changes a voice
  call into text or swaps the visitor to a different speaking persona.
- The scripted opening is claimed atomically in the database. Reconnects, duplicate
  ready events, voice-to-text recovery, and an already-started typed conversation cannot
  replay it. Interrupted assistant turns remain distinct from completed turns.
- Model text appears as it streams. Playback-aligned Pipecat `bot-tts-text` events
  advance the spoken highlight. Gemini Live supplies transcript chunks, not precise
  per-word timestamps; this is chunk-level highlighting, not word alignment.
  A cascaded text LLM + timestamp-capable TTS pipeline would be needed for the latter.
- Local Silero speech-stop detection uses an explicit 0.6-second window. Affective
  dialogue is disabled for the reliability baseline. The UI
  immediately shows listening/transcribing feedback; Gemini Live still supplies the
  authoritative user transcript, so the final text can arrive after the voice turn.
- A Gemini `1007` audio-configuration rejection permanently ends that provider session.
  The coordinator restores one replacement Live session instead of reconnecting the
  rejected configuration. If both voice models fail, it reports a voice outage and ends
  cleanly; it never substitutes typed output or a different TTS personality.
- Closing the dialog, ending, connection failure and unmounting stop local audio.
  Push-to-talk also mutes on pointer release, keyboard release, blur and visibility change.
- The sales conversation is deliberately limited to voice agents and custom CRM or
  management software. Unrelated requests are redirected to those two offers.
- With `CAL_API_KEY` plus an event type ID or username/event slug configured, the
  assistant can offer real Cal.com slots and create bookings. It only announces a
  confirmation after Cal.com returns a booking UID. Without those settings, it reports
  that calendar booking is unavailable rather than inventing a result.
- After a successful booking, the website waits for the spoken confirmation to finish
  and then ends the call immediately. The separate inactivity farewell is played once
  only when the visitor has been silent for 60 seconds.
- Calendar results are filtered to visitor-local hours configured with
  `VISITOR_BOOKING_START_HOUR` and `VISITOR_BOOKING_END_HOUR` (9:00–20:00 by default).
  `GEMINI_VOICE` selects the native-audio voice and defaults to `Aoede`.
- The spoken introduction presents the agent as the studio's sales consultant. If
  directly asked whether it is AI or human, it must identify itself truthfully as an
  AI-powered virtual sales consultant.

## Verification

```sh
# Website root
npm run lint
npm run build

# voice-agent
uv pip install pytest httpx
.venv/bin/python -m pytest -q
```

Use a synthetic microphone in browser automation; do not capture the developer's
real microphone for unattended tests. Manually verify interruptions and speech
quality on a phone and laptop before inviting visitors.

## AWS EC2 production boundary

The Python service needs a persistent process and WebRTC network connectivity; it
cannot run as a short-lived Next.js/Vercel function. On EC2, use PostgreSQL with a URL
such as `postgresql+psycopg://voice_agent:password@127.0.0.1:5432/voice_agent`, store
PostgreSQL data on an encrypted EBS volume, and back it up. Run FastAPI under a service
manager behind HTTPS, restrict its security group, and configure TURN for visitors on
networks that cannot reach SmallWebRTC directly. Keep database, Google, Cal.com and
dashboard credentials only on EC2. Vercel receives only the backend URL and shared
proxy token. Add reverse-proxy login rate limits, monitoring and retention rules before
public launch. Check actual Google quotas before opening access.

### Shared Nimbess instance

The checked-in deployment files under `deploy/` install this service beside Nimbess
without sharing its Unix user, process, database, or port:

| Workload | Port/database | Failure priority |
|---|---|---|
| Nimbess receiver | 8000 / `nimbess_telemetry` | protected first |
| Nimbess product API | 8001 / `nimbess_app` | protected second |
| Vibecoderzz voice API | 7860 / `vibecoderzz_voice` | killed first under memory pressure |

The voice service has a 768 MB hard memory limit, begins with one concurrent voice
session, and uses PostgreSQL peer authentication over the local Unix socket. Its secrets
come from `/nimbess/prod/vibecoderzz/*` in SSM Parameter Store. Caddy exposes the
signaling and dashboard API at `https://dev.vibecoderzz.com/voice/*`; the shared bearer
token still prevents direct use. Self-hosted coturn supplies one-hour browser credentials,
so TURN's long-lived secret never reaches the website bundle.

Before installation, run `deploy/audit-instance.sh` through the Nimbess SSM runner and
check current memory, swap, disk, OOM events, services, and database sizes. The existing
instance has previously experienced memory pressure, so do not enable the voice service
when the measured headroom is below its limit. A `t3.medium` resize is the safe fallback.

`deploy/install-on-ec2.sh` is idempotent. It creates the isolated service account and
database, installs dependencies, refreshes secrets, configures coturn, validates Caddy,
and only then enables the service. The EC2 security group also needs TCP/UDP 3478 and UDP
49160–49200 inbound for TURN. Do not run the Nimbess CloudFormation stack merely to add
these rules: that stack has known replacement drift on the live instance.

For managed TURN, add `CLOUDFLARE_TURN_KEY_ID` and `CLOUDFLARE_TURN_API_TOKEN` to the
same SSM prefix and set `MANAGED_TURN_ENABLED=true`. The service requests short-lived
ICE credentials for both the browser and EC2 peer. Cloudflare supplies STUN, TURN/UDP,
TURN/TCP, and TURN/TLS on 443 in one ICE list. If credential issuance fails, the handler
returns to the existing coturn relay. Keep the flag off until ordinary and restrictive
network staging checks both pass.

The browser emits privacy-limited connection diagnostics after connection and failure:
candidate types, selected UDP/TCP/TLS transport, round-trip time, packet loss, jitter,
and connection state. It does not send IP addresses, credentials, raw audio, or message
content. Provider configuration rejection and conversation termination reason are
recorded separately so transport and model failures can be measured independently.

The installer preloads NLTK `punkt_tab` into `/opt/vibecoderzz/nltk_data` before
starting the protected, read-only service. Missing tokenizer data otherwise crashes
RTVI transcript processing after the first response fragment. `NLTK_DATA` is set in
the service unit and tokenization is checked at startup.

Coturn runs as `turnserver`; `/etc/turnserver.conf` must be `root:turnserver` with
mode `640`. Mode `600` prevents coturn from reading its settings and can cause it to
run with defaults, advertising private relay addresses outside the allowed port
range. Both coturn and the voice service are restarted after installer updates.

References: [Pipecat Gemini Live](https://docs.pipecat.ai/pipecat/features/gemini-live),
[SmallWebRTC](https://docs.pipecat.ai/api-reference/client/js/transports/small-webrtc),
[Google rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
