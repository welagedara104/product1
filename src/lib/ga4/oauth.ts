/**
 * GA4 Google OAuth helpers (authorization code → tokens).
 * Secrets come only from env (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) — never hard-coded.
 * Refresh tokens must be encrypted at rest before production; MVP stores a opaque ref flag only.
 */

export type Ga4TokenExchangeResult =
  | {
      ok: true;
      access_token: string;
      refresh_token: string | null;
      expires_in: number | null;
      scope: string | null;
      token_type: string | null;
    }
  | { ok: false; error: string };

export function ga4RedirectUri(): string {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/ga4/callback"
  );
}

export async function exchangeGa4AuthCode(
  code: string,
): Promise<Ga4TokenExchangeResult> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return { ok: false, error: "oauth_secrets_missing" };
  }

  try {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: ga4RedirectUri(),
      grant_type: "authorization_code",
    });
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const err =
        typeof json.error === "string"
          ? json.error
          : `token_http_${res.status}`;
      return { ok: false, error: err };
    }
    const access = typeof json.access_token === "string" ? json.access_token : "";
    if (!access) return { ok: false, error: "missing_access_token" };
    return {
      ok: true,
      access_token: access,
      refresh_token:
        typeof json.refresh_token === "string" ? json.refresh_token : null,
      expires_in: typeof json.expires_in === "number" ? json.expires_in : null,
      scope: typeof json.scope === "string" ? json.scope : null,
      token_type: typeof json.token_type === "string" ? json.token_type : null,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "token_exchange_failed",
    };
  }
}

/**
 * List GA4 account summaries the token can see (property picker follow-up).
 * Returns empty on failure — caller keeps a pending-selection placeholder.
 */
export async function listGa4AccountSummaries(
  accessToken: string,
): Promise<Array<{ property_id: string; property_name: string }>> {
  try {
    const res = await fetch(
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      {
        headers: { authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      accountSummaries?: Array<{
        propertySummaries?: Array<{ property?: string; displayName?: string }>;
      }>;
    };
    const out: Array<{ property_id: string; property_name: string }> = [];
    for (const acct of json.accountSummaries ?? []) {
      for (const p of acct.propertySummaries ?? []) {
        if (p.property) {
          out.push({
            property_id: p.property,
            property_name: p.displayName || p.property,
          });
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Opaque storage hook — production must encrypt refresh tokens (KMS / secret store).
 * MVP writes only under `.data/secrets/ga4/` which is gitignored via `.data/`.
 * Never log the token value.
 */
export async function storeGa4RefreshTokenRef(
  auditId: string,
  refreshToken: string | null,
): Promise<{ has_refresh_token: boolean; secret_ref: string | null }> {
  if (!refreshToken) {
    return { has_refresh_token: false, secret_ref: null };
  }
  const { promises: fs } = await import("fs");
  const path = await import("path");
  const dir = path.join(process.cwd(), ".data", "secrets", "ga4");
  await fs.mkdir(dir, { recursive: true });
  const ref = `ga4:${auditId}`;
  const file = path.join(dir, `${auditId}.refresh.token`);
  // TODO(prod): encrypt before write. Plain file is local-dev only.
  await fs.writeFile(file, refreshToken, { mode: 0o600 });
  return { has_refresh_token: true, secret_ref: ref };
}
