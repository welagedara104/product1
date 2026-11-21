import {
  hostingGate,
  publisherGate,
  workflowPublishGate,
  writePublishedReport,
} from "@/lib/audit/publisher";
import { assertExpert } from "@/lib/audit/roles";
import { getAudit, saveAudit } from "@/lib/audit/store";
import type {
  AuditJob,
  ExpertOverride,
  Role,
  StageId,
  StageRecord,
} from "@/lib/audit/types";
import { runCapture } from "@/lib/capture/runner";
import { scoreCaptures } from "@/lib/creative-score/client";
import { buildDraftReport } from "@/lib/diagnosis/build-draft-report";
import {
  fourCResearchToChapter,
  runFourCResearch,
  runFourCSynthesis,
} from "@/lib/fourc/agent";
import {
  parseRecipients,
  sendAuditStartedEmail,
  sendFlagRaisedEmail,
  sendFlagResolvedEmail,
} from "@/lib/fourc/email";
import type { FlagRecord } from "@/lib/fourc/types";
import { draftFlagWording, evaluateValidation } from "@/lib/fourc/validate";
import {
  connectGa4Fixture,
  ga4OAuthConfigured,
  resolveTier,
} from "@/lib/ga4/connect";
import type { ReportDocument, Signoff } from "@/lib/report/types";

function patchStage(
  stages: StageRecord[],
  id: StageId,
  patch: Partial<StageRecord>,
): StageRecord[] {
  return stages.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

function logStage(stages: StageRecord[], id: StageId, message: string): StageRecord[] {
  return stages.map((s) =>
    s.id === id ? { ...s, log: [...s.log, message] } : s,
  );
}

function dashboardUrl(baseUrl: string, auditId: string): string {
  return `${baseUrl.replace(/\/$/, "")}/dashboard/${auditId}`;
}

async function runIndependentStages(
  job: AuditJob,
  baseUrl: string,
): Promise<AuditJob> {
  const intake = job.intake!;

  // --- Capture (independent of flag) ---
  if (job.stages.find((s) => s.id === "capture")?.status !== "done") {
    job.stages = patchStage(job.stages, "capture", {
      status: "running",
      started_at: new Date().toISOString(),
    });
    job = await saveAudit(job);
    try {
      job.captures = await runCapture({
        auditId: job.audit_id,
        intake,
        baseUrl,
      });
      const stopped = job.captures.every((c) => c.stopped_before_payment);
      job.stages = logStage(
        job.stages,
        "capture",
        `Captured ${job.captures.length} frames (1440 + 390). Stopped before payment: ${stopped}`,
      );
      job.stages = patchStage(job.stages, "capture", {
        status: "done",
        finished_at: new Date().toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      job.stages = patchStage(job.stages, "capture", {
        status: "failed",
        error: msg,
        finished_at: new Date().toISOString(),
      });
      job.status = "failed";
      return saveAudit(job);
    }
    job = await saveAudit(job);
  }

  // --- Creative Score ---
  if (job.stages.find((s) => s.id === "creative_score")?.status !== "done") {
    job.stages = patchStage(job.stages, "creative_score", {
      status: "running",
      started_at: new Date().toISOString(),
    });
    job = await saveAudit(job);
    job.creative_scores = await scoreCaptures(job.captures);
    job.stages = logStage(
      job.stages,
      "creative_score",
      job.creative_scores[0]?.todo ??
        `Scored ${job.creative_scores.length} frames`,
    );
    job.stages = patchStage(job.stages, "creative_score", {
      status: "done",
      finished_at: new Date().toISOString(),
    });
    job = await saveAudit(job);
  }

  // --- Analytics (fixture pull; ContentSquare deferred to Phase 3) ---
  if (job.stages.find((s) => s.id === "analytics")?.status !== "done") {
    job.stages = patchStage(job.stages, "analytics", {
      status: "running",
      started_at: new Date().toISOString(),
    });
    job = await saveAudit(job);
    job.stages = logStage(
      job.stages,
      "analytics",
      job.tier >= 1
        ? "GA4 fixture/OAuth figures attached for diagnosis."
        : "No GA4; analytics stage records the gap only.",
    );
    job.stages = patchStage(job.stages, "analytics", {
      status: "done",
      finished_at: new Date().toISOString(),
    });
    job = await saveAudit(job);
  }

  return job;
}

async function runDependentStages(job: AuditJob): Promise<AuditJob> {
  if (
    job.customer_view_status !== "validated" &&
    job.customer_view_status !== "expert_verified"
  ) {
    throw new Error(
      "Cannot run Steps 5–6 / diagnosis until customer view is validated or expert-verified",
    );
  }
  const intake = job.intake;
  const priorResearch = job.fourc_research;
  if (!intake || !priorResearch) {
    throw new Error("Missing intake or 4C research");
  }

  const summary =
    job.customer_view_summary || intake.customer_opinion;

  // --- 4C Steps 5–6 ---
  job.stages = patchStage(job.stages, "fourc_synthesis", {
    status: "running",
    started_at: new Date().toISOString(),
  });
  job = await saveAudit(job);

  job.fourc_research = runFourCSynthesis(
    intake,
    summary,
    priorResearch,
  );
  job.stages = logStage(
    job.stages,
    "fourc_synthesis",
    "Steps 5–6 saved: Venn slide, insight and offer.",
  );
  job.stages = patchStage(job.stages, "fourc_synthesis", {
    status: "done",
    finished_at: new Date().toISOString(),
  });
  job = await saveAudit(job);

  // --- Diagnosis ---
  job.stages = patchStage(job.stages, "diagnosis", {
    status: "running",
    started_at: new Date().toISOString(),
  });
  job = await saveAudit(job);
  job.draft_report = buildDraftReport(job);
  job.stages = logStage(
    job.stages,
    "diagnosis",
    "COM-B draft scores written (state: inferred). Expert must review before publish.",
  );
  job.stages = patchStage(job.stages, "diagnosis", {
    status: "done",
    finished_at: new Date().toISOString(),
  });
  job = await saveAudit(job);

  // --- Writing ---
  job.stages = patchStage(job.stages, "writing", {
    status: "done",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    log: [
      "Findings, exec summary, action plan and 4C chapter attached to draft report.",
    ],
  });
  job.stages = patchStage(job.stages, "expert_review", {
    status: "running",
    started_at: new Date().toISOString(),
    log: ["Draft ready for expert review. Inferred scores are not client-visible."],
  });
  job.status = "in_expert_review";
  return saveAudit(job);
}

function raiseFlag(job: AuditJob, failed: FlagRecord["failed_checks"]): FlagRecord {
  if (job.flag?.raised_once) {
    throw new Error("Flag-once rule: this audit was already flagged");
  }
  const draft = draftFlagWording(failed);
  return {
    raised_at: new Date().toISOString(),
    status: "pending_wording",
    raised_once: true,
    failed_checks: failed,
    wording: {
      ...draft,
      approved_at: null,
      approved_by: null,
    },
    client_notified: { dashboard: true, email_sent_at: null },
    client_response: null,
    resolution: null,
    reminders_sent: [],
  };
}

/** Run pipeline: GA4 → 4C 1–4 → (flag or continue) → independent → dependent. */
export async function runPipeline(
  auditId: string,
  baseUrl: string,
): Promise<AuditJob> {
  let job = await getAudit(auditId);
  if (!job) throw new Error("Audit not found");
  if (!job.intake) throw new Error("Complete intake before running the pipeline");
  const intake = job.intake;

  // Resume paths: already past research
  if (
    job.customer_view_status === "validated" ||
    job.customer_view_status === "expert_verified"
  ) {
    if (!job.draft_report) {
      job = await runIndependentStages(job, baseUrl);
      if (job.status === "failed") return job;
      return runDependentStages(job);
    }
    return job;
  }

  if (
    job.flag &&
    job.flag.status !== "resolved" &&
    job.fourc_research
  ) {
    // Mid-flag re-run: keep independent stages moving; do not raise again.
    job = await runIndependentStages(job, baseUrl);
    return job;
  }

  job.status = "running";
  job = await saveAudit(job);

  const recipients = parseRecipients(intake.report_recipients);
  const started = await sendAuditStartedEmail({
    auditId: job.audit_id,
    recipients,
    dashboardUrl: dashboardUrl(baseUrl, job.audit_id),
    eta: "about 2–4 days",
  });
  job.email_log = [...job.email_log, started];
  job = await saveAudit(job);

  // --- GA4 ---
  job.stages = patchStage(job.stages, "ga4_connect", {
    status: "running",
    started_at: new Date().toISOString(),
  });
  job = await saveAudit(job);

  if (!job.ga4) {
    if (ga4OAuthConfigured() && intake.ga4_status === "yes_connect") {
      job.ga4 = connectGa4Fixture(intake);
      job.stages = logStage(
        job.stages,
        "ga4_connect",
        "OAuth configured but no callback yet — using fixture for this run.",
      );
    } else {
      job.ga4 = connectGa4Fixture(intake);
      job.stages = logStage(
        job.stages,
        "ga4_connect",
        job.ga4.note ?? "GA4 fixture connected",
      );
    }
  }
  job.tier = resolveTier(job.ga4);
  job.stages = patchStage(job.stages, "ga4_connect", {
    status: "done",
    finished_at: new Date().toISOString(),
  });
  job = await saveAudit(job);

  // --- 4C Steps 1–4 + AI-mistake review + validation ---
  job.stages = patchStage(job.stages, "fourc_research", {
    status: "running",
    started_at: new Date().toISOString(),
  });
  job = await saveAudit(job);

  const { research, validated, validation } = runFourCResearch(intake);
  job.fourc_research = research;
  job.stages = logStage(
    job.stages,
    "fourc_research",
    validated
      ? "Steps 1–4 + AI-mistake review complete. Customer view validated."
      : "Steps 1–4 + AI-mistake review complete. Customer view not validated.",
  );
  job.stages = patchStage(job.stages, "fourc_research", {
    status: "done",
    finished_at: new Date().toISOString(),
  });
  job = await saveAudit(job);

  if (validated) {
    job.customer_view_status = "validated";
    job.customer_view_summary = intake.customer_opinion;
    job.stages = patchStage(job.stages, "fourc_flag", {
      status: "skipped",
      finished_at: new Date().toISOString(),
      log: ["No flag — customer view validated."],
    });
    job.stages = patchStage(job.stages, "fourc_verify", {
      status: "skipped",
      finished_at: new Date().toISOString(),
      log: ["No expert verification needed."],
    });
    job = await saveAudit(job);

    job = await runIndependentStages(job, baseUrl);
    if (job.status === "failed") return job;
    return runDependentStages(job);
  }

  // --- Not validated: flag once ---
  const { failed } = evaluateValidation(validation);

  job.flag = raiseFlag(job, failed);
  job.status = "flagged";
  job.stages = patchStage(job.stages, "fourc_flag", {
    status: "blocked",
    started_at: new Date().toISOString(),
    log: [
      "Flag raised (once). Waiting for expert to approve client-facing wording.",
    ],
  });
  job.stages = patchStage(job.stages, "fourc_verify", {
    status: "waiting",
    log: ["Will run after the client answers."],
  });
  job.stages = patchStage(job.stages, "fourc_synthesis", {
    status: "waiting",
    log: ["Waiting for your answer — Steps 5–6 need a confirmed customer view."],
  });
  job.stages = patchStage(job.stages, "diagnosis", {
    status: "waiting",
    log: ["Waiting for your answer"],
  });
  job.stages = patchStage(job.stages, "writing", {
    status: "waiting",
    log: ["Waiting for your answer"],
  });
  job = await saveAudit(job);

  // Independent stages continue during flag
  job = await runIndependentStages(job, baseUrl);
  return job;
}

/** Expert approves flag wording → email stub + client dashboard card goes live. */
export async function approveFlagWording(
  auditId: string,
  expertId: string,
  role: Role,
  baseUrl: string,
  wordingOverride?: {
    title?: string;
    what_is_flagged?: string[];
    questions?: Array<{ id: string; prompt: string }>;
  },
): Promise<AuditJob> {
  assertExpert(role, "Approve flag wording");
  let job = await getAudit(auditId);
  if (!job?.flag) throw new Error("No flag on this audit");
  if (job.flag.status !== "pending_wording") {
    throw new Error(`Flag is ${job.flag.status}, not pending_wording`);
  }
  if (!job.flag.wording) throw new Error("Flag missing draft wording");

  const wording = {
    ...job.flag.wording,
    title: wordingOverride?.title ?? job.flag.wording.title,
    what_is_flagged:
      wordingOverride?.what_is_flagged ?? job.flag.wording.what_is_flagged,
    questions: wordingOverride?.questions ?? job.flag.wording.questions,
    approved_at: new Date().toISOString(),
    approved_by: expertId,
  };

  job.flag = {
    ...job.flag,
    wording,
    status: "awaiting_client",
    client_notified: { dashboard: true, email_sent_at: null },
  };

  const recipients = parseRecipients(job.intake?.report_recipients ?? "");
  const email = await sendFlagRaisedEmail({
    auditId: job.audit_id,
    recipients,
    flag: job.flag,
    dashboardUrl: dashboardUrl(baseUrl, job.audit_id),
  });
  if (email) {
    job.flag.client_notified.email_sent_at = email.sent_at;
    job.email_log = [...job.email_log, email];
  }

  job.status = "awaiting_client";
  job.stages = patchStage(job.stages, "fourc_flag", {
    status: "blocked",
    log: [
      ...job.stages.find((s) => s.id === "fourc_flag")!.log,
      "Wording approved; email stub sent; client can answer on the dashboard.",
    ],
  });
  job.assigned_expert_id = expertId;
  return saveAudit(job);
}

/** Client responds on the dashboard (flag card). */
export async function submitFlagResponse(
  auditId: string,
  answers: Record<string, string>,
  opts?: { notes?: string; request_call?: boolean },
): Promise<AuditJob> {
  let job = await getAudit(auditId);
  if (!job?.flag) throw new Error("No flag on this audit");
  if (job.flag.status !== "awaiting_client") {
    throw new Error("Flag is not waiting for a client answer");
  }

  job.flag = {
    ...job.flag,
    status: "awaiting_expert",
    client_response: {
      at: new Date().toISOString(),
      answers,
      notes: opts?.notes,
      request_call: opts?.request_call ?? false,
    },
  };
  job.status = "awaiting_expert";
  job.stages = patchStage(job.stages, "fourc_flag", {
    status: "done",
    finished_at: new Date().toISOString(),
    log: [
      ...job.stages.find((s) => s.id === "fourc_flag")!.log,
      "Client answered. Expert verification queue.",
    ],
  });
  job.stages = patchStage(job.stages, "fourc_verify", {
    status: "running",
    started_at: new Date().toISOString(),
    log: ["Client response received — expert must confirm or revise."],
  });
  return saveAudit(job);
}

/**
 * Expert resolves flag (confirm or revise). Never raises a second flag.
 * Then runs Steps 5–6 + diagnosis + writing.
 */
export async function resolveFlag(
  auditId: string,
  expertId: string,
  role: Role,
  resolution: {
    kind: "confirmed" | "revised";
    customer_view_summary: string;
    note?: string;
  },
  baseUrl: string,
): Promise<AuditJob> {
  assertExpert(role, "Resolve flag");
  let job = await getAudit(auditId);
  if (!job?.flag) throw new Error("No flag on this audit");
  if (job.flag.status === "resolved") {
    throw new Error("Flag already resolved (flag-once — no second flag)");
  }
  if (
    job.flag.status !== "awaiting_expert" &&
    job.flag.status !== "awaiting_client"
  ) {
    // Allow resolve from awaiting_client if client never replies (brief §7.4).
    if (job.flag.status !== "pending_wording") {
      /* ok paths above */
    }
  }

  // Expert may decide from evidence alone if client never replied.
  if (job.flag.status === "pending_wording") {
    throw new Error("Approve wording and notify the client before resolving");
  }

  job.flag = {
    ...job.flag,
    status: "resolved",
    resolution: {
      at: new Date().toISOString(),
      by: expertId,
      kind: resolution.kind,
      customer_view_summary: resolution.customer_view_summary,
      note: resolution.note,
    },
  };
  job.customer_view_status = "expert_verified";
  job.customer_view_summary = resolution.customer_view_summary;
  job.assigned_expert_id = expertId;
  job.stages = patchStage(job.stages, "fourc_verify", {
    status: "done",
    finished_at: new Date().toISOString(),
    log: [
      `Expert ${resolution.kind} customer view. Flag closed — will not raise again.`,
    ],
  });
  if (job.stages.find((s) => s.id === "fourc_flag")?.status !== "done") {
    job.stages = patchStage(job.stages, "fourc_flag", {
      status: "done",
      finished_at: new Date().toISOString(),
      log: ["Closed by expert without further client reply."],
    });
  }

  const recipients = parseRecipients(job.intake?.report_recipients ?? "");
  const email = await sendFlagResolvedEmail({
    auditId: job.audit_id,
    recipients,
    dashboardUrl: dashboardUrl(baseUrl, job.audit_id),
  });
  job.email_log = [...job.email_log, email];
  job.status = "running";
  job = await saveAudit(job);

  // Ensure independent stages finished, then dependent.
  job = await runIndependentStages(job, baseUrl);
  if (job.status === "failed") return job;
  return runDependentStages(job);
}

/** Apply expert overrides; voids any prior sign-off. */
export async function applyOverrides(
  auditId: string,
  overrides: ExpertOverride[],
  role: Role,
): Promise<AuditJob> {
  assertExpert(role, "Override scores");
  let job = await getAudit(auditId);
  if (!job) throw new Error("Audit not found");
  if (!job.draft_report) throw new Error("No draft report");

  const report = structuredClone(job.draft_report) as ReportDocument;
  for (const o of overrides) {
    const page = report.pages[o.page_slug];
    if (!page) continue;
    page.secs = page.secs.map((sec) => {
      if (sec.id !== o.section_id) return sec;
      return {
        ...sec,
        comb: o.comb,
        combt: o.comb.C + o.comb.O + o.comb.M,
        comb_state: o.comb_state,
      };
    });
  }

  report.signoff = null;
  report.build = {
    ...report.build,
    sha: `${report.build.sha}-edited-${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
  };

  job.draft_report = report;
  job.overrides = [...job.overrides, ...overrides];
  job.signoff = null;
  job.status = "in_expert_review";
  job.stages = patchStage(job.stages, "signoff", {
    status: "waiting",
    log: ["Prior sign-off voided after edit."],
  });
  job.stages = patchStage(job.stages, "publish", { status: "waiting" });
  return saveAudit(job);
}

/** Promote all inferred scores to reviewed (bulk helper for demo). */
export async function markAllReviewed(
  auditId: string,
  expertId: string,
  role: Role,
): Promise<AuditJob> {
  assertExpert(role, "Review scores");
  const job = await getAudit(auditId);
  if (!job?.draft_report) throw new Error("No draft report");

  const overrides: ExpertOverride[] = [];
  const at = new Date().toISOString();
  for (const [slug, page] of Object.entries(job.draft_report.pages)) {
    for (const sec of page.secs) {
      if (sec.comb_state === "inferred") {
        overrides.push({
          page_slug: slug,
          section_id: sec.id,
          comb: sec.comb,
          comb_state: "reviewed",
          note: "Bulk reviewed in expert workspace",
          at,
          expert_id: expertId,
        });
      }
    }
  }
  return applyOverrides(auditId, overrides, role);
}

export async function signOffAudit(
  auditId: string,
  expertId: string,
  role: Role,
): Promise<AuditJob> {
  assertExpert(role, "Sign off");
  let job = await getAudit(auditId);
  if (!job?.draft_report) throw new Error("No draft report");

  const inferred = Object.entries(job.draft_report.pages).flatMap(([slug, page]) =>
    page.secs
      .filter((s) => s.comb_state === "inferred")
      .map((s) => `${slug}/${s.id}`),
  );
  if (inferred.length) {
    throw new Error(
      `Cannot sign off while inferred scores remain: ${inferred.join(", ")}`,
    );
  }

  const signoff: Signoff = {
    expert_id: expertId,
    at: new Date().toISOString(),
    build_sha: job.draft_report.build.sha,
    method_versions: {
      comb: "phase2-4c-0.1",
      fourc: "fixture-agent-0.1",
      capture: "playwright-1440-390",
      creative_score: job.creative_scores[0]?.mode ?? "fixture",
    },
    checklist: {
      all_pages_reviewed: true,
      fourc_reviewed: true,
      qa_green: true,
    },
  };

  const fourcChapter =
    job.fourc_research && job.fourc_research.steps_5_to_6.length
      ? fourCResearchToChapter(job.fourc_research, "reviewed")
      : { ...job.draft_report.fourc, review_state: "reviewed" as const };

  job.draft_report = {
    ...job.draft_report,
    signoff,
    fourc: fourcChapter,
  };
  job.signoff = signoff;
  job.assigned_expert_id = expertId;
  job.status = "signed_off";
  job.stages = patchStage(job.stages, "expert_review", {
    status: "done",
    finished_at: new Date().toISOString(),
  });
  job.stages = patchStage(job.stages, "signoff", {
    status: "done",
    finished_at: new Date().toISOString(),
    log: [`Signed off by ${expertId} on build ${signoff.build_sha}`],
  });
  return saveAudit(job);
}

/**
 * Publish with three-layer hard gate.
 * Nothing client-visible without sign-off; inferred scores never published.
 */
export async function publishAudit(
  auditId: string,
  role: Role,
): Promise<{ job: AuditJob; result: ReturnType<typeof publisherGate> }> {
  let job = await getAudit(auditId);
  if (!job) throw new Error("Audit not found");

  const wf = workflowPublishGate(job);
  job.publish_attempts = [
    ...job.publish_attempts,
    { at: new Date().toISOString(), ok: wf.ok, errors: wf.errors, layer: "workflow" },
  ];
  if (!wf.ok) {
    job = await saveAudit(job);
    return { job, result: wf };
  }

  const pub = publisherGate(job, role);
  job.publish_attempts = [
    ...job.publish_attempts,
    { at: new Date().toISOString(), ok: pub.ok, errors: pub.errors, layer: "publisher" },
  ];
  if (!pub.ok || !job.draft_report) {
    job = await saveAudit(job);
    return { job, result: pub };
  }

  const host = hostingGate(job.draft_report);
  job.publish_attempts = [
    ...job.publish_attempts,
    { at: new Date().toISOString(), ok: host.ok, errors: host.errors, layer: "hosting" },
  ];
  if (!host.ok) {
    job = await saveAudit(job);
    return { job, result: host };
  }

  await writePublishedReport(job.draft_report);
  job.published_report_id = job.draft_report.report_id;
  job.status = "published";
  job.stages = patchStage(job.stages, "publish", {
    status: "done",
    finished_at: new Date().toISOString(),
    log: [`Published ${job.published_report_id} (private, noindex)`],
  });
  job = await saveAudit(job);
  return {
    job,
    result: {
      ok: true,
      errors: [],
      layer: "publisher",
      report_id: job.published_report_id ?? undefined,
    },
  };
}
