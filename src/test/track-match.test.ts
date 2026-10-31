import { describe, expect, it } from "vitest";
import { parseYouTubeTitle, pickBest } from "@/lib/track-match";

describe("YouTube title → song", () => {
  it("drops (Official Video) and [4K Remaster] noise", () => {
    expect(
      parseYouTubeTitle("Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)", "Rick Astley"),
    ).toEqual({ artist: "Rick Astley", track: "Never Gonna Give You Up" });
  });

  it("keeps remix tags, which mark a different version", () => {
    expect(parseYouTubeTitle("Artist - Song (Fred Remix) [Official Audio]", "x").track).toBe("Song (Fred Remix)");
  });

  it("uses the channel as artist when the title has no dash", () => {
    expect(parseYouTubeTitle("Blinding Lights (Official Video)", "TheWeekndVEVO")).toEqual({
      artist: "TheWeeknd",
      track: "Blinding Lights",
    });
  });
});

describe("catalogue match", () => {
  const want = { artist: "Rick Astley", track: "Never Gonna Give You Up" };

  it("prefers the original over a remix", () => {
    const best = pickBest(want, [
      { title: "Never Gonna Give You Up (Cake Mix)", artist: "Rick Astley", durationSec: 347, rank: 9 },
      { title: "Never Gonna Give You Up", artist: "Rick Astley", durationSec: 213, rank: 5 },
    ]);
    expect(best?.durationSec).toBe(213);
  });

  it("returns nothing when no candidate is close", () => {
    expect(pickBest(want, [{ title: "Bohemian Rhapsody", artist: "Queen", durationSec: 354, rank: 1 }])).toBeNull();
  });
});
