#!/usr/bin/env bash
# Idempotent install/update after /opt/vibecoderzz/portfolio has been cloned.
set -euo pipefail

REPO=/opt/vibecoderzz/portfolio
APP="$REPO/vibe-coderz/voice-agent"
DEPLOY="$APP/deploy"

test -f "$APP/requirements.txt"
id -u vibecoderzz >/dev/null 2>&1 || \
  useradd --system --home /opt/vibecoderzz --shell /usr/sbin/nologin vibecoderzz
install -d -o vibecoderzz -g vibecoderzz /opt/vibecoderzz

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv python3-pip coturn

# Local PostgreSQL uses peer authentication over its Unix socket. The OS user
# and database role have the same name, so this database needs no password.
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vibecoderzz') THEN
    CREATE ROLE vibecoderzz LOGIN;
  END IF;
END $$;
SELECT 'CREATE DATABASE vibecoderzz_voice OWNER vibecoderzz'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vibecoderzz_voice')\gexec
REVOKE ALL ON DATABASE vibecoderzz_voice FROM PUBLIC;
SQL

chown -R vibecoderzz:vibecoderzz /opt/vibecoderzz
sudo -u vibecoderzz python3 -m venv "$APP/.venv"
sudo -u vibecoderzz "$APP/.venv/bin/pip" install --disable-pip-version-check -r "$APP/requirements.txt"

install -o root -g root -m 0755 "$DEPLOY/pull-secrets.sh" /usr/local/sbin/vibecoderzz-pull-secrets
AWS_REGION=ap-southeast-1 /usr/local/sbin/vibecoderzz-pull-secrets

turn_secret="$(sed -n 's/^TURN_SHARED_SECRET="\(.*\)"$/\1/p' /etc/vibecoderzz/voice-agent.env)"
private_ip="$(hostname -I | awk '{print $1}')"
cat >/etc/turnserver.conf <<EOF
listening-port=3478
listening-ip=0.0.0.0
relay-ip=$private_ip
external-ip=47.131.218.85/$private_ip
min-port=49160
max-port=49200
realm=dev.vibecoderzz.com
use-auth-secret
static-auth-secret=$turn_secret
fingerprint
stale-nonce=600
no-cli
no-multicast-peers
no-tls
no-dtls
simple-log
EOF
chmod 600 /etc/turnserver.conf
sed -i 's/^TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn

install -o root -g root -m 0644 "$DEPLOY/vibecoderzz-voice.service" /etc/systemd/system/vibecoderzz-voice.service

python3 - <<'PY'
from pathlib import Path

path = Path('/etc/caddy/Caddyfile')
text = path.read_text()
begin = '\t# BEGIN VIBECODERZZ VOICE\n'
end = '\t# END VIBECODERZZ VOICE\n'
block = '''\t# BEGIN VIBECODERZZ VOICE
\t# Signaling and private dashboard API. Browser media travels over TURN.
\thandle_path /voice/* {
\t\treverse_proxy 127.0.0.1:7860 {
\t\t\ttransport http {
\t\t\t\tdial_timeout 5s
\t\t\t\tresponse_header_timeout 35s
\t\t\t}
\t\t}
\t}
\t# END VIBECODERZZ VOICE
'''
if begin in text and end in text:
    start = text.index(begin)
    finish = text.index(end, start) + len(end)
    text = text[:start] + block + text[finish:]
else:
    marker = '\t@productApi path /v1/* /readyz\n'
    if marker not in text:
        raise SystemExit('Caddy insertion marker not found; refusing to rewrite')
    text = text.replace(marker, block + '\n' + marker, 1)
path.write_text(text)
PY

systemctl daemon-reload
caddy validate --config /etc/caddy/Caddyfile
systemctl enable --now coturn
systemctl enable --now vibecoderzz-voice
systemctl reload caddy
systemctl --no-pager --full status vibecoderzz-voice coturn | sed -n '1,80p'
