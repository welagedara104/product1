import Link from "next/link";
import { listFixtureReports } from "@/lib/report/registry";

export default function Home() {
  const fixtures = listFixtureReports();

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
        Cranial · Phase 0 foundations
      </p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(2.2rem, 5vw, 3.4rem)",
          margin: "0.4rem 0 0.75rem",
          maxWidth: "16ch",
        }}
      >
        Be.Sci website audit
      </h1>
      <p style={{ maxWidth: "40rem", color: "#3a4a55", fontSize: "1.1rem" }}>
        Report data model, Velifushi-inspired renderer on an anonymised fixture, QA at
        three widths, and private noindex hosting.
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Fixture reports (password gated)</h2>
        <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
          {fixtures.map((f) => (
            <li key={f.report_id}>
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
                  {f.report_id} · tier {f.tier}
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 13, color: "#3a4a55" }}>
          Local default password: <code>phase0-fixture</code> (override with{" "}
          <code>REPORT_ACCESS_PASSWORD</code>).
        </p>
      </section>
    </main>
  );
}
