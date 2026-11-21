import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EXPERT_AUTH_COOKIE, verifyExpertToken } from "@/lib/expert/auth";
import { signOffAudit } from "@/lib/audit/workflow";


type Ctx = { params: Promise<{ auditId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const jar = await cookies();
  const auth = verifyExpertToken(jar.get(EXPERT_AUTH_COOKIE)?.value);
  if (!auth.ok) {
    return NextResponse.json({ error: "Expert login required" }, { status: 401 });
  }

  // Optional: reject operator attempts via body role claim
  const body = (await req.json().catch(() => ({}))) as { as_role?: string };
  if (body.as_role && body.as_role !== "expert") {
    return NextResponse.json(
      { error: "Only the expert role can sign off. Operators cannot." },
      { status: 403 },
    );
  }

  try {
    const job = await signOffAudit(auditId, auth.expert_id, "expert");
    return NextResponse.json({
      ok: true,
      status: job.status,
      signoff: job.signoff,
      message: "Signed off. Publish is now unlocked for this exact build hash.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
