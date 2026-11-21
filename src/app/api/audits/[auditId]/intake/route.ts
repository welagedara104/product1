import { NextResponse } from "next/server";
import { upsertIntake } from "@/lib/audit/store";
import { IntakeAnswersSchema } from "@/lib/audit/types";


type Ctx = { params: Promise<{ auditId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const body = await req.json();
  const parsed = IntakeAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid intake", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const job = await upsertIntake(auditId, parsed.data);
  return NextResponse.json({
    audit_id: job.audit_id,
    status: job.status,
    message: "Intake saved. Next: connect GA4 (or use fixture), then run the audit.",
  });
}
