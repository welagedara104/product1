# Capture (sitemap + screenshotter)

## Invoke

```ts
import { discoverSitePages, listPageUrls } from "@/lib/capture/sitemap";
import { capturePagesWithPlaywright } from "@/lib/capture/screenshotter";
import { runCapture } from "@/lib/capture/runner";

// 1) Sitemap / nav discovery
const { pages, notes } = await discoverSitePages("https://client.example");
// or: const urls = await listPageUrls("https://client.example");

// 2) Screenshot one page at a time (desktop 1440 + mobile 390)
await capturePagesWithPlaywright({
  auditId: "aud_…",
  clientName: "Coral Reach",
  pages: pages.map((p, i) => ({ url: p.url })),
});

// 3) Pipeline entry (auto URL capture → demo fallback)
await runCapture({ auditId, intake, baseUrl: "http://localhost:3000" });
```

Env knobs: `CAPTURE_MODE=auto|url|demo`, `CAPTURE_MAX_PAGES`, `CAPTURE_TARGET=http` (demo HTTP path).

## On-disk layout

```
.data/captures/{auditId}/
  discovery.json
  {pageSlug}/
    d/   # desktop 1440×900
      first-view.png
      full-page.png
      frame-01.png …
      meta.json
    m/   # mobile 390×844
      …
```

## Operator desktop mirror

Copy from `.data/captures/{auditId}/` into:

```
Desktop/{ClientName}/Screenshots/{pageSlug}/
  d/
  m/
```

Payment URLs are filtered and Playwright aborts pay/checkout requests — never tap Pay.
