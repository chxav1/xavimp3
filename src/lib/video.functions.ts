import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface VideoInfo {
  id: string;
  title: string;
  author: string;
  thumbnail: string | null;
  demo?: boolean;
}

type InfoResult = { ok: true; video: VideoInfo } | { ok: false; error: string };

/** Reads public video metadata (title, channel) through YouTube's oEmbed endpoint. */
export const getVideoInfo = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{11}$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<InfoResult> => {
    const target = `https://www.youtube.com/watch?v=${data.id}`;
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(target)}&format=json`,
      );
      if (!res.ok) {
        return { ok: false, error: "No encontramos ese vídeo. Puede ser privado o no existir." };
      }
      const json = (await res.json()) as { title?: string; author_name?: string };
      return {
        ok: true,
        video: {
          id: data.id,
          title: json.title ?? "Sin título",
          author: json.author_name ?? "Desconocido",
          thumbnail: `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
        },
      };
    } catch (err) {
      console.error("oEmbed failed", err);
      return { ok: false, error: "No se pudo conectar con YouTube. Inténtalo de nuevo." };
    }
  });
