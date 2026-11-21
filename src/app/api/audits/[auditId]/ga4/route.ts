import { NextResponse } from "next/server";
import { getAudit, saveAudit } from "@/lib/audit/store";
import {
  connectGa4Fixture,
  ga4OAuthConfigured,
  getGa4OAuthAuthorizeUrl,
  resolveTier,
} from "@/lib/ga4/connect";


type Ctx = { params: Promise<{ auditId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const oauthUrl = getGa4OAuthAuthorizeUrl(auditId);
  return NextResponse.json({
    oauth_configured: ga4OAuthConfigured(),
    oauth_url: oauthUrl,
    gap: ga4OAuthConfigured()
      ? null
      : "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set. Use fixture connect for the tier-1 MVP path.",
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const job = await getAudit(auditId);
  if (!job?.intake) {
    return NextResponse.json({ error: "Save intake first" }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as { mode?: string };
  if (body.mode === "oauth" && ga4OAuthConfigured()) {
    const url = getGa4OAuthAuthorizeUrl(auditId);
    return NextResponse.json({ redirect: url });
  }
  job.ga4 = connectGa4Fixture(job.intake);
  job.tier = resolveTier(job.ga4);
  job.stages = job.stages.map((s) =>
    s.id === "ga4_connect"
      ? {
          ...s,
          status: "done",
          finished_at: new Date().toISOString(),
          log: [...s.log, job.ga4?.note ?? "Fixture connected"],
        }
      : s,
  );
  const saved = await saveAudit(job);
  return NextResponse.json({
    ga4: saved.ga4,
    tier: saved.tier,
    message: "GA4 fixture connected (tier 1). Ready to run the pipeline.",
  });
}
