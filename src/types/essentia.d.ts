declare module "essentia.js/dist/essentia-wasm.es.js" {
  export const EssentiaWASM: unknown;
}

declare module "essentia.js/dist/essentia.js-core.es.js" {
  type Vector = { delete?: () => void };
  export default class Essentia {
    constructor(wasm: unknown);
    arrayToVector(input: Float32Array): Vector;
    RhythmExtractor2013(
      signal: Vector,
      maxTempo?: number,
      method?: string,
      minTempo?: number,
    ): { bpm: number; confidence: number };
    PercivalBpmEstimator(signal: Vector): { bpm: number };
    KeyExtractor(
      audio: Vector,
      averageDetuningCorrection?: boolean,
      frameSize?: number,
      hopSize?: number,
      hpcpSize?: number,
      maxFrequency?: number,
      maximumSpectralPeaks?: number,
      minFrequency?: number,
      pcpThreshold?: number,
      profileType?: string,
      sampleRate?: number,
      spectralPeaksThreshold?: number,
      tuningFrequency?: number,
      weightType?: string,
      windowType?: string,
    ): { key: string; scale: string; strength: number };
  }
}
