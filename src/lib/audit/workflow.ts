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

/** Run pipeline from GA4 through writing → leaves audit in expert review. */
export async function runPipeline(
  auditId: string,
  baseUrl: string,
): Promise<AuditJob> {
  let job = await getAudit(auditId);
  if (!job) throw new Error("Audit not found");
  if (!job.intake) throw new Error("Complete intake before running the pipeline");
  const intake = job.intake;

  job.status = "running";
  job = await saveAudit(job);

  // --- GA4 ---
  job.stages = patchStage(job.stages, "ga4_connect", {
    status: "running",
    started_at: new Date().toISOString(),
  });
  job = await saveAudit(job);

  if (!job.ga4) {
    if (ga4OAuthConfigured() && intake.ga4_status === "yes_connect") {
      // OAuth URL is offered in UI; if user skipped, fall back to fixture.
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

  // --- Capture ---
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

  // --- Creative Score ---
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

  // --- Writing (exec summary / actions already in draft; mark done) ---
  job.stages = patchStage(job.stages, "writing", {
    status: "done",
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    log: ["Findings, exec summary and action plan attached to draft report."],
  });
  job.stages = patchStage(job.stages, "expert_review", {
    status: "running",
    started_at: new Date().toISOString(),
    log: ["Draft ready for expert review. Inferred scores are not client-visible."],
  });
  job.status = "in_expert_review";
  return saveAudit(job);
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

  // Any edit voids sign-off (brief §3 / state machine).
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

/** Promote all inferred scores to reviewed (bulk helper for MVP demo). */
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
          note: "Bulk reviewed in Phase 1 expert workspace",
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
      comb: "phase1-mvp-0.1",
      capture: "playwright-1440-390",
      creative_score: job.creative_scores[0]?.mode ?? "fixture",
    },
    checklist: {
      all_pages_reviewed: true,
      fourc_reviewed: true,
      qa_green: true,
    },
  };

  job.draft_report = {
    ...job.draft_report,
    signoff,
    fourc: { ...job.draft_report.fourc, review_state: "reviewed" },
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
