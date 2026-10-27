import { describe, expect, it } from "vitest";
import { buildFileName } from "@/lib/converter";
import { DEFAULT_QUALITY, QUALITY_OPTIONS, extractVideoId } from "@/lib/youtube";

describe("extractVideoId", () => {
  it("reads watch, short, shorts and embed links", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10")).toBe("dQw4w9WgXcQ");
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("dQw4w9WgXcQ");
    expect(extractVideoId("youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractVideoId("https://m.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("treats plain text and other sites as not a link", () => {
    expect(extractVideoId("bad bunny")).toBeNull();
    expect(extractVideoId("https://vimeo.com/123456")).toBeNull();
  });
});

describe("quality options", () => {
  it("offers MP3 up to 320 kbps, defaulting to 320", () => {
    expect(QUALITY_OPTIONS.mp3.map((q) => q.value)).toEqual(["64", "128", "192", "256", "320"]);
    expect(DEFAULT_QUALITY.mp3).toBe("320");
  });

  it("offers MP4 from 360p to 1080p, defaulting to 720p", () => {
    expect(QUALITY_OPTIONS.mp4.map((q) => q.value)).toEqual(["360", "480", "720", "1080"]);
    expect(DEFAULT_QUALITY.mp4).toBe("720");
  });
});

describe("buildFileName", () => {
  it("strips characters that are invalid in file names", () => {
    expect(buildFileName('A/B: "C"?', "mp3", "320")).toBe("AB C (320kbps).mp3");
  });
});
