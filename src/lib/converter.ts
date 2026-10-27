import type { Format } from "./youtube";
import type { VideoInfo } from "./video.functions";

/**
 * Conversion provider seam. The app currently ships the demo provider, which
 * only simulates progress. Swap `activeProvider` for a real service later.
 */
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

export interface ConverterProvider {
  convert(req: ConvertRequest, onProgress: (pct: number) => void): Promise<ConvertResult>;
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

const demoProvider: ConverterProvider = {
  async convert(req, onProgress) {
    let pct = 0;
    while (pct < 100) {
      await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));
      pct = Math.min(100, pct + 6 + Math.random() * 14);
      onProgress(Math.round(pct));
    }
    return {
      downloadUrl: null,
      fileName: buildFileName(req.video.title, req.format, req.quality),
      demo: true,
    };
  },
};

export const activeProvider: ConverterProvider = demoProvider;
