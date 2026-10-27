import { useState } from "react";
import { ArrowLeft, Check, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { activeProvider, type ConvertResult } from "@/lib/converter";
import { DEFAULT_QUALITY, QUALITY_OPTIONS, type Format } from "@/lib/youtube";
import type { VideoInfo } from "@/lib/video.functions";
import { VideoThumb } from "./VideoThumb";
import { ClickApiEmbed } from "./ClickApiEmbed";

type Status = "idle" | "converting" | "done";

export function ConvertCard({
  video,
  onBack,
}: {
  video: VideoInfo;
  onBack?: (() => void) | undefined;
}) {
  const [format, setFormat] = useState<Format>("mp3");
  const [quality, setQuality] = useState(DEFAULT_QUALITY.mp3);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ConvertResult | null>(null);

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setResult(null);
  };

  const pickFormat = (f: Format) => {
    setFormat(f);
    setQuality(DEFAULT_QUALITY[f]);
    reset();
  };

  const convert = async () => {
    setStatus("converting");
    setProgress(0);
    try {
      const res = await activeProvider.convert({ video, format, quality }, setProgress);
      setResult(res);
      setStatus("done");
    } catch (err) {
      console.error(err);
      toast.error("La conversión ha fallado. Inténtalo de nuevo.");
      reset();
    }
  };

  const download = () => {
    if (!result) return;
    if (result.downloadUrl) {
      const a = document.createElement("a");
      a.href = result.downloadUrl;
      a.download = result.fileName;
      a.click();
      return;
    }
    toast("Modo demo", {
      description: `"${result.fileName}" se descargará cuando conectes un servicio de conversión.`,
    });
  };

  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-card p-4 sm:p-5">
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> volver a resultados
        </button>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <VideoThumb
          src={video.thumbnail}
          alt={video.title}
          className="aspect-video w-full shrink-0 sm:w-56"
        />
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-base font-medium leading-snug">{video.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{video.author}</p>

          <div className="mt-4 inline-flex rounded-lg border border-border p-0.5">
            {(["mp3", "mp4"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => pickFormat(f)}
                data-active={format === f}
                className="rounded-md px-4 py-1.5 font-mono text-xs uppercase text-muted-foreground transition-colors data-[active=true]:bg-surface data-[active=true]:text-foreground"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!video.demo ? (
        <div className="mt-5">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-subtle">
            Elige calidad y descarga
          </p>
          <ClickApiEmbed videoId={video.id} format={format} />
        </div>
      ) : (
        <>
      <div className="mt-5">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-subtle">Calidad</p>
        <div className="flex flex-wrap gap-2">
          {QUALITY_OPTIONS[format].map((q) => (
            <Button
              key={q.value}
              variant="chip"
              size="sm"
              data-active={quality === q.value}
              disabled={status === "converting"}
              onClick={() => {
                setQuality(q.value);
                if (status === "done") reset();
              }}
            >
              {q.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        {status === "idle" && (
          <Button variant="glow" size="lg" className="w-full" onClick={convert}>
            Convertir a {format.toUpperCase()}
          </Button>
        )}

        {status === "converting" && (
          <div>
            <div className="mb-2 flex items-center justify-between font-mono text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" /> convirtiendo
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === "done" && result && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3.5" />
              </span>
              <span className="truncate text-muted-foreground">{result.fileName}</span>
            </div>
            <Button variant="glow" size="lg" onClick={download}>
              <Download /> Descargar
            </Button>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
