import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundOn, onSoundChange, setSoundOn } from "@/lib/sounds";

export function SoundToggle() {
  // Read the saved preference after hydration to avoid a mismatch.
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(isSoundOn());
    const off = onSoundChange(setOn);
    return () => {
      off();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => setSoundOn(!on)}
      aria-label={on ? "Silenciar sonidos" : "Activar sonidos"}
      aria-pressed={on}
      className="rounded-full border border-border p-1.5 text-subtle transition-colors hover:text-foreground"
    >
      {on ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
    </button>
  );
}
