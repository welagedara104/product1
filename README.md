# Cranial Be.Sci website audit (product1)

Phase 0 foundations for the behavioural-science website audit product: report data model, interactive renderer on an anonymised Velifushi-inspired fixture, viewport QA, and private noindex hosting.

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Private fixture report:

1. Visit `/report/rpt_fixture_lagoon_anon_001` (redirects to login).
2. Password: `phase0-fixture` (or `REPORT_ACCESS_PASSWORD` from `.env.example`).

```bash
cp .env.example .env.local   # optional
npm run qa                   # Playwright at 1440 / 1280 / 390
npm run build
```

## Phase 0 scope

| Piece | Location |
|---|---|
| Report schema (brief §15) | `src/lib/report/types.ts` |
| Anonymised fixture | `src/fixtures/velifushi-anon.ts` |
| Interactive renderer | `src/components/report/*` |
| Password + noindex hosting | `src/middleware.ts`, `src/app/report/**`, `src/app/robots.ts` |
| QA runner | `qa/report-qa.spec.ts`, `playwright.config.ts` |

Repo visibility is unchanged (may stay public). Report routes are password-gated and `noindex` regardless.
