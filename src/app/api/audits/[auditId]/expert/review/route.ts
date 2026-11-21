import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EXPERT_AUTH_COOKIE, verifyExpertToken } from "@/lib/expert/auth";
import { markAllReviewed } from "@/lib/audit/workflow";


type Ctx = { params: Promise<{ auditId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const jar = await cookies();
  const auth = verifyExpertToken(jar.get(EXPERT_AUTH_COOKIE)?.value);
  if (!auth.ok) {
    return NextResponse.json({ error: "Expert login required" }, { status: 401 });
  }
  try {
    const job = await markAllReviewed(auditId, auth.expert_id, "expert");
    const inferredLeft = job.draft_report
      ? Object.values(job.draft_report.pages).flatMap((p) =>
          p.secs.filter((s) => s.comb_state === "inferred"),
        ).length
      : 0;
    return NextResponse.json({
      ok: true,
      inferred_remaining: inferredLeft,
      build_sha: job.draft_report?.build.sha,
      message: "All section scores marked reviewed. You can sign off now.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
