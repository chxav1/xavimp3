import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ClipboardPaste, Loader2, X } from "lucide-react";
import { ConvertCard } from "@/components/converter/ConvertCard";
import { SearchResults } from "@/components/converter/SearchResults";
import { demoSearch } from "@/lib/demo-search";
import { extractVideoId } from "@/lib/youtube";
import { getVideoInfo, type VideoInfo } from "@/lib/video.functions";
import { play } from "@/lib/sounds";
import { SoundToggle } from "@/components/converter/SoundToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "tono — YouTube a MP3 y MP4, rápido y sin ruido" },
      {
        name: "description",
        content:
          "Pega un enlace de YouTube o busca por nombre y conviértelo a MP3 o MP4 en la calidad que elijas.",
      },
      { property: "og:title", content: "tono — YouTube a MP3 y MP4" },
      {
        property: "og:description",
        content: "Convierte vídeos de YouTube a MP3 o MP4. Sin registro, sin ruido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type View =
  | { kind: "empty" }
  | { kind: "results"; query: string; results: VideoInfo[] }
  | { kind: "video"; video: VideoInfo; fromResults?: { query: string; results: VideoInfo[] } };

function Index() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: "empty" });

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setError(null);

    const id = extractVideoId(q);
    if (id) {
      setLoading(true);
      try {
        const res = await getVideoInfo({ data: { id } });
        if (res.ok) {
          setView({ kind: "video", video: res.video });
          play("found");
        } else {
          setError(res.error);
          play("error");
        }
      } catch {
        setError("Algo ha fallado. Inténtalo de nuevo.");
        play("error");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (/^https?:\/\//i.test(q)) {
      setError("Ese enlace no parece de YouTube.");
      play("error");
      return;
    }
    setView({ kind: "results", query: q, results: demoSearch(q) });
    play("found");
  };

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setQuery(text);
    } catch {
      /* clipboard blocked — user can paste manually */
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-halo" />

      <header className="relative mx-auto flex max-w-2xl items-center justify-between px-5 py-6">
        <a href="/" className="font-mono text-sm font-medium tracking-tight">
          tono<span className="text-primary">.</span>
        </a>
        <div className="flex items-center gap-2">
          <SoundToggle />
          <span className="rounded-full border border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-subtle">
            mp3 · mp4
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-2xl px-5 pb-24 pt-14 sm:pt-24">
        <h1 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">
          YouTube a MP3,
          <br />
          <span className="text-muted-foreground">sin ruido.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-center text-sm text-muted-foreground">
          Pega un enlace o busca por nombre. Elige formato y calidad. Descarga.
        </p>

        <form
          onSubmit={submit}
          className="mt-10 flex items-center gap-2 rounded-2xl border border-input bg-card p-2 transition-shadow focus-within:shadow-glow"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pega un enlace de YouTube o escribe un nombre…"
            aria-label="Enlace de YouTube o búsqueda"
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-subtle"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Borrar"
              className="rounded-md p-2 text-subtle transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={paste}
              aria-label="Pegar"
              className="hidden rounded-md p-2 text-subtle transition-colors hover:text-foreground sm:block"
            >
              <ClipboardPaste className="size-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            aria-label="Continuar"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:shadow-glow disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          </button>
        </form>

        {error && (
          <p className="animate-fade-up mt-3 text-center text-sm text-destructive">{error}</p>
        )}

        <section className="mt-8">
          {view.kind === "results" && (
            <>
              <p className="mb-3 px-2 font-mono text-[11px] uppercase tracking-wider text-subtle">
                Resultados para “{view.query}” · demo
              </p>
              <SearchResults
                results={view.results}
                onPick={(video) =>
                  setView({
                    kind: "video",
                    video,
                    fromResults: { query: view.query, results: view.results },
                  })
                }
              />
            </>
          )}

          {view.kind === "video" && (
            <ConvertCard
              key={view.video.id}
              video={view.video}
              onBack={
                view.fromResults
                  ? () => setView({ kind: "results", ...view.fromResults! })
                  : undefined
              }
            />
          )}

          {view.kind === "empty" && (
            <ol className="grid grid-cols-3 gap-3 text-center">
              {["Pega o busca", "Elige calidad", "Descarga"].map((step, i) => (
                <li key={step} className="rounded-xl border border-border px-3 py-4">
                  <span className="font-mono text-xs text-primary">0{i + 1}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      <footer className="relative mx-auto max-w-2xl px-5 pb-8 text-center font-mono text-[11px] leading-relaxed text-subtle">
        Usa tono solo con contenido propio o con permiso de su autor.
      </footer>
    </div>
  );
}
