import { listPublishedReportIds, readPublishedReport } from "@/lib/audit/publisher";
import { velifushiAnonFixture } from "@/fixtures/velifushi-anon";
import {
  ReportDocumentSchema,
  assertClientPublishable,
  type ReportDocument,
} from "@/lib/report/types";

const FIXTURES: Record<string, ReportDocument> = {
  [velifushiAnonFixture.report_id]: velifushiAnonFixture,
  "lagoon-anon": velifushiAnonFixture,
};

export function listFixtureReports(): Array<{
  report_id: string;
  client: string;
  tier: number;
}> {
  return Object.values(FIXTURES)
    .filter((r, i, arr) => arr.findIndex((x) => x.report_id === r.report_id) === i)
    .map((r) => ({
      report_id: r.report_id,
      client: r.client.name,
      tier: r.tier,
    }));
}

export async function listAllClientReports(): Promise<
  Array<{ report_id: string; client: string; tier: number; source: "fixture" | "published" }>
> {
  const fixtures = listFixtureReports().map((r) => ({ ...r, source: "fixture" as const }));
  const ids = await listPublishedReportIds();
  const published: Array<{
    report_id: string;
    client: string;
    tier: number;
    source: "published";
  }> = [];
  for (const id of ids) {
    const report = await readPublishedReport(id);
    if (!report) continue;
    published.push({
      report_id: report.report_id,
      client: report.client.name,
      tier: report.tier,
      source: "published",
    });
  }
  return [...published, ...fixtures];
}

export async function getReport(reportId: string): Promise<ReportDocument | null> {
  const fixture = FIXTURES[reportId];
  if (fixture) {
    const parsed = ReportDocumentSchema.safeParse(fixture);
    if (!parsed.success) {
      console.error("Invalid report fixture", parsed.error.flatten());
      return null;
    }
    return parsed.data;
  }
  const published = await readPublishedReport(reportId);
  if (!published) return null;
  const parsed = ReportDocumentSchema.safeParse(published);
  if (!parsed.success) {
    console.error("Invalid published report", parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export async function getPublishableReport(reportId: string): Promise<{
  report: ReportDocument | null;
  errors: string[];
}> {
  const report = await getReport(reportId);
  if (!report) return { report: null, errors: ["Report not found"] };
  const errors = assertClientPublishable(report);
  if (errors.length) return { report: null, errors };
  // Hosting layer: published path must exist for non-fixtures (Phase 1 jobs).
  if (!report.build.fixture && !FIXTURES[reportId]) {
    const onDisk = await readPublishedReport(reportId);
    if (!onDisk) {
      return {
        report: null,
        errors: ["Hosting: report is not in the published store (sign-off + publish required)"],
      };
    }
  }
  return { report, errors: [] };
}
