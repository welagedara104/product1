import { NextResponse } from "next/server";
import { getAudit, saveAudit } from "@/lib/audit/store";
import { markGa4OAuthConnected, resolveTier } from "@/lib/ga4/connect";
import {
  exchangeGa4AuthCode,
  listGa4AccountSummaries,
  storeGa4RefreshTokenRef,
} from "@/lib/ga4/oauth";

/**
 * OAuth callback: exchange code for tokens when GOOGLE_CLIENT_* are set.
 * Picks the first visible GA4 property (follow-up UI can re-select).
 * Without secrets, redirects with an error (use fixture instead).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // auditId
  const error = url.searchParams.get("error");

  if (!state) {
    return NextResponse.redirect(new URL("/intake?error=missing_state", url.origin));
  }

  if (error || !code) {
    return NextResponse.redirect(
      new URL(
        `/intake/${state}/ga4?error=${encodeURIComponent(error || "no_code")}`,
        url.origin,
      ),
    );
  }

  if (
    !process.env.GOOGLE_CLIENT_ID?.trim() ||
    !process.env.GOOGLE_CLIENT_SECRET?.trim()
  ) {
    return NextResponse.redirect(
      new URL(
        `/intake/${state}/ga4?error=${encodeURIComponent("oauth_secrets_missing")}`,
        url.origin,
      ),
    );
  }

  const job = await getAudit(state);
  if (!job) {
    return NextResponse.redirect(new URL("/intake?error=audit_not_found", url.origin));
  }

  const exchanged = await exchangeGa4AuthCode(code);
  if (!exchanged.ok) {
    return NextResponse.redirect(
      new URL(
        `/intake/${state}/ga4?error=${encodeURIComponent(exchanged.error)}`,
        url.origin,
      ),
    );
  }

  const stored = await storeGa4RefreshTokenRef(state, exchanged.refresh_token);
  const properties = await listGa4AccountSummaries(exchanged.access_token);
  const first = properties[0];

  job.ga4 = markGa4OAuthConnected(
    first?.property_id ?? "properties/oauth-pending-selection",
    first?.property_name ?? "GA4 property (select in a follow-up step)",
    {
      has_refresh_token: stored.has_refresh_token,
      note: first
        ? `Connected via Google OAuth (analytics.readonly). Using ${first.property_name}. ${properties.length > 1 ? `${properties.length} properties visible — picker TODO.` : ""}`.trim()
        : "Connected via Google OAuth; no properties visible yet — pick a property in a follow-up step or confirm the Google account has Analytics access.",
    },
  );
  job.tier = resolveTier(job.ga4);
  job.stages = job.stages.map((s) =>
    s.id === "ga4_connect"
      ? {
          ...s,
          status: "done",
          finished_at: new Date().toISOString(),
          log: [...s.log, job.ga4?.note ?? "GA4 OAuth connected"],
        }
      : s,
  );
  await saveAudit(job);

  return NextResponse.redirect(
    new URL(`/intake/${state}/ga4?connected=1`, url.origin),
  );
}
