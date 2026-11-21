export const REPORT_AUTH_COOKIE = "cranial_report_access";

const DEFAULT_DEV_PASSWORD = "phase0-fixture";

export function getReportAccessPassword(): string {
  return process.env.REPORT_ACCESS_PASSWORD || DEFAULT_DEV_PASSWORD;
}

function signingSecret(): string {
  return (
    process.env.REPORT_AUTH_SECRET ||
    process.env.REPORT_ACCESS_PASSWORD ||
    DEFAULT_DEV_PASSWORD
  );
}

async function hmacHex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function mintReportAccessToken(reportId: string): Promise<string> {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12h
  const payload = `${reportId}.${exp}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

export async function verifyReportAccessToken(
  token: string | undefined,
  reportId: string,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [id, expStr, sig] = parts;
  if (id !== reportId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${id}.${expStr}`;
  const expected = await hmacHex(payload);
  return timingSafeEqualStr(sig, expected);
}

export function passwordMatches(candidate: string): boolean {
  return timingSafeEqualStr(candidate, getReportAccessPassword());
}
