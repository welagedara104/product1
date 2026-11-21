import { expect, test } from "@playwright/test";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "run once");
});

const EXPERT_PASSWORD = process.env.EXPERT_ACCESS_PASSWORD || "phase1-expert";
const REPORT_PASSWORD = process.env.REPORT_ACCESS_PASSWORD || "phase0-fixture";

const baseIntake = {
  business_name: "Coral Reach Resort",
  website_url: "https://example.com",
  market: "UK and EU",
  what_you_sell: "Lagoon stays for couples",
  difference: "Clear evenings and totals",
  goal_o1: "direct_bookings",
  goal_detail: "Raise direct share",
  why_not_book: "Totals unclear; long checkout",
  competitors: "OTA A, Lagoon B",
  pages: "/demo-site\n/demo-site/book",
  devices: "both",
  report_recipients: "owner@example.com",
  consent: true,
  ga4_status: "yes_connect",
  capture_ok_to_payment: true,
};

test.describe("Phase 2 4C validated path", () => {
  test("4C validates → Steps 5–6 → dashboard → report has 4C chapter", async ({
    page,
  }) => {
    const api = page.request;

    const created = await api.post("/api/audits");
    const { audit_id } = await created.json();

    await api.post(`/api/audits/${audit_id}/intake`, {
      data: {
        ...baseIntake,
        customer_opinion:
          "Couples who need the stay to feel settled before they commit",
      },
    });
    await api.post(`/api/audits/${audit_id}/ga4`, { data: { mode: "fixture" } });

    const run = await api.post(`/api/audits/${audit_id}/run`);
    expect(run.ok()).toBeTruthy();
    const runBody = await run.json();
    expect(runBody.status).toBe("in_expert_review");
    expect(runBody.customer_view_status).toBe("validated");
    expect(runBody.flag_status).toBeNull();

    const jobRes = await api.get(`/api/audits/${audit_id}`);
    const job = await jobRes.json();
    expect(job.fourc_research.steps_1_to_4.length).toBeGreaterThanOrEqual(5);
    expect(job.fourc_research.review).toBeTruthy();
    expect(job.fourc_research.steps_5_to_6.length).toBe(2);
    expect(job.stages.find((s: { id: string }) => s.id === "capture").status).toBe(
      "done",
    );
    expect(
      job.stages.find((s: { id: string }) => s.id === "fourc_synthesis").status,
    ).toBe("done");
    expect(job.draft_report.chapters.some((c: { id: string }) => c.id === "fourc")).toBe(
      true,
    );

    const dash = await api.get(`/api/audits/${audit_id}/dashboard`);
    expect(dash.ok()).toBeTruthy();
    const dashBody = await dash.json();
    expect(dashBody.stages.length).toBeGreaterThan(5);
    expect(dashBody.flag).toBeNull();

    await page.goto(`/dashboard/${audit_id}`);
    await expect(page.getByTestId("dashboard-stages")).toBeVisible();
    await expect(page.getByText("Understanding your customer")).toBeVisible();

    await api.post("/api/expert/login", {
      data: { password: EXPERT_PASSWORD, expert_id: "expert_kavinda" },
    });
    await api.post(`/api/audits/${audit_id}/expert/review`);
    await api.post(`/api/audits/${audit_id}/expert/signoff`);
    const published = await api.post(`/api/audits/${audit_id}/expert/publish`);
    const pubBody = await published.json();
    expect(pubBody.report_id).toBeTruthy();

    await page.context().clearCookies();
    await page.request.post("/api/report-auth", {
      data: { reportId: pubBody.report_id, password: REPORT_PASSWORD },
    });
    await page.goto(`/report/${pubBody.report_id}`);
    await expect(page.getByTestId("fourc-venn")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("fourc-insight")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Your customer: the four Cs" }),
    ).toBeVisible();
  });
});

test.describe("Phase 2 flag-once path", () => {
  test("flag once → independent stages done → client answer → expert resolve → no second flag", async ({
    page,
  }) => {
    const api = page.request;

    const created = await api.post("/api/audits");
    const { audit_id } = await created.json();

    await api.post(`/api/audits/${audit_id}/intake`, {
      data: {
        ...baseIntake,
        customer_opinion:
          "FORCE_FLAG: first-visit couples only, ignore repeat guests",
      },
    });
    await api.post(`/api/audits/${audit_id}/ga4`, { data: { mode: "fixture" } });

    const run = await api.post(`/api/audits/${audit_id}/run`);
    expect(run.ok()).toBeTruthy();
    const runBody = await run.json();
    expect(["flagged", "awaiting_client"]).toContain(runBody.status);
    expect(runBody.flag_status).toBe("pending_wording");

    let job = await (await api.get(`/api/audits/${audit_id}`)).json();
    expect(job.flag.raised_once).toBe(true);
    expect(job.stages.find((s: { id: string }) => s.id === "capture").status).toBe(
      "done",
    );
    expect(
      job.stages.find((s: { id: string }) => s.id === "creative_score").status,
    ).toBe("done");
    expect(
      job.stages.find((s: { id: string }) => s.id === "analytics").status,
    ).toBe("done");
    expect(
      job.stages.find((s: { id: string }) => s.id === "diagnosis").status,
    ).toBe("waiting");
    expect(
      job.stages.find((s: { id: string }) => s.id === "fourc_synthesis").status,
    ).toBe("waiting");
    expect(job.draft_report).toBeNull();

    // Re-run must not raise a second flag; independent stages already done.
    const rerun = await api.post(`/api/audits/${audit_id}/run`);
    expect(rerun.ok()).toBeTruthy();
    job = await (await api.get(`/api/audits/${audit_id}`)).json();
    expect(job.flag.raised_once).toBe(true);
    expect(job.flag.status).toBe("pending_wording");

    await api.post("/api/expert/login", {
      data: { password: EXPERT_PASSWORD, expert_id: "expert_kavinda" },
    });
    const approved = await api.post(`/api/audits/${audit_id}/flag/approve`);
    expect(approved.ok()).toBeTruthy();
    const approvedBody = await approved.json();
    expect(approvedBody.flag_status).toBe("awaiting_client");
    expect(approvedBody.email_sent_at).toBeTruthy();

    await page.goto(`/dashboard/${audit_id}`);
    await expect(page.getByTestId("flag-card")).toBeVisible();
    await expect(page.getByTestId("needs-input-banner")).toBeVisible();
    await page.getByLabel(/Who do you believe books/).fill("Mostly repeat guests");
    await page.getByTestId("flag-send").click();
    await expect(page.getByTestId("flag-awaiting-expert")).toBeVisible({
      timeout: 10_000,
    });

    job = await (await api.get(`/api/audits/${audit_id}`)).json();
    expect(job.status).toBe("awaiting_expert");

    const resolved = await api.post(`/api/audits/${audit_id}/flag/resolve`, {
      data: {
        kind: "revised",
        customer_view_summary:
          "Repeat guests in shoulder season who want a settled direct path",
        note: "Revised from outside evidence + client reply",
      },
    });
    expect(resolved.ok()).toBeTruthy();
    const resolvedBody = await resolved.json();
    expect(resolvedBody.status).toBe("in_expert_review");
    expect(resolvedBody.customer_view_status).toBe("expert_verified");
    expect(resolvedBody.flag_status).toBe("resolved");
    expect(resolvedBody.draft_report_id).toBeTruthy();

    job = await (await api.get(`/api/audits/${audit_id}`)).json();
    expect(job.fourc_research.steps_5_to_6.length).toBe(2);
    expect(job.draft_report.customer_view.status).toBe("expert_verified");
    expect(job.draft_report.customer_view.flag.resolution).toBe("revised");

    // Attempting another raise via run must not create a new flag.
    await api.post(`/api/audits/${audit_id}/run`);
    job = await (await api.get(`/api/audits/${audit_id}`)).json();
    expect(job.flag.status).toBe("resolved");
    expect(job.flag.raised_once).toBe(true);

    await page.goto(`/dashboard/${audit_id}`);
    await expect(page.getByTestId("flag-history")).toBeVisible();
  });
});
