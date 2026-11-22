import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAudit } from "@/lib/audit/store";
import { EXPERT_AUTH_COOKIE, verifyExpertToken } from "@/lib/expert/auth";
import { ExpertActions } from "./ExpertActions";
import { ExpertFlagPanel } from "./ExpertFlagPanel";

export const instant = false;
type Props = { params: Promise<{ auditId: string }> };

export default async function ExpertAuditPage({ params }: Props) {
  const { auditId } = await params;
  const jar = await cookies();
  const auth = verifyExpertToken(jar.get(EXPERT_AUTH_COOKIE)?.value);
  if (!auth.ok) redirect("/expert");

  const job = await getAudit(auditId);
  if (!job) notFound();

  const inferredCount = job.draft_report
    ? Object.values(job.draft_report.pages).flatMap((p) =>
        p.secs.filter((s) => s.comb_state === "inferred"),
      ).length
    : 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(1.25rem, 3vw, 2.5rem)",
        background: "#f3f0ea",
        color: "#12212b",
        fontFamily: "var(--font-report-sans), system-ui, sans-serif",
      }}
    >
      <p style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Expert review · {auth.expert_id}
      </p>
      <h1
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)",
          margin: "0.35rem 0 0.5rem",
        }}
      >
        {job.intake?.business_name ?? auditId}
      </h1>
      <p style={{ color: "#3a4a55", maxWidth: "42rem" }}>
        Status <strong>{job.status}</strong> · tier {job.tier} · customer view:{" "}
        <strong>{job.customer_view_status}</strong> · inferred scores left:{" "}
        <strong>{inferredCount}</strong>
        {job.draft_report ? (
          <>
            {" "}
            · build <code>{job.draft_report.build.sha}</code>
          </>
        ) : null}
      </p>

      <ExpertFlagPanel
        auditId={auditId}
        flag={job.flag}
        fourc={job.fourc_research}
        customerViewSummary={
          job.customer_view_summary ||
            (job.intake ? job.intake.buy_elsewhere : null)
        }
      />

      {!job.draft_report ? (
        <p style={{ marginTop: "1.25rem" }}>
          No draft yet
          {job.flag && job.flag.status !== "resolved"
            ? " — resolve the 4C flag first (capture may already be done)."
            : "."}{" "}
          <Link href={`/intake/${auditId}/run`}>Pipeline</Link>
          {" · "}
          <Link href={`/dashboard/${auditId}`}>Client dashboard</Link>
        </p>
      ) : (
        <>
          <section style={{ marginTop: "1.25rem", maxWidth: 720 }}>
            <h2 style={{ fontSize: "1.1rem" }}>Draft sections (internal only)</h2>
            <ul style={{ paddingLeft: "1.1rem", fontSize: 14 }}>
              {Object.entries(job.draft_report.pages).flatMap(([slug, page]) =>
                page.secs.map((sec) => (
                  <li key={`${slug}-${sec.id}`}>
                    <strong>
                      {slug}/{sec.id}
                    </strong>{" "}
                    {sec.name}: C{sec.comb.C}/O{sec.comb.O}/M{sec.comb.M} ·{" "}
                    <em>{sec.comb_state}</em>
                  </li>
                )),
              )}
            </ul>
            <p style={{ fontSize: 14, color: "#3a4a55" }}>
              Captures: {job.captures.length} · Creative Score frames:{" "}
              {job.creative_scores.length} · GA4: {job.ga4?.mode ?? "none"} · 4C
              steps 5–6:{" "}
              {job.fourc_research?.steps_5_to_6.length ? "yes" : "no"}
            </p>
            {job.ga4?.note ? (
              <p style={{ fontSize: 13, color: "#3a4a55" }}>{job.ga4.note}</p>
            ) : null}
          </section>

          <ExpertActions
            auditId={auditId}
            status={job.status}
            inferredCount={inferredCount}
            publishedReportId={job.published_report_id}
            publishAttempts={job.publish_attempts}
          />
        </>
      )}

      <p style={{ marginTop: "2rem", fontSize: 14 }}>
        <Link href="/expert">All audits</Link>
        {" · "}
        <Link href={`/intake/${auditId}/run`}>Pipeline</Link>
        {" · "}
        <Link href={`/dashboard/${auditId}`}>Client dashboard</Link>
      </p>
    </main>
  );
}
