# Cranial Be.Sci website audit (product1)

Phase 1 MVP: **expert-in-the-loop**. A client completes intake, connects GA4 (or a fixture), we capture the site, score frames, draft COM-B findings, then an expert reviews, signs off, and publishes privately. Nothing client-visible without sign-off; inferred scores never publish.

## Local run

```bash
npm install
npx playwright install chromium   # first time, for capture + QA
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### What Kavinda can try (tier-1 path)

1. **Start intake** → `/intake` (sample answers are pre-filled; edit or keep).
2. **Connect GA4** → use **Use tier-1 GA4 fixture** (real Google OAuth needs secrets; see below).
3. **Run pipeline** → capture at 1440 + 390 (stops before payment), Creative Score fixture, COM-B draft.
4. **Expert workspace** → `/expert`  
   - Password: `phase1-expert`  
   - Mark all reviewed → Sign off → Publish.
5. Open the **private report** link (password `phase0-fixture`).

Try **Publish as operator** in the expert UI — it must fail. Publishing before sign-off must also fail.

```bash
cp .env.example .env.local   # optional
npm run typecheck
npm run qa                   # Phase 0 report QA + Phase 1 hard-gate + MVP path
npm run build
```

## Phase 1 map

| Piece | Location |
|---|---|
| Audit job + stages | `src/lib/audit/types.ts`, `store.ts`, `workflow.ts` |
| Hard gate (workflow / publisher / hosting) | `src/lib/audit/publisher.ts` + report registry |
| Client intake | `/intake`, `src/app/intake/**` |
| GA4 OAuth or fixture | `src/lib/ga4/*`, `/intake/[id]/ga4` |
| Capture 1440 + 390, stop before pay | `src/lib/capture/runner.ts`, `/demo-site` |
| Creative Score (fixture + TODO) | `src/lib/creative-score/client.ts` |
| COM-B diagnosis → report model | `src/lib/diagnosis/build-draft-report.ts` |
| Expert workspace | `/expert`, `/expert/[auditId]` |
| Private publish | `.data/published/`, `/report/[id]` |

## Secrets / documented gaps

| Need | Env | Without it |
|---|---|---|
| GA4 OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Tier-1 **fixture** analytics |
| Creative Score API | `CREATIVE_SCORE_API_KEY` | Fixture scores + TODO in stage log |
| Expert login | `EXPERT_ACCESS_PASSWORD` | Default `phase1-expert` |
| Report login | `REPORT_ACCESS_PASSWORD` | Default `phase0-fixture` |

Local audit data lives under `.data/` (gitignored).

## Defaults chosen (ask Kavinda only if wrong)

- File store (no Postgres yet) for MVP speed.
- Expert = password gate; only that role can sign off / publish.
- Capture uses inline demo HTML by default (set `CAPTURE_TARGET=http` to hit `/demo-site`).
- Full 4C agent, live client dashboard, ContentSquare → Phase 2 / 3.

## Phase 0 still included

Anonymised Lagoon fixture report, renderer, QA at 1440 / 1280 / 390, password + noindex hosting.
