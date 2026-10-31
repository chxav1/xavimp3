import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { clickApiUrl } from "@/lib/clickapi";
import { play } from "@/lib/sounds";
import type { Format } from "@/lib/youtube";

/** Hidden strip (px) past the visible box where inner scrollbars end up. */
const GUTTER = 24;

/**
 * ClickAPI's multi-button converter. It is a cross-origin iframe, so its
 * insides can't be styled — we use its dark theme, mute its colors with a CSS
 * filter, and let it grow to fit its content (ClickAPI ships the iframe-resizer
 * child script) so it never shows an inner scrollbar.
 */
export function ClickApiEmbed({ videoId, format }: { videoId: string; format: Format }) {
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const src = clickApiUrl(videoId, format);

  // Auto-height via ClickAPI's own iframe-resizer integration.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let interacted = false;
    let lastHeight = 0;
    let lastStep = 0;
    let disposed = false;

    // A click inside the iframe moves focus to it → the window blurs.
    const onBlur = () => {
      if (document.activeElement !== frame) return;
      interacted = true;
      play("tick");
    };
    window.addEventListener("blur", onBlur);

    void import("iframe-resizer/js/iframeResizer").then(({ default: iframeResize }) => {
      if (disposed) return;
      iframeResize(
        {
          checkOrigin: ["https://clickapi.net"],
          log: false,
          warningTimeout: 0,
          // Extra room on the right/bottom that our wrapper clips away, so any
          // scrollbar the inner page shows lands outside the visible box.
          bodyPadding: `0 ${GUTTER}px ${GUTTER}px 0`,
          heightCalculationMethod: "max",
          onResized: ({ height }) => {
            // The box changes size when it moves to a new step (progress, download…).
            const now = Date.now();
            if (interacted && lastHeight && Math.abs(height - lastHeight) > 4 && now - lastStep > 1500) {
              lastStep = now;
              play("step");
            }
            lastHeight = height;
          },
        },
        frame,
      );
    });

    return () => {
      disposed = true;
      window.removeEventListener("blur", onBlur);
      (frame as HTMLIFrameElement & { iFrameResizer?: { removeListeners: () => void } })
        .iFrameResizer?.removeListeners();
    };
  }, [src]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-embed">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 font-mono text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> preparando descargas
        </div>
      )}
      <iframe
        key={src}
        ref={frameRef}
        src={src}
        title={`Descargar ${format.toUpperCase()}`}
        onLoad={() => setLoaded(true)}
        scrolling="no"
        allowTransparency
        style={{ width: `calc(100% + ${GUTTER}px)`, marginBottom: -GUTTER }}
        className="embed-muted block h-[260px] min-h-[200px] max-w-none overflow-hidden border-0 transition-[opacity,height] duration-300 data-[loaded=false]:opacity-0"
        data-loaded={loaded}
      />
    </div>
  );
}
