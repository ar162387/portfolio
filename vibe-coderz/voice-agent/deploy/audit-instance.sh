#!/usr/bin/env bash
# Read-only capacity and compatibility check for the shared Nimbess instance.
set -euo pipefail

echo "== host =="
hostnamectl --static
uname -r
echo "== uptime/load =="
uptime
echo "== memory =="
free -h
echo "== pressure =="
cat /proc/pressure/memory 2>/dev/null || true
echo "== disk =="
df -h / /var/lib/postgresql
echo "== largest processes (MiB RSS) =="
ps -eo pid,comm,rss,%cpu --sort=-rss | awk 'NR==1 {print; next} NR<=13 {$3=sprintf("%.1f",$3/1024); print}'
echo "== services =="
systemctl is-active nimbess-hook nimbess-api postgresql caddy || true
echo "== failed units =="
systemctl --failed --no-legend || true
echo "== recent OOM evidence =="
journalctl -k --since "14 days ago" --no-pager | grep -Ei 'out of memory|oom-kill|killed process' | tail -20 || true
echo "== listening sockets =="
ss -lntup | grep -E ':(80|443|3478|5432|7860|8000|8001)\\b' || true
echo "== database sizes =="
sudo -u postgres psql -Atqc "select datname || '=' || pg_size_pretty(pg_database_size(datname)) from pg_database order by pg_database_size(datname) desc;"
echo "== deployed revisions =="
sudo -u nimbess git -C /opt/nimbess/backend rev-parse --short HEAD 2>/dev/null || true
git -C /opt/vibecoderzz/portfolio rev-parse --short HEAD 2>/dev/null || true
