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

export function getReport(reportId: string): ReportDocument | null {
  const raw = FIXTURES[reportId];
  if (!raw) return null;
  const parsed = ReportDocumentSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Invalid report fixture", parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export function getPublishableReport(reportId: string): {
  report: ReportDocument | null;
  errors: string[];
} {
  const report = getReport(reportId);
  if (!report) return { report: null, errors: ["Report not found"] };
  const errors = assertClientPublishable(report);
  if (errors.length) return { report: null, errors };
  return { report, errors: [] };
}
