import { NextResponse } from "next/server";
import { getAudit } from "@/lib/audit/store";


type Ctx = { params: Promise<{ auditId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const job = await getAudit(auditId);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(job);
}
