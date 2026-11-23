import type { Ga4Connection, IntakeAnswers } from "@/lib/audit/types";
import { ga4FixtureSummary } from "@/lib/ga4/fixture";
import { ga4RedirectUri } from "@/lib/ga4/oauth";

/**
 * GA4 connect path — OAuth-first when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
 * Client never shares a Google password; colleague invite = share the OAuth link.
 * Without secrets, documented fixture keeps the tier-1 path runnable.
 */
export function ga4OAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}

export function getGa4OAuthAuthorizeUrl(auditId: string): string | null {
  if (!ga4OAuthConfigured()) return null;
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: ga4RedirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: auditId,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Shareable connect link for a colleague who is the GA admin (same OAuth URL). */
export function getGa4ColleagueInviteUrl(auditId: string): string | null {
  return getGa4OAuthAuthorizeUrl(auditId);
}

export function connectGa4Fixture(intake: IntakeAnswers): Ga4Connection {
  const summary = ga4FixtureSummary(intake.business_name);
  return {
    mode: "fixture",
    property_id: summary.property_id,
    property_name: summary.property_name,
    connected_at: new Date().toISOString(),
    has_refresh_token: false,
    note: ga4OAuthConfigured()
      ? "OAuth secrets are present but fixture was chosen. Prefer Connect with Google for production audits."
      : "TODO: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for real GA4 OAuth. Using tier-1 fixture analytics for this MVP run. Upload GA CSV/PDF if OAuth is unavailable — never a Google password.",
  };
}

export function markGa4OAuthConnected(
  propertyId: string,
  propertyName: string,
  opts?: { has_refresh_token?: boolean; note?: string },
): Ga4Connection {
  return {
    mode: "oauth",
    property_id: propertyId,
    property_name: propertyName,
    connected_at: new Date().toISOString(),
    has_refresh_token: opts?.has_refresh_token ?? true,
    note:
      opts?.note ??
      "Connected via Google OAuth (analytics.readonly). Refresh token stored under .data/secrets/ga4/ (encrypt before production).",
  };
}

export function resolveTier(ga4: Ga4Connection | null): 0 | 1 | 2 {
  if (!ga4 || !ga4.property_id) return 0;
  return 1; // ContentSquare / behaviour connector → Tier 2 in Phase 3
}
