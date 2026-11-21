import { promises as fs } from "fs";
import path from "path";
import {
  AuditJobSchema,
  emptyStages,
  type AuditJob,
  type IntakeAnswers,
} from "@/lib/audit/types";

const DATA_DIR = path.join(process.cwd(), ".data", "audits");

function auditPath(auditId: string): string {
  return path.join(DATA_DIR, `${auditId}.json`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function newAuditId(): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `aud_${stamp}_${rand}`;
}

export function createEmptyAudit(auditId = newAuditId()): AuditJob {
  const now = new Date().toISOString();
  return {
    audit_id: auditId,
    created_at: now,
    updated_at: now,
    status: "intake",
    tier: 0,
    intake: null,
    ga4: null,
    stages: emptyStages(),
    captures: [],
    creative_scores: [],
    draft_report: null,
    published_report_id: null,
    overrides: [],
    signoff: null,
    assigned_expert_id: null,
    fourc_research: null,
    flag: null,
    customer_view_summary: null,
    customer_view_status: "pending",
    email_log: [],
    publish_attempts: [],
  };
}

export async function saveAudit(job: AuditJob): Promise<AuditJob> {
  await ensureDir();
  const next = {
    ...job,
    updated_at: new Date().toISOString(),
  };
  const parsed = AuditJobSchema.parse(next);
  await fs.writeFile(auditPath(parsed.audit_id), JSON.stringify(parsed, null, 2), "utf8");
  return parsed;
}

export async function getAudit(auditId: string): Promise<AuditJob | null> {
  try {
    const raw = await fs.readFile(auditPath(auditId), "utf8");
    return AuditJobSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function listAudits(): Promise<AuditJob[]> {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const jobs: AuditJob[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const job = await getAudit(file.replace(/\.json$/, ""));
    if (job) jobs.push(job);
  }
  return jobs.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function upsertIntake(
  auditId: string,
  intake: IntakeAnswers,
): Promise<AuditJob> {
  let job = await getAudit(auditId);
  if (!job) {
    job = createEmptyAudit(auditId);
  }
  job.intake = intake;
  job.stages = job.stages.map((s) =>
    s.id === "intake"
      ? {
          ...s,
          status: "done",
          finished_at: new Date().toISOString(),
          log: [...s.log, "Intake saved"],
        }
      : s,
  );
  job.status = "ready_to_run";
  return saveAudit(job);
}
