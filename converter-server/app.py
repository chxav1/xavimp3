"""
tono — servidor de conversión propio (YouTube → MP3 / MP4), sin anuncios.

Flujo:
  POST /jobs              {"id": "<videoId>", "format": "mp3"|"mp4", "quality": "320"|"720"...}
  GET  /jobs/{job_id}     estado + progreso (0-100)
  GET  /jobs/{job_id}/file  descarga el archivo terminado

Usa yt-dlp + ffmpeg. Los archivos se borran solos pasado JOB_TTL_SECONDS.
"""

import os
import re
import shutil
import tempfile
import threading
import time
import uuid
from pathlib import Path

import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
QUALITIES = {
    "mp3": {"64", "128", "192", "256", "320"},
    "mp4": {"360", "480", "720", "1080"},
}

MAX_DURATION = int(os.environ.get("MAX_DURATION_SECONDS", "5400"))  # 90 min
JOB_TTL = int(os.environ.get("JOB_TTL_SECONDS", "1800"))  # 30 min
MAX_ACTIVE = int(os.environ.get("MAX_ACTIVE_JOBS", "3"))
ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
WORK = Path(os.environ.get("WORK_DIR", tempfile.gettempdir())) / "tono-jobs"
WORK.mkdir(parents=True, exist_ok=True)

# Optional: YouTube cookies (Netscape cookies.txt) to get past
# "Sign in to confirm you're not a bot" on datacenter IPs.
# Sources, in order: Render Secret File "cookies.txt", YTDLP_COOKIES_FILE, YTDLP_COOKIES env text.
SECRET_COOKIE_PATHS = ["/etc/secrets/cookies.txt", os.environ.get("YTDLP_COOKIES_FILE", "")]


def normalize_cookies(raw: str) -> tuple[str, dict]:
    """Rebuild a Netscape cookie file; pasting into web forms often turns tabs into spaces."""
    out = ["# Netscape HTTP Cookie File"]
    names: set[str] = set()
    yt = 0
    for line in raw.replace("\r", "").split("\n"):
        line = line.strip()
        if not line or (line.startswith("#") and not line.startswith("#HttpOnly_")):
            continue
        parts = line.split("\t") if line.count("\t") >= 6 else line.split(None, 6)
        if len(parts) == 6:  # cookie with an empty value
            parts.append("")
        if len(parts) != 7:
            continue
        out.append("\t".join(p.strip() for p in parts))
        if "youtube.com" in parts[0]:
            yt += 1
            names.add(parts[5].strip())
    stats = {
        "cookies": len(out) - 1,
        "youtube_cookies": yt,
        "logged_in": bool(names & {"SAPISID", "__Secure-3PSID", "LOGIN_INFO"}),
    }
    return "\n".join(out) + "\n", stats


COOKIE_FILE: str | None = None
COOKIE_SOURCE = "none"
COOKIE_STATS: dict = {"cookies": 0, "youtube_cookies": 0, "logged_in": False}
_raw = ""
for _p in SECRET_COOKIE_PATHS:
    if _p and Path(_p).is_file():
        _raw, COOKIE_SOURCE = Path(_p).read_text(errors="ignore"), "secret_file"
        break
if not _raw and os.environ.get("YTDLP_COOKIES", "").strip():
    _raw, COOKIE_SOURCE = os.environ["YTDLP_COOKIES"], "env"
if _raw:
    _text, COOKIE_STATS = normalize_cookies(_raw)
    if COOKIE_STATS["cookies"]:
        # Writable copy: yt-dlp writes refreshed cookies back to this file.
        COOKIE_FILE = str(WORK.parent / "tono-cookies.txt")
        Path(COOKIE_FILE).write_text(_text)
print(f"[cookies] source={COOKIE_SOURCE} {COOKIE_STATS}", flush=True)

app = FastAPI(title="tono converter")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

jobs: dict[str, dict] = {}
lock = threading.Lock()


class JobRequest(BaseModel):
    id: str
    format: str
    quality: str


def safe_name(title: str) -> str:
    name = re.sub(r'[\\/:*?"<>|]+', "", title or "")
    name = re.sub(r"\s+", " ", name).strip()[:80]
    return name or "audio"


def friendly_error(err: Exception) -> str:
    msg = str(err)
    if "confirm you" in msg and "bot" in msg:
        return "YouTube ha bloqueado el servidor. Añade cookies (mira la guía)."
    if "Private video" in msg:
        return "Ese vídeo es privado."
    if "age" in msg.lower() and "confirm" in msg.lower():
        return "Ese vídeo tiene restricción de edad."
    if "unavailable" in msg.lower():
        return "Ese vídeo no está disponible."
    if "TOO_LONG" in msg:
        return f"El vídeo dura más de {MAX_DURATION // 60} minutos."
    return "No se pudo convertir el vídeo. Inténtalo de nuevo."


def update(job_id: str, **fields) -> None:
    with lock:
        if job_id in jobs:
            jobs[job_id].update(fields)


def run_job(job_id: str, video_id: str, fmt: str, quality: str) -> None:
    out_dir = WORK / job_id
    out_dir.mkdir(parents=True, exist_ok=True)
    streams = 2 if fmt == "mp4" else 1
    state = {"done_streams": 0}

    def on_download(d: dict) -> None:
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
            frac = (d.get("downloaded_bytes", 0) / total) if total else 0
            pct = (state["done_streams"] + frac) / streams * 90
            with lock:
                job = jobs.get(job_id)
                if job:
                    job["status"] = "downloading"
                    job["progress"] = max(job["progress"], min(90, int(pct)))
        elif d["status"] == "finished":
            state["done_streams"] = min(streams, state["done_streams"] + 1)

    def on_postprocess(d: dict) -> None:
        if d["status"] == "started":
            update(job_id, status="converting", progress=92)

    opts: dict = {
        "outtmpl": str(out_dir / "media.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "retries": 10,
        "fragment_retries": 10,
        # Small chunks avoid YouTube's mid-download 403s on big streams.
        "http_chunk_size": 10 * 1024 * 1024,
        "progress_hooks": [on_download],
        "postprocessor_hooks": [on_postprocess],
    }
    if COOKIE_FILE:
        opts["cookiefile"] = COOKIE_FILE

    if fmt == "mp3":
        opts["format"] = "bestaudio/best"
        opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": quality},
            {"key": "FFmpegMetadata"},
        ]
        suffix = f"{quality}kbps"
    else:
        h = int(quality)
        opts["format"] = (
            f"bv*[height<={h}][ext=mp4]+ba[ext=m4a]/"
            f"bv*[height<={h}]+ba/"
            f"b[height<={h}]/best"
        )
        opts["merge_output_format"] = "mp4"
        suffix = f"{quality}p"

    try:
        url = f"https://www.youtube.com/watch?v={video_id}"
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if (info.get("duration") or 0) > MAX_DURATION:
                raise RuntimeError("TOO_LONG")
            update(job_id, title=info.get("title") or "")
            ydl.process_ie_result(info, download=True)

        files = [p for p in out_dir.iterdir() if p.suffix == f".{fmt}"]
        if not files:
            raise RuntimeError("output missing")
        title = safe_name(info.get("title") or "")
        update(
            job_id,
            status="done",
            progress=100,
            file=str(files[0]),
            file_name=f"{title} ({suffix}).{fmt}",
        )
    except Exception as err:  # noqa: BLE001
        print(f"[job {job_id}] {video_id}: {err}", flush=True)
        update(job_id, status="error", error=friendly_error(err))
        shutil.rmtree(out_dir, ignore_errors=True)


def janitor() -> None:
    while True:
        time.sleep(60)
        cutoff = time.time() - JOB_TTL
        with lock:
            old = [k for k, j in jobs.items() if j["created"] < cutoff]
            for k in old:
                jobs.pop(k, None)
        for k in old:
            shutil.rmtree(WORK / k, ignore_errors=True)


threading.Thread(target=janitor, daemon=True).start()


@app.get("/")
@app.get("/health")
def health() -> dict:
    # Only counts, never cookie values.
    return {
        "ok": True,
        "yt_dlp": yt_dlp.version.__version__,
        "cookies": {"source": COOKIE_SOURCE, **COOKIE_STATS},
    }


@app.post("/jobs")
def create_job(req: JobRequest) -> dict:
    if not ID_RE.match(req.id):
        raise HTTPException(400, "Enlace de YouTube no válido.")
    if req.format not in QUALITIES or req.quality not in QUALITIES[req.format]:
        raise HTTPException(400, "Formato o calidad no válidos.")
    with lock:
        active = sum(1 for j in jobs.values() if j["status"] in ("queued", "downloading", "converting"))
        if active >= MAX_ACTIVE:
            raise HTTPException(429, "El servidor está ocupado. Prueba en unos segundos.")
        job_id = uuid.uuid4().hex
        jobs[job_id] = {"status": "queued", "progress": 0, "created": time.time()}
    threading.Thread(target=run_job, args=(job_id, req.id, req.format, req.quality), daemon=True).start()
    return {"job_id": job_id}


@app.get("/jobs/{job_id}")
def job_status(job_id: str) -> dict:
    with lock:
        job = jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Esta conversión ha caducado.")
        return {
            "status": job["status"],
            "progress": job["progress"],
            "error": job.get("error"),
            "file_name": job.get("file_name"),
        }


@app.get("/jobs/{job_id}/file")
def job_file(job_id: str) -> FileResponse:
    with lock:
        job = jobs.get(job_id)
    if not job or job["status"] != "done" or not Path(job["file"]).exists():
        raise HTTPException(404, "Esta conversión ha caducado.")
    media = "audio/mpeg" if job["file"].endswith(".mp3") else "video/mp4"
    return FileResponse(job["file"], media_type=media, filename=job["file_name"])
