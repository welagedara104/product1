import { expect, test } from "@playwright/test";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "run once");
});

const EXPERT_PASSWORD = process.env.EXPERT_ACCESS_PASSWORD || "phase1-expert";
const REPORT_PASSWORD = process.env.REPORT_ACCESS_PASSWORD || "phase0-fixture";

test.describe("Phase 1 tier-1 expert loop", () => {
  test("intake → fixture GA4 → run → review → sign-off → private publish", async ({
    page,
  }) => {
    // Use page.request so auth cookies are shared with the browser context.
    const api = page.request;

    // 1. Create audit
    const created = await api.post("/api/audits");
    expect(created.ok()).toBeTruthy();
    const { audit_id } = await created.json();
    expect(audit_id).toMatch(/^aud_/);

    // 2. Intake
    const intake = await api.post(`/api/audits/${audit_id}/intake`, {
      data: {
        business_name: "Coral Reach Resort",
        website_url: "https://example.com",
        market: "UK and EU",
        what_you_sell: "Lagoon stays for couples",
        difference: "Clear evenings and totals",
        goal_o1: "direct_bookings",
        goal_detail: "Raise direct share",
        customer_opinion: "Couples who need the stay to feel settled",
        why_not_book: "Totals unclear; long checkout",
        competitors: "OTA A, Lagoon B",
        pages: "/demo-site\n/demo-site/book",
        devices: "both",
        report_recipients: "owner@example.com",
        consent: true,
        ga4_status: "yes_connect",
        capture_ok_to_payment: true,
      },
    });
    expect(intake.ok()).toBeTruthy();

    // 3. GA4 fixture
    const ga4 = await api.post(`/api/audits/${audit_id}/ga4`, {
      data: { mode: "fixture" },
    });
    expect(ga4.ok()).toBeTruthy();
    const ga4Body = await ga4.json();
    expect(ga4Body.tier).toBe(1);

    // 4. Run pipeline
    const run = await api.post(`/api/audits/${audit_id}/run`);
    expect(run.ok()).toBeTruthy();
    const runBody = await run.json();
    expect(runBody.status).toBe("in_expert_review");
    expect(runBody.captures).toBeGreaterThan(0);

    // 5. Publish without sign-off must fail
    await api.post("/api/expert/login", {
      data: { password: EXPERT_PASSWORD, expert_id: "expert_kavinda" },
    });
    const blocked = await api.post(`/api/audits/${audit_id}/expert/publish`);
    expect(blocked.status()).toBe(403);

    // 6. Review + sign-off + publish
    const reviewed = await api.post(`/api/audits/${audit_id}/expert/review`);
    expect(reviewed.ok()).toBeTruthy();
    const signed = await api.post(`/api/audits/${audit_id}/expert/signoff`);
    expect(signed.ok()).toBeTruthy();
    const published = await api.post(`/api/audits/${audit_id}/expert/publish`);
    expect(published.ok()).toBeTruthy();
    const pubBody = await published.json();
    expect(pubBody.report_id).toBeTruthy();

    // 7. Confirm client report is password gated, then unlock and view.
    // Clear expert cookie noise by using a fresh path — report auth is separate.
    await page.context().clearCookies();
    await page.goto(`/report/${pubBody.report_id}`);
    await expect(page).toHaveURL(new RegExp(`/report/${pubBody.report_id}/login`));

    const auth = await page.request.post("/api/report-auth", {
      data: { reportId: pubBody.report_id, password: REPORT_PASSWORD },
    });
    expect(auth.ok()).toBeTruthy();
    await page.goto(`/report/${pubBody.report_id}`);
    await expect(page.getByTestId("report-root")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Coral Reach Resort").first()).toBeVisible();
  });
});
