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
- Real downloads use ClickAPI's public embed (`src/lib/clickapi.ts` + `ClickApiEmbed`); it is a cross-origin iframe, so restyle only via `theme=dark`, the container, and the `embed-muted` filter token — never proxy or scrape its backend.
- The `ConverterProvider` seam in `src/lib/converter.ts` only serves demo search results; swap `activeProvider` if a self-hosted converter is added.
- Video metadata is fetched server-side via YouTube oEmbed in `src/lib/video.functions.ts` (no API key, avoids browser CORS).
- Name search uses `src/lib/demo-search.ts` placeholders until a real search provider is connected.
