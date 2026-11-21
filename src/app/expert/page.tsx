import Link from "next/link";
import { cookies } from "next/headers";
import { listAudits } from "@/lib/audit/store";
import { EXPERT_AUTH_COOKIE, verifyExpertToken } from "@/lib/expert/auth";
import { ExpertLoginForm } from "./ExpertLoginForm";



export const instant = false;
export default async function ExpertHomePage() {
  const jar = await cookies();
  const auth = verifyExpertToken(jar.get(EXPERT_AUTH_COOKIE)?.value);
  const audits = auth.ok ? await listAudits() : [];

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(1.25rem, 3vw, 2.5rem)",
        background:
          "radial-gradient(800px 420px at 0% 0%, #e4eef5, transparent 55%), #f3f0ea",
        color: "#12212b",
        fontFamily: "var(--font-report-sans), system-ui, sans-serif",
      }}
    >
      <p style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Cranial · Expert workspace
      </p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(1.9rem, 4vw, 2.8rem)",
          margin: "0.35rem 0 0.6rem",
        }}
      >
        Review and sign off
      </h1>
      <p style={{ maxWidth: "40rem", color: "#3a4a55" }}>
        Only an expert can sign off or publish. Inferred scores never go to the client.
        Operators cannot bypass this gate.
      </p>

      {!auth.ok ? (
        <ExpertLoginForm />
      ) : (
        <div style={{ marginTop: "1.5rem" }}>
          <p style={{ fontSize: 14 }}>
            Signed in as <strong>{auth.expert_id}</strong>
          </p>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
            {audits.length === 0 ? (
              <li style={{ color: "#3a4a55" }}>
                No audits yet.{" "}
                <Link href="/intake">Start intake</Link>
              </li>
            ) : (
              audits.map((a) => (
                <li key={a.audit_id}>
                  <Link
                    href={`/expert/${a.audit_id}`}
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
                    <strong>{a.intake?.business_name ?? a.audit_id}</strong>
                    <div style={{ fontSize: 13, color: "#3a4a55" }}>
                      {a.status} · tier {a.tier}
                      {a.published_report_id
                        ? ` · published ${a.published_report_id}`
                        : ""}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <p style={{ marginTop: "2rem", fontSize: 14 }}>
        <Link href="/">Home</Link>
        {" · "}
        <Link href="/intake">Client intake</Link>
      </p>
    </main>
  );
}
