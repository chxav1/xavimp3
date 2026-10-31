/**
 * Turns a YouTube title/channel into a song query and picks the best catalogue
 * match. Pure, so it is unit-tested.
 */

const NOISE =
  /\b(official|oficial|video|v[ií]deo|audio|lyrics?|letra|visuali[sz]er|remaster(ed)?|hd|hq|4k|8k|mv|m\/v|clip|videoclip|color coded|full album|explicit)\b/i;

const KEEP = /\b(remix|mix|edit|live|en vivo|acoustic|ac[uú]stico|version|versi[oó]n|cover|slowed|sped up|instrumental)\b/i;

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanChannel(author: string): string {
  return author
    .replace(/\s*-\s*topic$/i, "")
    .replace(/vevo$/i, "")
    .replace(/\b(official|oficial|music|tv)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Artist - Song (Official Video) [4K]" → { artist: "Artist", track: "Song" } */
export function parseYouTubeTitle(title: string, author: string): { artist: string; track: string } {
  let t = title
    // Drop bracketed noise like (Official Video) or [4K Remaster], keep (Remix) etc.
    .replace(/[([【]([^)\]】]*)[)\]】]/g, (m, inner: string) =>
      NOISE.test(inner) && !KEEP.test(inner) ? " " : m,
    )
    .replace(/\s+(ft\.?|feat\.?|featuring)\s+[^-|([]+/i, " ")
    .replace(/["“”]/g, "")
    .replace(/\s*\|\s*.*$/, "")
    .replace(/\s+/g, " ")
    .trim();

  const dash = t.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) return { artist: dash[1]!.trim(), track: dash[2]!.trim() };
  t = t.replace(/\b(official|oficial)\b.*$/i, "").trim();
  return { artist: cleanChannel(author), track: t };
}

export interface Candidate {
  title: string;
  artist: string;
  durationSec: number;
  rank: number;
}

function overlap(a: string, b: string): number {
  const A = new Set(normalize(a).split(" ").filter(Boolean));
  const B = new Set(normalize(b).split(" ").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / Math.max(A.size, B.size);
}

/** Score 0–1 of how well a catalogue track matches the parsed YouTube song. */
export function matchScore(want: { artist: string; track: string }, c: Candidate): number {
  const titleScore = normalize(c.title) === normalize(want.track) ? 1 : overlap(c.title, want.track);
  const artistScore =
    normalize(want.artist).includes(normalize(c.artist)) || normalize(c.artist).includes(normalize(want.artist))
      ? 1
      : overlap(c.artist, want.artist);
  // A remix/live version only counts when the YouTube title asked for it.
  const versionPenalty = KEEP.test(c.title) && !KEEP.test(want.track) ? 0.25 : 0;
  return titleScore * 0.6 + artistScore * 0.4 - versionPenalty;
}

export function pickBest<T extends Candidate>(
  want: { artist: string; track: string },
  candidates: T[],
  minScore = 0.55,
): T | null {
  let best: T | null = null;
  let bestScore = minScore;
  for (const c of candidates) {
    const s = matchScore(want, c);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}
