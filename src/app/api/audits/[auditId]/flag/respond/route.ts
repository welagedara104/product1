import { NextResponse } from "next/server";
import { submitFlagResponse } from "@/lib/audit/workflow";

type Ctx = { params: Promise<{ auditId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  let body: {
    answers?: Record<string, string>;
    notes?: string;
    request_call?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "answers required" }, { status: 400 });
  }

  try {
    const job = await submitFlagResponse(auditId, body.answers, {
      notes: body.notes,
      request_call: body.request_call,
    });
    return NextResponse.json({
      audit_id: job.audit_id,
      status: job.status,
      flag_status: job.flag?.status,
      message: "Thanks — an expert is reviewing your answer.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    );
  }
}
