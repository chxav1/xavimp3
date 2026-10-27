import type { VideoInfo } from "@/lib/video.functions";
import { VideoThumb } from "./VideoThumb";

export function SearchResults({
  results,
  onPick,
}: {
  results: VideoInfo[];
  onPick: (v: VideoInfo) => void;
}) {
  return (
    <ul className="animate-fade-up flex flex-col gap-1">
      {results.map((v) => (
        <li key={v.id}>
          <button
            onClick={() => onPick(v)}
            className="group flex w-full items-center gap-4 rounded-xl p-2 text-left transition-colors hover:bg-card"
          >
            <VideoThumb src={v.thumbnail} alt={v.title} className="aspect-video w-28 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{v.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{v.author}</p>
            </div>
            <span className="mr-2 font-mono text-xs text-subtle transition-colors group-hover:text-primary">
              elegir →
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
