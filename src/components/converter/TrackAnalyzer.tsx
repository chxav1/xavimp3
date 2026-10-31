import { useRef, useState, type DragEvent } from "react";
import { AudioLines, Loader2, RotateCcw } from "lucide-react";
import type { TrackAnalysis } from "@/lib/music-key";
import type { AnalysisStep } from "@/lib/analyze-audio";
import { play } from "@/lib/sounds";

const STEP_LABEL: Record<AnalysisStep, string> = {
  decoding: "leyendo audio",
  tempo: "detectando bpm",
  key: "detectando tonalidad",
};

type State =
  | { kind: "idle"; error?: string }
  | { kind: "busy"; step: AnalysisStep; name: string }
  | { kind: "done"; result: TrackAnalysis; name: string };

/** Drop the downloaded file → BPM + key, analysed locally with Essentia. */
export function TrackAnalyzer() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (file: File | undefined) => {
    if (!file || state.kind === "busy") return;
    setState({ kind: "busy", step: "decoding", name: file.name });
    try {
      const { analyzeAudio } = await import("@/lib/analyze-audio");
      const result = await analyzeAudio(file, (step) =>
        setState({ kind: "busy", step, name: file.name }),
      );
      setState({ kind: "done", result, name: file.name });
      play("done");
    } catch (err) {
      play("error");
      setState({ kind: "idle", error: err instanceof Error ? err.message : "No se pudo analizar." });
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void run(e.dataTransfer.files[0]);
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="audio/*,video/mp4,.mp3,.m4a,.wav,.flac,.ogg,.aac"
      className="hidden"
      onChange={(e) => {
        void run(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (state.kind === "done") {
    const r = state.result;
    return (
      <div className="animate-fade-up">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-surface/50 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">bpm</p>
            <p className="mt-1 font-mono text-3xl font-medium tabular-nums text-primary">
              {Math.round(r.bpm)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {r.bpm.toFixed(1)}
              {r.bpmAlt && <> · o {Math.round(r.bpmAlt)}</>} · fiabilidad {r.bpmConfidence}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">tonalidad</p>
            <p className="mt-1 text-2xl font-medium leading-9 tracking-tight">{r.label}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {r.short} · <span className="text-primary">{r.camelot}</span> · fiabilidad{" "}
              {r.keyConfidence}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 font-mono text-[11px] text-subtle">
          <span className="truncate">{state.name}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3" /> analizar otro
          </button>
        </div>
        {input}
      </div>
    );
  }

  const busy = state.kind === "busy";
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        data-over={over}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-input px-4 py-3.5 text-left transition-colors hover:border-subtle data-[over=true]:border-primary data-[over=true]:bg-primary/5 disabled:cursor-default"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <AudioLines className="size-4" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm">
            {busy ? STEP_LABEL[state.step] : "BPM y tonalidad"}
          </span>
          <span className="block truncate font-mono text-[11px] text-subtle">
            {busy ? state.name : "Suelta aquí el archivo descargado · se analiza en tu navegador"}
          </span>
        </span>
      </button>
      {state.kind === "idle" && state.error && (
        <p className="mt-2 text-xs text-destructive">{state.error}</p>
      )}
      {input}
    </div>
  );
}
