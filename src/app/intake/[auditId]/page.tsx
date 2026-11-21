import { notFound } from "next/navigation";
import { getAudit } from "@/lib/audit/store";
import { IntakeForm } from "./IntakeForm";



export const instant = false;
type Props = { params: Promise<{ auditId: string }> };

export default async function IntakeAuditPage({ params }: Props) {
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
      <p
        style={{
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontSize: 12,
          margin: 0,
        }}
      >
        Intake · {auditId}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)",
          margin: "0.35rem 0 0.5rem",
        }}
      >
        Tell us about your site
      </h1>
      <p style={{ color: "#3a4a55", maxWidth: "40rem" }}>
        Required questions only for this MVP. Save takes you to GA4 connect next.
      </p>
      <IntakeForm auditId={auditId} initial={job.intake} />
    </main>
  );
}
