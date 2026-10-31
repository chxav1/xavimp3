import { useEffect, useRef, useState, type DragEvent } from "react";
import { AudioLines, Loader2, Upload } from "lucide-react";
import type { TrackAnalysis } from "@/lib/music-key";
import type { AnalysisStep } from "@/lib/analyze-audio";
import { findTrack, type MatchedTrack } from "@/lib/track.functions";
import type { VideoInfo } from "@/lib/video.functions";
import { play } from "@/lib/sounds";

const STEP_LABEL: Record<AnalysisStep, string> = {
  searching: "buscando la canción",
  fetching: "escuchando un fragmento",
  decoding: "escuchando un fragmento",
  tempo: "detectando bpm",
  key: "detectando tonalidad",
};

type State =
  | { kind: "busy"; step: AnalysisStep }
  | { kind: "done"; result: TrackAnalysis; source: string }
  | { kind: "manual"; reason: string; error?: string };

/**
 * BPM + key straight from the video: finds the song in Deezer's catalogue and
 * analyses its preview with Essentia in the browser. Dropping the downloaded
 * file is only the fallback when the song isn't found.
 */
export function TrackAnalyzer({ video }: { video: VideoInfo }) {
  const [state, setState] = useState<State>({ kind: "busy", step: "searching" });
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const step = (s: AnalysisStep) => !cancelled && setState({ kind: "busy", step: s });
    (async () => {
      step("searching");
      let track: MatchedTrack | null = null;
      try {
        track = (await findTrack({ data: { title: video.title, author: video.author } })).track;
      } catch {
        /* treated as not found */
      }
      if (cancelled) return;
      if (!track) {
        setState({ kind: "manual", reason: "No encontramos esta canción en el catálogo." });
        return;
      }
      try {
        const { analyzeUrl } = await import("@/lib/analyze-audio");
        const result = await analyzeUrl(track.previewUrl, step);
        if (cancelled) return;
        setState({ kind: "done", result, source: `${track.title} — ${track.artist}` });
        play("done");
      } catch {
        if (!cancelled) setState({ kind: "manual", reason: "No se pudo analizar la canción." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [video.title, video.author]);

  const runFile = async (file: File | undefined) => {
    if (!file || state.kind === "busy") return;
    const prev = state;
    setState({ kind: "busy", step: "decoding" });
    try {
      const { analyzeAudio } = await import("@/lib/analyze-audio");
      const result = await analyzeAudio(file, (s) => setState({ kind: "busy", step: s }));
      setState({ kind: "done", result, source: file.name });
      play("done");
    } catch (err) {
      play("error");
      setState({
        kind: "manual",
        reason: prev.kind === "manual" ? prev.reason : "",
        error: err instanceof Error ? err.message : "No se pudo analizar.",
      });
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="audio/*,video/mp4,.mp3,.m4a,.wav,.flac,.ogg,.aac"
      className="hidden"
      onChange={(e) => {
        void runFile(e.target.files?.[0]);
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
          <span className="truncate">{state.source}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Upload className="size-3" /> ¿otra versión? sube el archivo
          </button>
        </div>
        {input}
      </div>
    );
  }

  if (state.kind === "busy") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
          <Loader2 className="size-4 animate-spin" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm">BPM y tonalidad</span>
          <span className="block font-mono text-[11px] text-subtle">{STEP_LABEL[state.step]}</span>
        </span>
      </div>
    );
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void runFile(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        data-over={over}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-input px-4 py-3.5 text-left transition-colors hover:border-subtle data-[over=true]:border-primary data-[over=true]:bg-primary/5"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface text-primary">
          <AudioLines className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm">BPM y tonalidad</span>
          <span className="block font-mono text-[11px] text-subtle">
            {state.reason ? `${state.reason} ` : ""}Suelta aquí el archivo descargado
          </span>
        </span>
      </button>
      {state.error && <p className="mt-2 text-xs text-destructive">{state.error}</p>}
      {input}
    </div>
  );
}
