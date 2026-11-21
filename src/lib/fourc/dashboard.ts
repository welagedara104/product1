import type { AuditJob, StageId, StageRecord, StageStatus } from "@/lib/audit/types";

/** Client-facing dashboard stages (brief §6.2), mapped to internal stages. */
export type DashboardStageView = {
  id: string;
  name: string;
  internal: StageId | null;
  /** Hide until relevant (flag-only stages). */
  visible: boolean;
  status_label: string;
  status: StageStatus | "needs_input" | "flagged" | "paused_expert";
  eta: string;
  activity: string | null;
};

const ETA: Record<string, string> = {
  intake: "seconds",
  ga4_connect: "minutes",
  fourc_research: "about 2–6 hours",
  fourc_flag: "waiting on you",
  fourc_verify: "expert SLA (hours)",
  fourc_synthesis: "about 1–3 hours",
  capture: "about 1–4 hours",
  creative_score: "about 1–3 hours",
  analytics: "minutes–hours",
  diagnosis: "about 4–12 hours",
  writing: "about 2–6 hours",
  expert_review: "expert SLA (1–2 days)",
  signoff: "with expert review",
  publish: "minutes after sign-off",
};

function stageOf(job: AuditJob, id: StageId): StageRecord | undefined {
  return job.stages.find((s) => s.id === id);
}

function chip(
  job: AuditJob,
  internal: StageId | null,
  opts?: { flagOnly?: boolean },
): {
  status: DashboardStageView["status"];
  status_label: string;
  activity: string | null;
} {
  if (!internal) {
    return { status: "waiting", status_label: "Waiting", activity: null };
  }
  const s = stageOf(job, internal);
  if (!s) {
    return { status: "waiting", status_label: "Waiting", activity: null };
  }

  const flag = job.flag;
  const dependentBlocked =
    Boolean(flag && flag.status !== "resolved") &&
    (internal === "diagnosis" ||
      internal === "writing" ||
      internal === "fourc_synthesis");

  if (opts?.flagOnly && internal === "fourc_flag") {
    if (!flag) {
      return { status: "skipped", status_label: "Skipped", activity: null };
    }
    if (flag.status === "awaiting_client" || flag.status === "pending_wording") {
      return {
        status: "flagged",
        status_label: "Flagged: we need your view",
        activity: "Answer the card at the top of this page",
      };
    }
    if (flag.status === "awaiting_expert") {
      return {
        status: "paused_expert",
        status_label: "Paused for expert check",
        activity: "Thanks — an expert is reviewing your answer",
      };
    }
    return {
      status: "done",
      status_label: "Done",
      activity: flag.resolution
        ? `Customer view verified on ${flag.resolution.at.slice(0, 10)}`
        : null,
    };
  }

  if (opts?.flagOnly && internal === "fourc_verify") {
    if (!flag) {
      return { status: "skipped", status_label: "Skipped", activity: null };
    }
    if (flag.status === "awaiting_expert") {
      return {
        status: "paused_expert",
        status_label: "Paused for expert check",
        activity: "Expert verification queue",
      };
    }
    if (flag.status === "resolved") {
      return { status: "done", status_label: "Done", activity: null };
    }
    return {
      status: "waiting",
      status_label: "Waiting for your answer",
      activity: null,
    };
  }

  if (dependentBlocked && s.status === "waiting") {
    return {
      status: "needs_input",
      status_label: "Waiting for your answer",
      activity: "Paused until the customer view is confirmed",
    };
  }

  if (s.status === "running") {
    return {
      status: "running",
      status_label: "Running",
      activity: s.log[s.log.length - 1] ?? "In progress",
    };
  }
  if (s.status === "done") {
    return {
      status: "done",
      status_label: "Done",
      activity: s.log[s.log.length - 1] ?? null,
    };
  }
  if (s.status === "failed") {
    return {
      status: "failed",
      status_label: "Failed (we're on it)",
      activity: s.error ?? null,
    };
  }
  if (s.status === "blocked") {
    return {
      status: "needs_input",
      status_label: "Needs your input",
      activity: s.log[s.log.length - 1] ?? null,
    };
  }
  if (s.status === "skipped") {
    return { status: "skipped", status_label: "Skipped", activity: null };
  }
  if (internal === "expert_review" && job.status === "in_expert_review") {
    return {
      status: "running",
      status_label: "Expert review",
      activity: "A Cranial expert checks every score before you see the report",
    };
  }
  return { status: "waiting", status_label: "Waiting", activity: null };
}

export function buildDashboard(job: AuditJob): {
  overall_eta: string;
  current_activity: string;
  what_happens_next: string;
  needs_input: boolean;
  stages: DashboardStageView[];
} {
  const flagOpen = Boolean(job.flag && job.flag.status !== "resolved");
  const flagVisible = Boolean(job.flag);

  const defs: Array<{
    id: string;
    name: string;
    internal: StageId | null;
    flagOnly?: boolean;
  }> = [
    { id: "1", name: "Reading your answers", internal: "intake" },
    { id: "2", name: "Checking your data connections", internal: "ga4_connect" },
    {
      id: "3",
      name: "Understanding your customer (4C)",
      internal: "fourc_research",
    },
    {
      id: "3b",
      name: "We need your view",
      internal: "fourc_flag",
      flagOnly: true,
    },
    {
      id: "3c",
      name: "Expert check of your customer view",
      internal: "fourc_verify",
      flagOnly: true,
    },
    {
      id: "3d",
      name: "Your customer in one picture (4C)",
      internal: "fourc_synthesis",
    },
    { id: "5", name: "Capturing your site (desktop and mobile)", internal: "capture" },
    { id: "6", name: "Scoring attention and creative", internal: "creative_score" },
    { id: "7", name: "Reading your analytics", internal: "analytics" },
    { id: "9", name: "Diagnosing each page", internal: "diagnosis" },
    { id: "10", name: "Writing recommendations", internal: "writing" },
    { id: "13", name: "Expert review and sign-off", internal: "expert_review" },
    { id: "14", name: "Ready", internal: "publish" },
  ];

  const stages: DashboardStageView[] = defs.map((d) => {
    const c = chip(job, d.internal, { flagOnly: d.flagOnly });
    const visible = d.flagOnly ? flagVisible : true;
    return {
      id: d.id,
      name: d.name,
      internal: d.internal,
      visible,
      status_label: c.status_label,
      status: c.status,
      eta: d.internal ? ETA[d.internal] ?? "—" : "—",
      activity: c.activity,
    };
  });

  const running = stages.find((s) => s.visible && s.status === "running");
  const needs = stages.find(
    (s) =>
      s.visible &&
      (s.status === "needs_input" || s.status === "flagged"),
  );

  let current_activity = "Waiting to start";
  if (job.status === "published") {
    current_activity = "Your report is ready";
  } else if (needs) {
    current_activity = needs.activity ?? needs.status_label;
  } else if (running) {
    current_activity = running.activity ?? `${running.name} in progress`;
  } else if (job.status === "in_expert_review") {
    current_activity = "A Cranial expert is reviewing every score";
  }

  let what_happens_next = "We will email you when the report is ready.";
  if (flagOpen && job.flag?.status === "awaiting_client") {
    what_happens_next =
      "Answer the card at the top. Capture and scoring keep running meanwhile.";
  } else if (flagOpen && job.flag?.status === "awaiting_expert") {
    what_happens_next =
      "An expert is confirming your customer view. Diagnosis waits; capture keeps going.";
  } else if (flagOpen && job.flag?.status === "pending_wording") {
    what_happens_next =
      "A Cranial expert is preparing the question for you. Capture keeps running.";
  } else if (job.status === "in_expert_review") {
    what_happens_next =
      "After expert sign-off you will get a private report link by email.";
  } else if (job.status === "published") {
    what_happens_next = "Open your private report when you are ready.";
  }

  const pageHint = job.intake?.pages
    ? job.intake.pages.split(/\n/).filter(Boolean).length
    : 2;

  return {
    overall_eta: `about 2–4 days (${pageHint} pages × 2 devices in this run)`,
    current_activity,
    what_happens_next,
    needs_input: Boolean(needs),
    stages: stages.filter((s) => s.visible),
  };
}
