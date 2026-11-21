import { createHmac, timingSafeEqual } from "crypto";

export const EXPERT_AUTH_COOKIE = "cranial_expert_session";

function secret(): string {
  return (
    process.env.EXPERT_AUTH_SECRET ||
    process.env.REPORT_AUTH_SECRET ||
    "phase1-expert-dev-secret"
  );
}

export function expectedExpertPassword(): string {
  return process.env.EXPERT_ACCESS_PASSWORD || "phase1-expert";
}

export function createExpertToken(expertId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ role: "expert", expert_id: expertId, v: 1 }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyExpertToken(
  token: string | undefined,
): { ok: true; expert_id: string } | { ok: false } {
  if (!token) return { ok: false };
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return { ok: false };
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: string;
      expert_id?: string;
    };
    if (data.role !== "expert" || !data.expert_id) return { ok: false };
    return { ok: true, expert_id: data.expert_id };
  } catch {
    return { ok: false };
  }
}
