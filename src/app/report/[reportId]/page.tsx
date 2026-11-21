import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ReportShell } from "@/components/report/ReportShell";
import { getPublishableReport } from "@/lib/report/registry";

export const instant = false;

type Props = { params: Promise<{ reportId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { reportId } = await params;
  const { report } = getPublishableReport(decodeURIComponent(reportId));
  return {
    title: report
      ? `${report.client.name} · Cranial Be.Sci audit`
      : "Private report",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}

async function ReportBody({ params }: Props) {
  const { reportId } = await params;
  const { report, errors } = getPublishableReport(decodeURIComponent(reportId));
  if (!report) {
    if (errors.includes("Report not found")) notFound();
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui,sans-serif" }}>
        <h1>Report blocked</h1>
        <p>This build cannot be served to clients.</p>
        <ul>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </main>
    );
  }

  return <ReportShell report={report} />;
}

export default function ReportPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main style={{ padding: "2rem", fontFamily: "system-ui,sans-serif" }}>
          Loading report…
        </main>
      }
    >
      <ReportBody params={params} />
    </Suspense>
  );
}
