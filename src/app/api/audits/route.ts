import { NextResponse } from "next/server";
import { createEmptyAudit, listAudits, saveAudit } from "@/lib/audit/store";


export async function GET() {
  const audits = await listAudits();
  return NextResponse.json({
    audits: audits.map((a) => ({
      audit_id: a.audit_id,
      status: a.status,
      tier: a.tier,
      client: a.intake?.business_name ?? null,
      updated_at: a.updated_at,
      published_report_id: a.published_report_id,
    })),
  });
}

export async function POST() {
  const job = await saveAudit(createEmptyAudit());
  return NextResponse.json({ audit_id: job.audit_id, status: job.status });
}
