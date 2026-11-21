import { expect, test, type Page } from "@playwright/test";

const REPORT_ID = "rpt_fixture_lagoon_anon_001";
const PASSWORD = process.env.REPORT_ACCESS_PASSWORD || "phase0-fixture";

async function unlock(page: Page) {
  const res = await page.request.post("/api/report-auth", {
    data: { reportId: REPORT_ID, password: PASSWORD },
  });
  expect(res.ok()).toBeTruthy();
  await page.goto(`/report/${REPORT_ID}`);
  await expect(page.getByTestId("report-root")).toBeVisible({ timeout: 15_000 });
}

test.describe("Phase 0 report QA", () => {
  test("private gate redirects unauthenticated viewers to login", async ({
    page,
  }) => {
    await page.goto(`/report/${REPORT_ID}`);
    await expect(page).toHaveURL(new RegExp(`/report/${REPORT_ID}/login`));
    await expect(page.getByTestId("report-login")).toBeVisible();
  });

  test("renders fixture report with interactive page audit", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(String(err)));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await unlock(page);

    const home = page.getByTestId("page-audit-home");
    await expect(page.getByTestId("chapter-cover")).toBeVisible();
    await expect(page.getByTestId("fourc-venn")).toBeVisible();
    await home.scrollIntoViewIfNeeded();
    await expect(home).toBeVisible();

    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement || document.documentElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow).toBe(0);

    const marker = home.getByTestId("marker-home-d1");
    await expect(marker).toBeVisible();
    await marker.click();
    await expect(home.getByTestId("finding-card-home-d1")).toBeVisible();
    await home.getByTestId("close-finding").click();
    await expect(home.getByTestId("finding-card-home-d1")).toHaveCount(0);

    await home.getByTestId("section-tab-home-d-top-video").click();
    await expect(home.getByTestId("section-card-home-d-top-video")).toBeVisible();
    await expect(home.getByTestId("section-radar")).toBeVisible();
    await home.getByRole("button", { name: "Close" }).click();

    await home.getByTestId("toggle-motivation").click();
    await expect(home.getByTestId("marker-home-d2")).toHaveCount(0);
    await home.getByTestId("toggle-motivation").click();
    await expect(home.getByTestId("marker-home-d2")).toBeVisible();

    await expect(home.getByTestId("toggle-heat")).toBeEnabled();

    await expect(home.getByTestId("whole-page-button")).toBeVisible();
    await home.getByTestId("whole-page-button").click();
    await expect(home.getByTestId("finding-card-home-d4")).toBeVisible();
    await home.getByTestId("close-finding").click();

    await home.getByTestId("open-page-summary").click();
    await expect(page.getByTestId("page-summary")).toBeVisible();
    await expect(page.getByTestId("summary-radar")).toBeVisible();
    await page.getByRole("button", { name: "Back to this page" }).click();

    await home.getByTestId("device-mobile").click();
    await expect(home).toHaveAttribute("data-device", "m");
    await expect(home.getByTestId("finding-list-Friction")).toBeVisible();
    await expect(home.getByTestId("finding-list-Motivation")).toBeVisible();

    const fontSize = await home
      .locator('[data-testid="finding-list-Friction"] button')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(13);

    await home.getByTestId("marker-home-m1").click();
    await home.getByTestId("close-finding").click();
    await home.getByTestId("reset-viewed").click();

    const res = await page.goto(`/report/${REPORT_ID}`);
    expect(res?.headers()["x-robots-tag"] || "").toMatch(/noindex/i);

    expect(errors, `console/page errors: ${errors.join(" | ")}`).toEqual([]);
  });

  test("markers stay inside the mockup strip and open cards", async ({ page }) => {
    await unlock(page);
    const home = page.getByTestId("page-audit-home");
    await home.scrollIntoViewIfNeeded();
    const strip = home.getByTestId("mockup-strip");
    await expect(strip).toBeVisible();
    const stripBox = await strip.boundingBox();
    expect(stripBox).toBeTruthy();

    const markers = home.locator('[data-testid^="marker-home-"]');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const marker = markers.nth(i);
      await marker.scrollIntoViewIfNeeded();
      const box = await marker.boundingBox();
      expect(box).toBeTruthy();
      if (!box || !stripBox) continue;
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      expect(cx).toBeGreaterThanOrEqual(stripBox.x - 2);
      expect(cx).toBeLessThanOrEqual(stripBox.x + stripBox.width + 2);
      expect(cy).toBeGreaterThanOrEqual(stripBox.y - 2);
      expect(cy).toBeLessThanOrEqual(stripBox.y + stripBox.height + 2);

      await marker.click();
      await expect(home.locator('[data-testid^="finding-card-"]')).toBeVisible();
      await home.getByTestId("close-finding").click();
    }
  });
});
