import { NextResponse } from "next/server";
import { getAudit, saveAudit } from "@/lib/audit/store";
import { buildConnectorPlan } from "@/lib/connectors";
import {
  connectGa4Fixture,
  ga4OAuthConfigured,
  getGa4ColleagueInviteUrl,
  getGa4OAuthAuthorizeUrl,
  resolveTier,
} from "@/lib/ga4/connect";

type Ctx = { params: Promise<{ auditId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { auditId } = await ctx.params;
  const job = await getAudit(auditId);
  const oauthUrl = getGa4OAuthAuthorizeUrl(auditId);
  const plan = job?.intake ? buildConnectorPlan(job.intake, job.ga4) : null;
  return NextResponse.json({
    oauth_configured: ga4OAuthConfigured(),
    oauth_url: oauthUrl,
    colleague_invite_url: getGa4ColleagueInviteUrl(auditId),
    password_policy: "never_ask_client_for_passwords",
    connector_plan: plan,
    gap: ga4OAuthConfigured()
      ? null
      : "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set. Use fixture connect for the tier-1 MVP path, or upload GA exports — never a Google password.",
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
    return NextResponse.json({
      redirect: url,
      colleague_invite_url: url,
      message:
        "Redirecting to Google OAuth (analytics.readonly). Share the same link with a colleague if they are the GA admin.",
    });
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
  const plan = buildConnectorPlan(saved.intake!, saved.ga4);
  return NextResponse.json({
    ga4: saved.ga4,
    tier: saved.tier,
    connector_plan: plan,
    message:
      "GA4 fixture connected (tier 1). Ready to run the pipeline. Prefer OAuth when secrets are configured; uploads are the offline fallback — never collect passwords.",
  });
}
