import { promises as fs } from "fs";
import path from "path";
import { assertExpert } from "@/lib/audit/roles";
import type { AuditJob, Role } from "@/lib/audit/types";
import { assertClientPublishable, type ReportDocument } from "@/lib/report/types";

const PUBLISHED_DIR = path.join(process.cwd(), ".data", "published");

export type PublishResult = {
  ok: boolean;
  errors: string[];
  layer: "workflow" | "publisher" | "hosting";
  report_id?: string;
};

/**
 * Layer 1 — workflow gate: publish step will not run without sign-off.
 */
export function workflowPublishGate(job: AuditJob): PublishResult {
  const errors: string[] = [];
  if (job.status !== "signed_off" && !job.signoff) {
    errors.push("Workflow: publish blocked — audit is not signed off");
  }
  if (!job.draft_report) {
    errors.push("Workflow: no draft report to publish");
  } else if (!job.signoff) {
    errors.push("Workflow: missing expert sign-off record");
  } else if (job.signoff.build_sha !== job.draft_report.build.sha) {
    errors.push("Workflow: sign-off build hash does not match current draft");
  }
  return {
    ok: errors.length === 0,
    errors,
    layer: "workflow",
    report_id: job.draft_report?.report_id,
  };
}

/**
 * Layer 2 — publisher service: re-checks sign-off + no inferred scores.
 */
export function publisherGate(
  job: AuditJob,
  role: Role,
): PublishResult {
  const errors: string[] = [];
  try {
    assertExpert(role, "Publish");
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  const wf = workflowPublishGate(job);
  errors.push(...wf.errors.filter((e) => !errors.includes(e)));

  if (job.draft_report) {
    for (const e of assertClientPublishable(job.draft_report)) {
      errors.push(`Publisher: ${e}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    layer: "publisher",
    report_id: job.draft_report?.report_id,
  };
}

/**
 * Layer 3 — hosting: serve only if published manifest has valid sign-off.
 * (Also enforced again in report registry when serving /report/[id].)
 */
export function hostingGate(report: ReportDocument | null): PublishResult {
  if (!report) {
    return {
      ok: false,
      errors: ["Hosting: report not found"],
      layer: "hosting",
    };
  }
  const errors = assertClientPublishable(report).map((e) => `Hosting: ${e}`);
  return {
    ok: errors.length === 0,
    errors,
    layer: "hosting",
    report_id: report.report_id,
  };
}

export async function writePublishedReport(
  report: ReportDocument,
): Promise<void> {
  await fs.mkdir(PUBLISHED_DIR, { recursive: true });
  const file = path.join(PUBLISHED_DIR, `${report.report_id}.json`);
  await fs.writeFile(file, JSON.stringify(report, null, 2), "utf8");
}

export async function readPublishedReport(
  reportId: string,
): Promise<ReportDocument | null> {
  try {
    const raw = await fs.readFile(
      path.join(PUBLISHED_DIR, `${reportId}.json`),
      "utf8",
    );
    return JSON.parse(raw) as ReportDocument;
  } catch {
    return null;
  }
}

export async function listPublishedReportIds(): Promise<string[]> {
  try {
    const files = await fs.readdir(PUBLISHED_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}
