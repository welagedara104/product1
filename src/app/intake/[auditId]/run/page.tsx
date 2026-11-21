import Link from "next/link";
import { notFound } from "next/navigation";
import { getAudit } from "@/lib/audit/store";
import { RunPipelinePanel } from "./RunPipelinePanel";



export const instant = false;
type Props = { params: Promise<{ auditId: string }> };

export default async function RunPage({ params }: Props) {
  const { auditId } = await params;
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
        Pipeline · {auditId}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)",
        }}
      >
        Run the audit
      </h1>
      <p style={{ maxWidth: "40rem", color: "#3a4a55" }}>
        This runs capture (1440 + 390, stop before payment), Creative Score, then COM-B
        diagnosis into a draft report. Draft scores stay internal until an expert signs
        off.
      </p>
      <RunPipelinePanel
        auditId={auditId}
        status={job.status}
        stages={job.stages}
        hasIntake={Boolean(job.intake)}
        hasGa4={Boolean(job.ga4)}
      />
      <p style={{ marginTop: "2rem", fontSize: 14 }}>
        <Link href={`/intake/${auditId}/ga4`}>Back to GA4</Link>
        {" · "}
        <Link href={`/expert/${auditId}`}>Open expert workspace</Link>
      </p>
    </main>
  );
}
