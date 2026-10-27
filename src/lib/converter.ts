import type { Format } from "./youtube";
import type { VideoInfo } from "./video.functions";

/**
 * Address of your own conversion server (the `converter-server/` folder,
 * deployed to free hosting). Leave empty to keep using the ClickAPI embed.
 */
export const SELF_HOSTED_URL = "";

export interface ConvertRequest {
  video: VideoInfo;
  format: Format;
  quality: string;
}

export interface ConvertResult {
  downloadUrl: string | null;
  fileName: string;
  demo: boolean;
}

export type ConvertPhase = "waking" | "downloading" | "converting";

export interface ConverterProvider {
  convert(
    req: ConvertRequest,
    onProgress: (pct: number, phase: ConvertPhase) => void,
  ): Promise<ConvertResult>;
}

export function buildFileName(title: string, format: Format, quality: string): string {
  const safe = title
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  const suffix = format === "mp3" ? `${quality}kbps` : `${quality}p`;
  return `${safe || "audio"} (${suffix}).${format}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const demoProvider: ConverterProvider = {
  async convert(req, onProgress) {
    let pct = 0;
    while (pct < 100) {
      await sleep(120 + Math.random() * 180);
      pct = Math.min(100, pct + 6 + Math.random() * 14);
      onProgress(Math.round(pct), "converting");
    }
    return {
      downloadUrl: null,
      fileName: buildFileName(req.video.title, req.format, req.quality),
      demo: true,
    };
  },
};

interface JobStatus {
  status: "queued" | "downloading" | "converting" | "done" | "error";
  progress: number;
  error: string | null;
  file_name: string | null;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
  } catch {
    /* not json */
  }
  return "El servidor de conversión no responde.";
}

/** Talks to the self-hosted converter: create a job, poll it, then download. */
export function createSelfHostedProvider(
  baseUrl: string,
  opts: { pollMs?: number; fetchFn?: typeof fetch } = {},
): ConverterProvider {
  const base = baseUrl.replace(/\/+$/, "");
  const pollMs = opts.pollMs ?? 1000;
  const doFetch = opts.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));

  return {
    async convert(req, onProgress) {
      // Free hosting sleeps when idle; the first request can take a while.
      onProgress(0, "waking");
      const res = await doFetch(`${base}/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: req.video.id, format: req.format, quality: req.quality }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const { job_id } = (await res.json()) as { job_id: string };

      for (;;) {
        await sleep(pollMs);
        const r = await doFetch(`${base}/jobs/${job_id}`);
        if (!r.ok) throw new Error(await readError(r));
        const job = (await r.json()) as JobStatus;
        if (job.status === "error") throw new Error(job.error ?? "La conversión ha fallado.");
        if (job.status === "done") {
          onProgress(100, "converting");
          return {
            downloadUrl: `${base}/jobs/${job_id}/file`,
            fileName: job.file_name ?? buildFileName(req.video.title, req.format, req.quality),
            demo: false,
          };
        }
        onProgress(
          job.progress,
          job.status === "converting" ? "converting" : job.status === "queued" ? "waking" : "downloading",
        );
      }
    },
  };
}

export const selfHostedProvider: ConverterProvider | null = SELF_HOSTED_URL
  ? createSelfHostedProvider(SELF_HOSTED_URL)
  : null;
