FROM python:3.12-slim

# ffmpeg converts to MP3 / merges MP4; deno is the JS runtime yt-dlp needs for YouTube.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=denoland/deno:bin /deno /usr/local/bin/deno

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

ENV PORT=8000
EXPOSE 8000

# Update yt-dlp on every start: YouTube changes often and old versions break.
CMD pip install --no-cache-dir -q -U "yt-dlp[default]" ; \
    uvicorn app:app --host 0.0.0.0 --port ${PORT}
