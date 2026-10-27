import { useState } from "react";
import { Loader2 } from "lucide-react";
import { clickApiUrl } from "@/lib/clickapi";
import type { Format } from "@/lib/youtube";

/**
 * ClickAPI's multi-button converter. It is a cross-origin iframe, so its
 * insides can't be styled — we use its dark theme, crop it to the buttons and
 * mute its colors with a CSS filter so it blends with our palette.
 */
export function ClickApiEmbed({ videoId, format }: { videoId: string; format: Format }) {
  const [loaded, setLoaded] = useState(false);
  const src = clickApiUrl(videoId, format);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-embed">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> preparando descargas
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={`Descargar ${format.toUpperCase()}`}
        onLoad={() => setLoaded(true)}
        scrolling="no"
        allowTransparency
        className="embed-muted block h-[240px] w-full border-0 transition-opacity duration-500 data-[loaded=false]:opacity-0"
        data-loaded={loaded}
      />
    </div>
  );
}
