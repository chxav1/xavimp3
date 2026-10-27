import type { VideoInfo } from "./video.functions";

const SUFFIXES = [
  "(Audio oficial)",
  "— En directo",
  "(Versión acústica)",
  "· Lyric video",
  "— Remix",
  "(Sesión en estudio)",
];

const CHANNELS = ["Canal Oficial", "Live Sessions", "Studio Room", "Night Radio"];

/** Placeholder results until a real search provider is connected. */
export function demoSearch(query: string): VideoInfo[] {
  const q = query.trim();
  return SUFFIXES.map((s, i) => ({
    id: `demo${String(i).padStart(7, "0")}`,
    title: `${q} ${s}`,
    author: CHANNELS[i % CHANNELS.length],
    thumbnail: null,
    demo: true,
  }));
}
