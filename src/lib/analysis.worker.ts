/// <reference lib="webworker" />
/**
 * Runs Essentia (WASM) off the main thread: tempo from three independent
 * estimators, key from four key profiles, then a consensus of each.
 */
import { EssentiaWASM } from "essentia.js/dist/essentia-wasm.es.js";
import Essentia from "essentia.js/dist/essentia.js-core.es.js";
import { buildAnalysis, type KeyEstimate, type Scale } from "./music-key";

const scope = self as unknown as DedicatedWorkerGlobalScope;
let essentia: Essentia | null = null;

const KEY_PROFILES = ["edma", "bgate", "temperley", "krumhansl"];

scope.onmessage = (e: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => {
  try {
    essentia ??= new Essentia(EssentiaWASM);
    const { samples, sampleRate } = e.data;
    const signal = essentia.arrayToVector(samples);

    scope.postMessage({ type: "progress", step: "tempo" });
    const multi = essentia.RhythmExtractor2013(signal, 208, "multifeature", 40);
    const degara = essentia.RhythmExtractor2013(signal, 208, "degara", 40);
    const percival = essentia.PercivalBpmEstimator(signal);

    scope.postMessage({ type: "progress", step: "key" });
    const keys: KeyEstimate[] = KEY_PROFILES.map((profile) => {
      const k = essentia!.KeyExtractor(
        signal, true, 4096, 4096, 12, 3500, 60, 25, 0.2, profile, sampleRate, 0.0001, 440, "cosine", "hann",
      );
      return { key: k.key, scale: k.scale as Scale, strength: k.strength };
    });
    signal.delete?.();

    const result = buildAnalysis([multi.bpm, degara.bpm, percival.bpm], multi.confidence, keys);
    scope.postMessage({ type: "done", result });
  } catch (err) {
    scope.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
