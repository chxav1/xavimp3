import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { parseYouTubeTitle, pickBest } from "./track-match";

export interface MatchedTrack {
  title: string;
  artist: string;
  album: string | null;
  cover: string | null;
  previewUrl: string;
}

type DeezerTrack = {
  title: string;
  duration: number;
  rank: number;
  preview: string;
  artist: { name: string };
  album?: { title?: string; cover_medium?: string };
};

async function deezerSearch(q: string): Promise<DeezerTrack[]> {
  const res = await fetch(`https://api.deezer.com/search?limit=15&q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: DeezerTrack[] };
  return (json.data ?? []).filter((t) => t.preview);
}

/**
 * Finds the song behind a YouTube video in Deezer's public catalogue and
 * returns its 30 s preview, which the browser analyses for BPM and key.
 */
export const findTrack = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ title: z.string().min(1).max(300), author: z.string().max(200) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ track: MatchedTrack | null }> => {
    const want = parseYouTubeTitle(data.title, data.author);
    try {
      let results = await deezerSearch(`artist:"${want.artist}" track:"${want.track}"`);
      if (!results.length) results = await deezerSearch(`${want.artist} ${want.track}`);
      if (!results.length) results = await deezerSearch(want.track);
      const best = pickBest(
        want,
        results.map((r) => ({ ...r, artist: r.artist.name, durationSec: r.duration })),
      );
      if (!best) return { track: null };
      return {
        track: {
          title: best.title,
          artist: best.artist,
          album: best.album?.title ?? null,
          cover: best.album?.cover_medium ?? null,
          previewUrl: best.preview,
        },
      };
    } catch (err) {
      console.error("Deezer search failed", err);
      return { track: null };
    }
  });
