import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EXPERT_AUTH_COOKIE, verifyExpertToken } from "@/lib/expert/auth";
import { publishAudit } from "@/lib/audit/workflow";
import type { Role } from "@/lib/audit/types";


type Ctx = { params: Promise<{ auditId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const jar = await cookies();
  const auth = verifyExpertToken(jar.get(EXPERT_AUTH_COOKIE)?.value);
  if (!auth.ok) {
    return NextResponse.json({ error: "Expert login required" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { as_role?: Role };
  // Test hook: allow attempting publish as operator to prove hard gate.
  const role: Role = body.as_role === "operator" ? "operator" : "expert";

  const { job, result } = await publishAudit(auditId, role);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        layer: result.layer,
        errors: result.errors,
        status: job.status,
        message: "Publish blocked by hard gate.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: job.status,
    report_id: job.published_report_id,
    report_url: `/report/${job.published_report_id}`,
    message: "Published privately. Client can open the password-gated report link.",
  });
}
