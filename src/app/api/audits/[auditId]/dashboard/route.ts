import { NextResponse } from "next/server";
import { getAudit } from "@/lib/audit/store";
import { buildDashboard } from "@/lib/fourc/dashboard";

type Ctx = { params: Promise<{ auditId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const job = await getAudit(auditId);
  if (!job) {
    return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  }

  const dash = buildDashboard(job);

  // Client-safe payload: never include draft scores, findings, or raw 4C research.
  return NextResponse.json({
    audit_id: job.audit_id,
    status: job.status,
    business_name: job.intake?.business_name ?? null,
    tier: job.tier,
    overall_eta: dash.overall_eta,
    current_activity: dash.current_activity,
    what_happens_next: dash.what_happens_next,
    needs_input: dash.needs_input,
    stages: dash.stages,
    flag:
      job.flag && job.flag.status !== "resolved"
        ? {
            status: job.flag.status,
            raised_at: job.flag.raised_at,
            wording:
              job.flag.wording?.approved_at != null
                ? {
                    title: job.flag.wording.title,
                    what_is_flagged: job.flag.wording.what_is_flagged,
                    questions: job.flag.wording.questions,
                    what_happens_next: job.flag.wording.what_happens_next,
                  }
                : null,
            client_responded: Boolean(job.flag.client_response),
          }
        : job.flag?.status === "resolved"
          ? {
              status: "resolved",
              raised_at: job.flag.raised_at,
              resolved_at: job.flag.resolution?.at ?? null,
              history_line: `Customer view verified by a Cranial expert on ${
                job.flag.resolution?.at?.slice(0, 10) ?? "—"
              }`,
            }
          : null,
    published_report_id: job.published_report_id,
  });
}
