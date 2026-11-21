import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/audit/workflow";


type Ctx = { params: Promise<{ auditId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const url = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${url.protocol}//${url.host}`;

  try {
    const job = await runPipeline(auditId, baseUrl);
    const flagged =
      job.status === "flagged" ||
      job.status === "awaiting_client" ||
      job.status === "awaiting_expert";

    return NextResponse.json({
      audit_id: job.audit_id,
      status: job.status,
      tier: job.tier,
      captures: job.captures.length,
      creative_scores: job.creative_scores.length,
      draft_report_id: job.draft_report?.report_id ?? null,
      customer_view_status: job.customer_view_status,
      flag_status: job.flag?.status ?? null,
      dashboard_path: `/dashboard/${job.audit_id}`,
      message: flagged
        ? "Customer view flagged once. Capture kept running. Open the dashboard (and expert workspace to approve wording)."
        : job.status === "in_expert_review"
          ? "Draft ready (incl. 4C chapter). Open the expert workspace to review and sign off."
          : `Pipeline ended in status: ${job.status}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
