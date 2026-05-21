#!/bin/sh
set -e

echo "[startup] Running initial TikTok fetch..."
python /app/fetch.py || echo "[startup] Initial fetch failed (likely no TIKTOK_MS_TOKEN) — continuing."

echo "[cron] Installing daily cron job (04:00 UTC)..."
echo "0 4 * * * root python /app/fetch.py >> /proc/1/fd/1 2>/proc/1/fd/2" \
  > /etc/cron.d/fetch-tiktoks
chmod 0644 /etc/cron.d/fetch-tiktoks
crontab /etc/cron.d/fetch-tiktoks

echo "[cron] Starting crond..."
exec cron -f
