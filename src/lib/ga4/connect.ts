import type { Ga4Connection, IntakeAnswers } from "@/lib/audit/types";
import { ga4FixtureSummary } from "@/lib/ga4/fixture";

/**
 * GA4 connect path.
 * Prefer real OAuth when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
 * Otherwise return a documented fixture connection (tier-1 path still runnable).
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
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    "http://localhost:3000/api/ga4/callback";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    access_type: "offline",
    prompt: "consent",
    state: auditId,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function connectGa4Fixture(intake: IntakeAnswers): Ga4Connection {
  const summary = ga4FixtureSummary(intake.business_name);
  return {
    mode: "fixture",
    property_id: summary.property_id,
    property_name: summary.property_name,
    connected_at: new Date().toISOString(),
    has_refresh_token: false,
    note:
      "TODO: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET for real GA4 OAuth. Using tier-1 fixture analytics for this MVP run.",
  };
}

export function markGa4OAuthConnected(propertyId: string, propertyName: string): Ga4Connection {
  return {
    mode: "oauth",
    property_id: propertyId,
    property_name: propertyName,
    connected_at: new Date().toISOString(),
    has_refresh_token: true,
    note: "Connected via Google OAuth (analytics.readonly).",
  };
}

export function resolveTier(ga4: Ga4Connection | null): 0 | 1 | 2 {
  if (!ga4 || !ga4.property_id) return 0;
  return 1; // ContentSquare deferred to Phase 3
}
