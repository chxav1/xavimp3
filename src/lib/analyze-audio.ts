import type { TrackAnalysis } from "./music-key";

export type AnalysisStep = "decoding" | "tempo" | "key";

const SAMPLE_RATE = 44100;
const MAX_SECONDS = 6 * 60;

/** Decodes any browser-supported audio file to mono 44.1 kHz. Browser-only. */
async function decodeMono(file: File): Promise<Float32Array> {
  const data = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(1, SAMPLE_RATE, SAMPLE_RATE);
  const buffer = await ctx.decodeAudioData(data);
  const n = buffer.length;
  const mono = new Float32Array(n);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) mono[i]! += ch[i]! / buffer.numberOfChannels;
  }
  // Very long files: analyse the middle section to stay fast.
  const max = MAX_SECONDS * SAMPLE_RATE;
  if (n > max) {
    const start = Math.floor((n - max) / 2);
    return mono.slice(start, start + max);
  }
  return mono;
}

/** Analyses tempo and key of an audio file locally (nothing is uploaded). */
export async function analyzeAudio(
  file: File,
  onStep: (step: AnalysisStep) => void,
): Promise<TrackAnalysis> {
  onStep("decoding");
  let samples: Float32Array;
  try {
    samples = await decodeMono(file);
  } catch {
    throw new Error("No se pudo leer ese archivo. Prueba con un MP3, M4A o WAV.");
  }
  if (samples.length < SAMPLE_RATE * 5) throw new Error("El audio es demasiado corto (mínimo 5 s).");

  const worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
  try {
    return await new Promise<TrackAnalysis>((resolve, reject) => {
      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as
          | { type: "progress"; step: AnalysisStep }
          | { type: "done"; result: TrackAnalysis }
          | { type: "error"; message: string };
        if (msg.type === "progress") onStep(msg.step);
        else if (msg.type === "done") resolve(msg.result);
        else reject(new Error("No se pudo analizar el audio."));
      };
      worker.onerror = () => reject(new Error("No se pudo analizar el audio."));
      worker.postMessage({ samples, sampleRate: SAMPLE_RATE }, [samples.buffer]);
    });
  } finally {
    worker.terminate();
  }
}
