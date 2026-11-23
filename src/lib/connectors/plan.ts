import { intakeWantsGa4 } from "@/lib/audit/intake-fields";
import type { Ga4Connection, IntakeAnswers } from "@/lib/audit/types";
import { planBehaviourConnection } from "@/lib/connectors/behaviour";
import type { ConnectorPlan } from "@/lib/connectors/types";
import { ga4OAuthConfigured } from "@/lib/ga4/connect";

/**
 * Build the connector plan shown after intake / on the GA4 connect page.
 * GA4 is OAuth-first; behaviour tools are stubs until Phase 3; uploads are the fallback.
 */
export function buildConnectorPlan(
  intake: IntakeAnswers,
  ga4: Ga4Connection | null,
): ConnectorPlan {
  const wantsGa4 = intakeWantsGa4(intake);
  const oauthReady = ga4OAuthConfigured();

  let analyticsStatus: ConnectorPlan["analytics"]["status"] = "not_started";
  let preferred: ConnectorPlan["analytics"]["preferred"] = "skip";
  let note: string;

  if (intake.analytics_tool === "none") {
    analyticsStatus = "skipped";
    preferred = "skip";
    note =
      "No analytics tool — traffic map/funnels stay qualitative (tier 0). Optional GA CSV/PDF upload later.";
  } else if (intake.analytics_tool === "other") {
    preferred = "upload";
    analyticsStatus = "awaiting_upload";
    note = `${intake.analytics_other_name || "Other analytics"}: prefer a client-created read-only key or CSV/PDF upload. Never ask for a password.`;
  } else if (ga4?.mode === "oauth" && ga4.has_refresh_token) {
    analyticsStatus = "connected";
    preferred = "oauth";
    note = ga4.note ?? "GA4 connected via Google OAuth (analytics.readonly).";
  } else if (ga4?.mode === "fixture") {
    analyticsStatus = "fixture";
    preferred = oauthReady ? "oauth" : "upload";
    note =
      ga4.note ??
      "Using GA4 fixture for this run. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for real OAuth.";
  } else if (wantsGa4 && oauthReady) {
    analyticsStatus = "awaiting_oauth";
    preferred = "oauth";
    note =
      "Connect with Google OAuth (read-only). If the intake person is not a GA admin, send the connect link to a colleague. CSV/PDF upload is the fallback.";
  } else if (wantsGa4) {
    analyticsStatus = "awaiting_upload";
    preferred = "upload";
    note =
      "GOOGLE_CLIENT_* not configured — use the tier-1 GA4 fixture for demos, or upload GA exports. Do not collect Google passwords.";
  } else {
    analyticsStatus = "skipped";
    preferred = "skip";
    note = "Analytics tool not GA4.";
  }

  return {
    analytics: {
      tool: intake.analytics_tool,
      other_name: intake.analytics_other_name,
      preferred,
      status: analyticsStatus,
      note,
    },
    behaviour: planBehaviourConnection(intake),
    password_policy: "never_ask_client_for_passwords",
  };
}
