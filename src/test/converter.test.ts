import { describe, expect, it } from "vitest";
import { createSelfHostedProvider } from "@/lib/converter";

const video = { id: "dQw4w9WgXcQ", title: "Song", author: "Artist", thumbnail: "", demo: false };

function fakeFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: string[] = [];
  const fn = (async (url: string) => {
    calls.push(url);
    const next = responses.shift()!;
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  }) as unknown as typeof fetch;
  return { fn, calls };
}

describe("self-hosted converter", () => {
  it("creates a job, polls it and returns the server's file link", async () => {
    const { fn, calls } = fakeFetch([
      { body: { job_id: "abc" } },
      { body: { status: "downloading", progress: 40, error: null, file_name: null } },
      { body: { status: "done", progress: 100, error: null, file_name: "Song (320kbps).mp3" } },
    ]);
    const seen: number[] = [];
    const provider = createSelfHostedProvider("https://conv.example.com/", { pollMs: 0, fetchFn: fn });
    const res = await provider.convert({ video, format: "mp3", quality: "320" }, (p) => seen.push(p));

    expect(calls[0]).toBe("https://conv.example.com/jobs");
    expect(res.downloadUrl).toBe("https://conv.example.com/jobs/abc/file");
    expect(res.fileName).toBe("Song (320kbps).mp3");
    expect(seen).toContain(40);
  });

  it("shows the server's error message when YouTube blocks it", async () => {
    const { fn } = fakeFetch([
      { body: { job_id: "abc" } },
      { body: { status: "error", progress: 0, error: "YouTube ha bloqueado el servidor.", file_name: null } },
    ]);
    const provider = createSelfHostedProvider("https://conv.example.com", { pollMs: 0, fetchFn: fn });
    await expect(provider.convert({ video, format: "mp3", quality: "320" }, () => {})).rejects.toThrow(
      "YouTube ha bloqueado el servidor.",
    );
  });

  it("shows the busy message when the server rejects a new job", async () => {
    const { fn } = fakeFetch([{ status: 429, body: { detail: "El servidor está ocupado." } }]);
    const provider = createSelfHostedProvider("https://conv.example.com", { pollMs: 0, fetchFn: fn });
    await expect(provider.convert({ video, format: "mp4", quality: "720" }, () => {})).rejects.toThrow(
      "El servidor está ocupado.",
    );
  });
});
