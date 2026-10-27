import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function VideoThumb({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-thumb", className)}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary/60">
          <Music2 className="size-6" />
        </div>
      )}
    </div>
  );
}
