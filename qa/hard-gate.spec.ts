import { expect, test } from "@playwright/test";
import {
  hostingGate,
  publisherGate,
  workflowPublishGate,
} from "../src/lib/audit/publisher";
import type { AuditJob } from "../src/lib/audit/types";
import { emptyStages } from "../src/lib/audit/types";
import { buildDraftReport } from "../src/lib/diagnosis/build-draft-report";
import { assertClientPublishable } from "../src/lib/report/types";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "run once");
});

function baseJob(): AuditJob {
  const now = new Date().toISOString();
  return {
    audit_id: "aud_test_hard_gate",
    created_at: now,
    updated_at: now,
    status: "in_expert_review",
    tier: 1,
    intake: {
      business_name: "Gate Test Resort",
      website_url: "https://example.com",
      why_choose_from_website: false,
      why_choose: "Quiet lagoon",
      field_intel: "",
      website_goal: "buy",
      website_goal_other: "",
      buy_elsewhere: "OTA A and Resort B",
      cool_competitor_sites: "",
      wish_owned_sites: "",
      analytics_tool: "ga4",
      analytics_other_name: "",
      behaviour_tool: "no",
      behaviour_other_name: "",
      booking_provider: "",
      booking_engine_url: "/demo-site/book",
      booking_different_domain: "no",
      access_barriers: "",
    },
    ga4: {
      mode: "fixture",
      property_id: "properties/fixture",
      property_name: "Fixture",
      connected_at: now,
      has_refresh_token: false,
    },
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
    customer_view_summary: "Couples who need clarity",
    customer_view_status: "validated",
    email_log: [],
    publish_attempts: [],
  };
}

test.describe("Phase 1 hard gate", () => {
  test("unsigned draft fails workflow, publisher and hosting", () => {
    const job = baseJob();
    job.draft_report = buildDraftReport(job);

    const wf = workflowPublishGate(job);
    expect(wf.ok).toBe(false);
    expect(wf.errors.join(" ")).toMatch(/sign-off/i);

    const pub = publisherGate(job, "expert");
    expect(pub.ok).toBe(false);

    const host = hostingGate(job.draft_report);
    expect(host.ok).toBe(false);

    const inferred = assertClientPublishable(job.draft_report);
    expect(inferred.some((e) => e.includes("inferred"))).toBe(true);
  });

  test("operator cannot publish even when signed off", () => {
    const job = baseJob();
    job.draft_report = buildDraftReport(job);
    for (const page of Object.values(job.draft_report.pages)) {
      page.secs = page.secs.map((s) => ({ ...s, comb_state: "reviewed" as const }));
    }
    job.signoff = {
      expert_id: "expert_kavinda",
      at: new Date().toISOString(),
      build_sha: job.draft_report.build.sha,
      method_versions: { comb: "test" },
      checklist: {
        all_pages_reviewed: true,
        fourc_reviewed: true,
        qa_green: true,
      },
    };
    job.draft_report.signoff = job.signoff;
    job.status = "signed_off";

    const asOperator = publisherGate(job, "operator");
    expect(asOperator.ok).toBe(false);
    expect(asOperator.errors.join(" ")).toMatch(/expert/i);

    const asExpert = publisherGate(job, "expert");
    expect(asExpert.ok).toBe(true);
  });
});
