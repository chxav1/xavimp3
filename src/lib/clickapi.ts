import type { Format } from "./youtube";

/** URL of ClickAPI's multi-button converter (all qualities) in dark theme. */
export function clickApiUrl(videoId: string, format: Format): string {
  const video = `https://www.youtube.com/watch?v=${videoId}`;
  return `https://clickapi.net/api/button/${format}?url=${encodeURIComponent(video)}&theme=dark`;
}
