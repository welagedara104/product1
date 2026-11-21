import Link from "next/link";
import { listAllClientReports } from "@/lib/report/registry";



export const instant = false;
export default async function Home() {
  const reports = await listAllClientReports();

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(1.5rem, 4vw, 3rem)",
        background:
          "radial-gradient(1000px 560px at 0% 0%, #e7f3ef, transparent 55%), #f7f4ef",
        color: "#12212b",
        fontFamily: "var(--font-report-sans), system-ui, sans-serif",
      }}
    >
      <p
        style={{
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: 12,
          margin: 0,
        }}
      >
        Cranial · Phase 1 MVP
      </p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
          margin: "0.4rem 0 0.75rem",
          maxWidth: "18ch",
        }}
      >
        Be.Sci website audit
      </h1>
      <p style={{ maxWidth: "40rem", color: "#3a4a55", fontSize: "1.1rem" }}>
        Expert-in-the-loop: intake → GA4 → capture → Creative Score → COM-B draft →
        expert sign-off → private publish. Nothing client-visible without sign-off.
      </p>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginTop: "1.5rem",
        }}
      >
        <Link href="/intake" style={cta}>
          Start client intake
        </Link>
        <Link href="/expert" style={ctaSecondary}>
          Expert workspace
        </Link>
        <Link href="/demo-site" style={ctaSecondary}>
          Demo site (capture target)
        </Link>
      </nav>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Client-visible reports (password gated)</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
          {reports.map((f) => (
            <li key={`${f.source}-${f.report_id}`}>
              <Link
                href={`/report/${f.report_id}`}
                style={{
                  display: "block",
                  background: "#fff",
                  border: "1px solid #d5cbb8",
                  borderRadius: 10,
                  padding: "0.9rem 1rem",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <strong>{f.client}</strong>
                <div style={{ fontSize: 13, color: "#3a4a55" }}>
                  {f.report_id} · tier {f.tier} · {f.source}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 13, color: "#3a4a55" }}>
          Report password: <code>phase0-fixture</code> · Expert password:{" "}
          <code>phase1-expert</code>
        </p>
      </section>
    </main>
  );
}

const cta = {
  display: "inline-block",
  background: "#0b3a4a",
  color: "#f4efe6",
  padding: "0.75rem 1.1rem",
  textDecoration: "none",
  fontWeight: 600,
} as const;
const ctaSecondary = {
  ...cta,
  background: "#fff",
  color: "#0b3a4a",
  border: "1px solid #0b3a4a",
} as const;
