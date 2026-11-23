import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudit } from "@/lib/audit/store";
import { ga4OAuthConfigured } from "@/lib/ga4/connect";
import { Ga4ConnectPanel } from "./Ga4ConnectPanel";



export const instant = false;
type Props = {
  params: Promise<{ auditId: string }>;
  searchParams: Promise<{ error?: string; connected?: string }>;
};

export default async function Ga4Page({ params, searchParams }: Props) {
  const { auditId } = await params;
  const sp = await searchParams;
  const job = await getAudit(auditId);
  if (!job) notFound();

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(1.25rem, 3vw, 2.5rem)",
        background: "#f7f4ef",
        color: "#12212b",
        fontFamily: "var(--font-report-sans), system-ui, sans-serif",
      }}
    >
      <p style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Data connect · {auditId}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)",
        }}
      >
        Connect Google Analytics 4
      </h1>
      <p style={{ maxWidth: "40rem", color: "#3a4a55" }}>
        Tier 1 needs GA4 via Google OAuth (read-only) — never a shared password. If
        OAuth secrets are not set on this machine, use the fixture (or later a CSV/PDF
        upload) so you can still run the full expert loop. Behaviour tools
        (ContentSquare, etc.) are stubbed until Phase 3.
      </p>
      {sp.error ? (
        <p style={{ color: "#8a2a1a" }}>OAuth note: {sp.error}</p>
      ) : null}
      {sp.connected ? (
        <p style={{ color: "#1a5c3a" }}>GA4 OAuth callback received.</p>
      ) : null}
      <Ga4ConnectPanel
        auditId={auditId}
        oauthConfigured={ga4OAuthConfigured()}
        current={job.ga4}
      />
      <p style={{ marginTop: "2rem", fontSize: 14 }}>
        <Link href={`/intake/${auditId}`}>Back to intake</Link>
        {" · "}
        <Link href={`/intake/${auditId}/run`}>Go to run</Link>
      </p>
    </main>
  );
}
