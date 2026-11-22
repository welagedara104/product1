# Cranial Be.Sci website audit (product1)

Phase 2: **full 4C + flag-once + live client dashboard**, on top of the Phase 1 expert-in-the-loop path. Nothing client-visible without expert sign-off; inferred scores never publish.

## Local run

```bash
npm install
npx playwright install chromium   # first time, for capture + QA
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### What Kavinda can try

**Happy path (customer view validates)**

1. **Start intake** → `/intake` (Cranial teammate fills on the client's behalf; four sections; sample answers available).
2. **Connect GA4** → use **Use tier-1 GA4 fixture**.
3. **Run pipeline** → 4C Steps 1–4 + review → validates → Steps 5–6 → capture → Creative Score → COM-B draft.
4. **Live dashboard** → `/dashboard/[auditId]` — stages, ETAs, no draft scores.
5. **Expert workspace** → `/expert` (password `phase1-expert`) → Mark all reviewed → Sign off → Publish.
6. Open the **private report** (password `phase0-fixture`) and check **Your customer: the four Cs**.

**Flag-once path**

1. In intake (About section), put `FORCE_FLAG` in the internal field-intel answer.
2. Run the pipeline → status becomes flagged; **capture / Creative Score / analytics still finish**.
3. Dashboard shows a pending card; diagnosis waits.
4. In `/expert/[auditId]`: **Approve wording + send stub email** (written under `.data/emails/`).
5. On the dashboard: answer the flag card → **Send my answer**.
6. Expert: **Confirm** or **Revise** the customer view → Steps 5–6 + diagnosis run. Flag never raises again.

```bash
cp .env.example .env.local   # optional
npm run typecheck
npm run qa                   # Phase 0–2 Playwright suite
npm run build
```

## Phase 2 map

| Piece | Location |
|---|---|
| 4C fixture agent (6 steps + review) | `src/lib/fourc/agent.ts` |
| Validation + flag wording | `src/lib/fourc/validate.ts` |
| Email stub | `src/lib/fourc/email.ts` → `.data/emails/` |
| Client dashboard model | `src/lib/fourc/dashboard.ts`, `/dashboard/[auditId]` |
| Pipeline (independent vs dependent stages) | `src/lib/audit/workflow.ts` |
| Audit job + stages | `src/lib/audit/types.ts`, `store.ts` |
| Flag APIs | `/api/audits/[id]/flag/{approve,respond,resolve}` |
| 4C chapter in draft report | `src/lib/diagnosis/build-draft-report.ts` |
| Hard gate (unchanged) | `src/lib/audit/publisher.ts` |

## Secrets / documented gaps

| Need | Env | Without it |
|---|---|---|
| GA4 OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Tier-1 **fixture** analytics |
| Creative Score API | `CREATIVE_SCORE_API_KEY` | Fixture scores + TODO in stage log |
| Expert login | `EXPERT_ACCESS_PASSWORD` | Default `phase1-expert` |
| Report login | `REPORT_ACCESS_PASSWORD` | Default `phase0-fixture` |
| Transactional email | (none yet) | Stub files in `.data/emails/` |

Local audit data lives under `.data/` (gitignored).

## Defaults chosen (ask Kavinda only if wrong)

- File store (no Postgres yet).
- 4C research is a **fixture agent** (no live web search yet).
- Pass rule follows brief §7.3 proposal; `FORCE_FLAG` forces the fail path for demos.
- Flag email needs expert wording approval before the stub send.
- Client analytics connectors follow the client stack; GA4 is the first path, not the only forever connector.
- ContentSquare / tiers → Phase 3.
