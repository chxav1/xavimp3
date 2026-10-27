export type Format = "mp3" | "mp4";

export interface FormatOption {
  value: string;
  label: string;
}

export const QUALITY_OPTIONS: Record<Format, FormatOption[]> = {
  mp3: [
    { value: "64", label: "64 kbps" },
    { value: "128", label: "128 kbps" },
    { value: "192", label: "192 kbps" },
    { value: "256", label: "256 kbps" },
    { value: "320", label: "320 kbps" },
  ],
  mp4: [
    { value: "360", label: "360p" },
    { value: "480", label: "480p" },
    { value: "720", label: "720p" },
    { value: "1080", label: "1080p" },
  ],
};

export const DEFAULT_QUALITY: Record<Format, string> = {
  mp3: "320",
  mp4: "720",
};

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(id: string): boolean {
  return ID_RE.test(id);
}

/** Extracts the 11-char video id from any common YouTube URL, or returns null. */
export function extractVideoId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (isValidVideoId(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      id = m?.[2] ?? null;
    }
  }

  return id && isValidVideoId(id) ? id : null;
}

export function thumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
