<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Real downloads go through the self-hosted converter in `converter-server/` (FastAPI + yt-dlp + ffmpeg, job API: POST /jobs, GET /jobs/{id}, GET /jobs/{id}/file) once `SELF_HOSTED_URL` in `src/lib/converter.ts` is set; it runs on external hosting because Workers can't run yt-dlp/ffmpeg.
- Until then, real videos fall back to ClickAPI's public embed (`src/lib/clickapi.ts` + `ClickApiEmbed`); it is a cross-origin iframe, so restyle only via its theme/container/filter — never proxy or scrape its backend or strip its ads.
- Demo search results always use `demoProvider` (simulated progress, no file).
- Video metadata is fetched server-side via YouTube oEmbed in `src/lib/video.functions.ts` (no API key, avoids browser CORS).
- Name search uses `src/lib/demo-search.ts` placeholders until a real search provider is connected.
- The ClickAPI iframe auto-sizes through the `iframe-resizer` v4 parent (ClickAPI ships the child script), loaded with a dynamic import because it touches `window`; never give it a fixed height that can clip or scroll.
- UI sounds are synthesized with Web Audio in `src/lib/sounds.ts` (no audio files, mute saved in localStorage); ClickAPI's inner steps are only inferable from iframe focus/resize, never from its contents.
- BPM/key detection runs fully in the browser: `analyze-audio.ts` decodes the user's dropped file to mono 44.1 kHz and hands it to `analysis.worker.ts` (Essentia.js WASM, dynamic-imported, worker because sync WASM compile is blocked on the main thread); consensus logic lives in pure `music-key.ts` (median of 3 tempo estimators, vote across 4 key profiles) so it stays unit-tested. Essentia.js is AGPL-3.0.
- The ClickAPI iframe is wider than its clipping wrapper (centered gutter) so inner scrollbars fall outside the visible box; don't use iframe-resizer bodyPadding or heightCalculationMethod "max" — its full-height layout makes them grow empty space.
