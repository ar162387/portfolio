#!/usr/bin/env bash
# Build the service environment from the instance's scoped SSM parameters.
# Values are never printed and the generated file is root-owned.
set -euo pipefail

AWS_REGION="${AWS_REGION:-ap-southeast-1}"
SSM_PREFIX="${SSM_PREFIX:-/nimbess/prod/vibecoderzz}"
TARGET="${TARGET:-/etc/vibecoderzz/voice-agent.env}"

install -d -o root -g vibecoderzz -m 0750 "$(dirname "$TARGET")"
parameters="$(aws ssm get-parameters-by-path \
  --region "$AWS_REGION" \
  --path "$SSM_PREFIX" \
  --recursive \
  --with-decryption \
  --output json)"

PARAMETERS="$parameters" SSM_PREFIX="$SSM_PREFIX" TARGET="$TARGET" python3 - <<'PY'
import json
import os
import tempfile

payload = json.loads(os.environ["PARAMETERS"])
prefix = os.environ["SSM_PREFIX"].rstrip("/") + "/"
values = {
    item["Name"].removeprefix(prefix): item["Value"]
    for item in payload.get("Parameters", [])
}
required = {
    "GOOGLE_API_KEY",
    "VOICE_AGENT_TOKEN",
    "DASHBOARD_ADMIN_EMAIL",
    "DASHBOARD_ADMIN_PASSWORD",
    "TURN_SHARED_SECRET",
}
missing = sorted(key for key in required if not values.get(key))
if missing:
    raise SystemExit("missing required SSM parameters: " + ", ".join(missing))

allowed = required | {
    "GEMINI_LIVE_MODEL",
    "GEMINI_TEXT_MODEL",
    "GEMINI_VOICE",
    "GEMINI_AFFECTIVE_DIALOG",
    "TEXT_FALLBACK_ENABLED",
    "CAL_API_KEY",
    "CAL_EVENT_TYPE_ID",
    "CAL_USERNAME",
    "CAL_EVENT_TYPE_SLUG",
    "VISITOR_BOOKING_START_HOUR",
    "VISITOR_BOOKING_END_HOUR",
    "MANAGED_TURN_ENABLED",
    "CLOUDFLARE_TURN_KEY_ID",
    "CLOUDFLARE_TURN_API_TOKEN",
}
settings = {key: value for key, value in values.items() if key in allowed and value != ""}
settings.update({
    "DATABASE_URL": "postgresql+psycopg:///vibecoderzz_voice",
    "TURN_HOST": "dev.vibecoderzz.com",
    "TURN_INTERNAL_HOST": "172.31.40.216",
    "MAX_VOICE_SESSIONS": "2",
    "CONNECT_TIMEOUT_SECONDS": "20",
    "DISCONNECT_TIMEOUT_SECONDS": "15",
    "TEXT_FALLBACK_ENABLED": "true",
    "PIPECAT_SCTP_MAX_CHUNK_SIZE": "1100",
})

target = os.environ["TARGET"]
directory = os.path.dirname(target)
fd, temporary = tempfile.mkstemp(dir=directory, prefix=".voice-agent.")
try:
    with os.fdopen(fd, "w") as handle:
        for key in sorted(settings):
            value = settings[key].replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
            handle.write(f'{key}="{value}"\n')
        handle.flush()
        os.fsync(handle.fileno())
    os.chmod(temporary, 0o640)
    os.replace(temporary, target)
finally:
    if os.path.exists(temporary):
        os.unlink(temporary)
PY

chown root:vibecoderzz "$TARGET"
echo "voice-agent environment refreshed"
