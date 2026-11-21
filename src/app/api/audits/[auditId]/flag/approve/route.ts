import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { approveFlagWording } from "@/lib/audit/workflow";
import { EXPERT_AUTH_COOKIE, verifyExpertToken } from "@/lib/expert/auth";

type Ctx = { params: Promise<{ auditId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const jar = await cookies();
  const auth = verifyExpertToken(jar.get(EXPERT_AUTH_COOKIE)?.value);
  if (!auth.ok) {
    return NextResponse.json({ error: "Expert login required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;

  let body: {
    title?: string;
    what_is_flagged?: string[];
    questions?: Array<{ id: string; prompt: string }>;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const job = await approveFlagWording(
      auditId,
      auth.expert_id,
      "expert",
      baseUrl,
      body,
    );
    return NextResponse.json({
      audit_id: job.audit_id,
      status: job.status,
      flag_status: job.flag?.status,
      email_sent_at: job.flag?.client_notified.email_sent_at,
      message:
        "Flag wording approved. Stub email sent. Client can answer on the dashboard.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
