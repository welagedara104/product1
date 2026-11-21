import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudit } from "@/lib/audit/store";
import { buildDashboard } from "@/lib/fourc/dashboard";
import { DashboardClient } from "./DashboardClient";

export const instant = false;

type Props = { params: Promise<{ auditId: string }> };

export default async function DashboardPage({ params }: Props) {
  const { auditId } = await params;
  const job = await getAudit(auditId);
  if (!job) notFound();

  const dash = buildDashboard(job);
  const initial = {
    audit_id: job.audit_id,
    status: job.status,
    business_name: job.intake?.business_name ?? null,
    tier: job.tier,
    overall_eta: dash.overall_eta,
    current_activity: dash.current_activity,
    what_happens_next: dash.what_happens_next,
    needs_input: dash.needs_input,
    stages: dash.stages,
    flag:
      job.flag && job.flag.status !== "resolved"
        ? {
            status: job.flag.status,
            raised_at: job.flag.raised_at,
            wording:
              job.flag.wording?.approved_at != null
                ? {
                    title: job.flag.wording.title,
                    what_is_flagged: job.flag.wording.what_is_flagged,
                    questions: job.flag.wording.questions,
                    what_happens_next: job.flag.wording.what_happens_next,
                  }
                : null,
            client_responded: Boolean(job.flag.client_response),
          }
        : job.flag?.status === "resolved"
          ? {
              status: "resolved" as const,
              raised_at: job.flag.raised_at,
              wording: null,
              resolved_at: job.flag.resolution?.at ?? null,
              history_line: `Customer view verified by a Cranial expert on ${
                job.flag.resolution?.at?.slice(0, 10) ?? "—"
              }`,
            }
          : null,
    published_report_id: job.published_report_id,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(1.25rem, 3vw, 2.5rem)",
        background:
          "radial-gradient(900px 480px at 100% 0%, #e8f2ef, transparent 50%), #f7f4ef",
        color: "#12212b",
        fontFamily: "var(--font-report-sans), system-ui, sans-serif",
      }}
    >
      <p
        style={{
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        Live progress · {auditId}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(1.9rem, 4vw, 2.6rem)",
          margin: "0.35rem 0 0.5rem",
        }}
      >
        {job.intake?.business_name ?? "Your audit"}
      </h1>
      <p style={{ maxWidth: "40rem", color: "#3a4a55", margin: 0 }}>
        Watch each stage as it runs. You will only see scores and findings after
        a Cranial expert signs off.
      </p>

      <DashboardClient auditId={auditId} initial={initial} />

      <p style={{ marginTop: "2rem", fontSize: 14 }}>
        <Link href={`/intake/${auditId}/run`}>Pipeline controls</Link>
        {" · "}
        <Link href="/">Home</Link>
      </p>
    </main>
  );
}
