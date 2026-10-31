import { describe, expect, it } from "vitest";
import { alternateBpm, buildAnalysis, camelot, consensusBpm, keyNames, voteKey } from "@/lib/music-key";

describe("tempo consensus", () => {
  it("outvotes one estimator that drifts (123.3 vs two at ~126)", () => {
    expect(consensusBpm([123.26, 126.08, 126.05])).toBe(126.1);
  });

  it("suggests double tempo for slow readings and half for fast ones", () => {
    expect(alternateBpm(86.9)).toBe(173.8);
    expect(alternateBpm(170)).toBe(85);
    expect(alternateBpm(124)).toBeNull();
  });
});

describe("key", () => {
  it("maps keys to the Camelot wheel", () => {
    expect(camelot("A", "minor")).toBe("8A");
    expect(camelot("C", "major")).toBe("8B");
    expect(camelot("Ab", "minor")).toBe("1A");
    expect(camelot("F#", "major")).toBe("2B");
  });

  it("names keys in Spanish", () => {
    expect(keyNames("A", "minor")).toEqual({ label: "La menor", short: "Am" });
    expect(keyNames("Bb", "major")).toEqual({ label: "Si♭ mayor", short: "B♭" });
  });

  it("picks the key most profiles agree on", () => {
    const k = voteKey([
      { key: "A", scale: "minor", strength: 0.7 },
      { key: "C", scale: "major", strength: 0.9 },
      { key: "A", scale: "minor", strength: 0.8 },
    ]);
    expect(k.key).toBe("A");
    expect(k.scale).toBe("minor");
  });

  it("treats enharmonic spellings as the same key when voting", () => {
    const r = buildAnalysis([128, 128, 128], 4, [
      { key: "G#", scale: "minor", strength: 0.7 },
      { key: "Ab", scale: "minor", strength: 0.7 },
      { key: "E", scale: "major", strength: 0.9 },
    ]);
    expect(r.camelot).toBe("1A");
  });
});
