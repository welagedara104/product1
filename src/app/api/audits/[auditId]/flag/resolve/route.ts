import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveFlag } from "@/lib/audit/workflow";
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
    kind?: "confirmed" | "revised";
    customer_view_summary?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.kind || !body.customer_view_summary) {
    return NextResponse.json(
      { error: "kind and customer_view_summary required" },
      { status: 400 },
    );
  }

  try {
    const job = await resolveFlag(
      auditId,
      auth.expert_id,
      "expert",
      {
        kind: body.kind,
        customer_view_summary: body.customer_view_summary,
        note: body.note,
      },
      baseUrl,
    );
    return NextResponse.json({
      audit_id: job.audit_id,
      status: job.status,
      flag_status: job.flag?.status,
      customer_view_status: job.customer_view_status,
      draft_report_id: job.draft_report?.report_id ?? null,
      message:
        "Flag resolved (will not raise again). Steps 5–6, diagnosis and writing complete.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
