/**
 * Pure helpers to turn raw Essentia estimates into one tempo and one key.
 * Kept free of browser/WASM code so they can be unit-tested.
 */

export type Scale = "major" | "minor";

export interface KeyEstimate {
  key: string; // Essentia spelling: "C", "C#", "Eb", "F#", "Ab", "Bb"…
  scale: Scale;
  strength: number; // 0–1
}

export interface TrackAnalysis {
  bpm: number; // rounded to 0.1
  bpmAlt: number | null; // half/double tempo when the main value is likely an octave off
  bpmConfidence: "alta" | "media" | "baja";
  key: string;
  scale: Scale;
  keyConfidence: "alta" | "media" | "baja";
  camelot: string;
  label: string; // "La menor"
  short: string; // "Am"
}

const PITCH: Record<string, number> = {
  C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5,
  "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11,
};

// Camelot wheel numbers by pitch class.
const CAMELOT_MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const CAMELOT_MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];

const ES_MAJOR = ["Do", "Re♭", "Re", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"];
const ES_MINOR = ["Do", "Do♯", "Re", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "Sol♯", "La", "Si♭", "Si"];
const EN_MAJOR = ["C", "D♭", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
const EN_MINOR = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "G♯", "A", "B♭", "B"];

export function pitchClass(key: string): number {
  const pc = PITCH[key];
  if (pc === undefined) throw new Error(`Unknown key: ${key}`);
  return pc;
}

export function camelot(key: string, scale: Scale): string {
  const pc = pitchClass(key);
  return scale === "major" ? `${CAMELOT_MAJOR[pc]}B` : `${CAMELOT_MINOR[pc]}A`;
}

export function keyNames(key: string, scale: Scale) {
  const pc = pitchClass(key);
  return scale === "major"
    ? { label: `${ES_MAJOR[pc]} mayor`, short: EN_MAJOR[pc] }
    : { label: `${ES_MINOR[pc]} menor`, short: `${EN_MINOR[pc]}m` };
}

/** Majority vote across key profiles; ties go to the highest summed strength. */
export function voteKey(estimates: KeyEstimate[]): KeyEstimate {
  const groups = new Map<string, { est: KeyEstimate; votes: number; total: number }>();
  for (const e of estimates) {
    const id = `${pitchClass(e.key)}:${e.scale}`;
    const g = groups.get(id);
    if (g) {
      g.votes += 1;
      g.total += e.strength;
    } else {
      groups.set(id, { est: e, votes: 1, total: e.strength });
    }
  }
  const best = [...groups.values()].sort((a, b) => b.votes - a.votes || b.total - a.total)[0];
  if (!best) throw new Error("No key estimates");
  return { key: best.est.key, scale: best.est.scale, strength: best.total / best.votes };
}

/** Median of independent tempo estimates — one method's octave/drift error gets outvoted. */
export function consensusBpm(estimates: number[]): number {
  const valid = estimates.filter((b) => Number.isFinite(b) && b > 0).sort((a, b) => a - b);
  if (!valid.length) throw new Error("No tempo estimates");
  const mid = Math.floor(valid.length / 2);
  const median = valid.length % 2 ? valid[mid]! : (valid[mid - 1]! + valid[mid]!) / 2;
  return Math.round(median * 10) / 10;
}

/** Half/double tempo hint for very slow or very fast readings. */
export function alternateBpm(bpm: number): number | null {
  if (bpm < 90) return Math.round(bpm * 20) / 10;
  if (bpm > 160) return Math.round(bpm * 5) / 10;
  return null;
}

export function buildAnalysis(
  bpms: number[],
  rhythmConfidence: number,
  keys: KeyEstimate[],
): TrackAnalysis {
  const bpm = consensusBpm(bpms);
  const k = voteKey(keys);
  const agree = keys.filter((e) => pitchClass(e.key) === pitchClass(k.key) && e.scale === k.scale).length;
  // RhythmExtractor2013 multifeature confidence: 0–5.32 (>3.5 is very reliable).
  const bpmConfidence = rhythmConfidence >= 3.5 ? "alta" : rhythmConfidence >= 2 ? "media" : "baja";
  const keyConfidence =
    agree === keys.length && k.strength >= 0.6 ? "alta" : agree * 2 > keys.length ? "media" : "baja";
  return {
    bpm,
    bpmAlt: alternateBpm(bpm),
    bpmConfidence,
    key: k.key,
    scale: k.scale,
    keyConfidence,
    camelot: camelot(k.key, k.scale),
    ...keyNames(k.key, k.scale),
  };
}
