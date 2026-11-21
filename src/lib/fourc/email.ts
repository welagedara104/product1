import { promises as fs } from "fs";
import path from "path";
import type { FlagRecord } from "@/lib/fourc/types";
import { EmailStubSchema, type EmailStub } from "@/lib/fourc/types";

const EMAIL_DIR = path.join(process.cwd(), ".data", "emails");

async function ensureDir(): Promise<void> {
  await fs.mkdir(EMAIL_DIR, { recursive: true });
}

function emailPath(id: string): string {
  return path.join(EMAIL_DIR, `${id}.json`);
}

export async function sendStubEmail(input: {
  auditId: string;
  template: EmailStub["template"];
  to: string[];
  subject: string;
  body: string;
}): Promise<EmailStub> {
  await ensureDir();
  const stub: EmailStub = EmailStubSchema.parse({
    id: `em_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    audit_id: input.auditId,
    template: input.template,
    to: input.to,
    subject: input.subject,
    body: input.body,
    sent_at: new Date().toISOString(),
    provider: "stub",
  });
  await fs.writeFile(emailPath(stub.id), JSON.stringify(stub, null, 2), "utf8");
  return stub;
}

export async function listEmailsForAudit(auditId: string): Promise<EmailStub[]> {
  await ensureDir();
  const files = await fs.readdir(EMAIL_DIR);
  const out: EmailStub[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(EMAIL_DIR, file), "utf8");
      const parsed = EmailStubSchema.parse(JSON.parse(raw));
      if (parsed.audit_id === auditId) out.push(parsed);
    } catch {
      /* skip bad files */
    }
  }
  return out.sort((a, b) => a.sent_at.localeCompare(b.sent_at));
}

export function parseRecipients(reportRecipients: string): string[] {
  return reportRecipients
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
}

export async function sendFlagRaisedEmail(args: {
  auditId: string;
  recipients: string[];
  flag: FlagRecord;
  dashboardUrl: string;
}): Promise<EmailStub | null> {
  const wording = args.flag.wording;
  if (!wording?.approved_at) return null;

  const flagged = wording.what_is_flagged.map((l) => `• ${l}`).join("\n");
  const questions = wording.questions
    .map((q, i) => `${i + 1}. ${q.prompt}`)
    .join("\n");

  return sendStubEmail({
    auditId: args.auditId,
    template: "flag_raised",
    to: args.recipients.length ? args.recipients : ["owner@example.com"],
    subject: "Please check one thing about your customers",
    body: [
      "What is flagged:",
      flagged,
      "",
      "What we need from you:",
      questions,
      "",
      "How to respond:",
      "Open your dashboard and answer in the card at the top. It takes about 5 minutes. You can also book a short call from the card.",
      "",
      `Dashboard: ${args.dashboardUrl}`,
      "",
      "What happens next:",
      wording.what_happens_next,
      "",
      "(Stub email — no real provider configured.)",
    ].join("\n"),
  });
}

export async function sendFlagResolvedEmail(args: {
  auditId: string;
  recipients: string[];
  dashboardUrl: string;
}): Promise<EmailStub> {
  return sendStubEmail({
    auditId: args.auditId,
    template: "flag_resolved",
    to: args.recipients.length ? args.recipients : ["owner@example.com"],
    subject: "Thanks, your customer view is confirmed",
    body: [
      "Thanks — your customer view is confirmed. Your audit continues.",
      `Dashboard: ${args.dashboardUrl}`,
      "",
      "(Stub email — no real provider configured.)",
    ].join("\n"),
  });
}

export async function sendAuditStartedEmail(args: {
  auditId: string;
  recipients: string[];
  dashboardUrl: string;
  eta: string;
}): Promise<EmailStub> {
  return sendStubEmail({
    auditId: args.auditId,
    template: "audit_started",
    to: args.recipients.length ? args.recipients : ["owner@example.com"],
    subject: "Your Cranial audit has started",
    body: [
      "Your Cranial audit has started.",
      `ETA range: ${args.eta}`,
      `Dashboard: ${args.dashboardUrl}`,
      "",
      "(Stub email — no real provider configured.)",
    ].join("\n"),
  });
}
