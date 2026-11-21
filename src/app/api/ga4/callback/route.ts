import { NextResponse } from "next/server";
import { getAudit, saveAudit } from "@/lib/audit/store";
import { markGa4OAuthConnected, resolveTier } from "@/lib/ga4/connect";


/**
 * OAuth callback stub.
 * Exchanges code for tokens only when GOOGLE_CLIENT_* are set.
 * Without secrets, redirects back with an error note (use fixture instead).
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
      new URL(`/intake/${state}/ga4?error=${encodeURIComponent(error || "no_code")}`, url.origin),
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

  // TODO: exchange `code` for refresh token via Google token endpoint,
  // encrypt and store. For Phase 1 we mark connected with a placeholder property
  // when the code is present (real exchange needs deployed redirect URI).
  const job = await getAudit(state);
  if (!job) {
    return NextResponse.redirect(new URL("/intake?error=audit_not_found", url.origin));
  }

  job.ga4 = markGa4OAuthConnected(
    "properties/oauth-pending-selection",
    "GA4 property (select in a follow-up step)",
  );
  job.tier = resolveTier(job.ga4);
  await saveAudit(job);

  return NextResponse.redirect(new URL(`/intake/${state}/ga4?connected=1`, url.origin));
}
