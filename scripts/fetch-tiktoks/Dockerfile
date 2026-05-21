FROM python:3.11-slim

# System deps for Playwright / Chromium
RUN apt-get update && apt-get install -y \
    cron \
    ca-certificates \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium for Playwright (only Chromium to keep image smaller)
RUN playwright install chromium
RUN playwright install-deps chromium

COPY fetch.py .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
