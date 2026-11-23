import { expect, test } from "@playwright/test";
import { extractLocTags, extractNavHrefs } from "../src/lib/capture/sitemap";
import { isPaymentUrl } from "../src/lib/capture/payment-guard";
import { pageSlugFromUrl } from "../src/lib/capture/paths";

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "run once");
});

test.describe("sitemap + capture helpers", () => {
  test("extractLocTags reads urlset and index", () => {
    const xml = `<?xml version="1.0"?>
      <urlset>
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/rooms</loc></url>
        <url><loc>https://example.com/book/payment</loc></url>
      </urlset>`;
    const locs = extractLocTags(xml);
    expect(locs).toContain("https://example.com/");
    expect(locs).toContain("https://example.com/rooms");
  });

  test("extractNavHrefs prefers nav anchors", () => {
    const html = `
      <header><nav>
        <a href="/rooms">Rooms</a>
        <a href="mailto:x@y.com">Email</a>
        <a href="#top">Top</a>
      </nav></header>
      <a href="/footer-only">Footer</a>`;
    const hrefs = extractNavHrefs(html);
    expect(hrefs).toContain("/rooms");
    expect(hrefs).not.toContain("mailto:x@y.com");
    expect(hrefs).not.toContain("#top");
  });

  test("payment guard and page slug", () => {
    expect(isPaymentUrl("https://x.com/book/payment")).toBe(true);
    expect(isPaymentUrl("https://checkout.stripe.com/pay/cs_test")).toBe(true);
    expect(isPaymentUrl("https://x.com/rooms")).toBe(false);
    expect(pageSlugFromUrl("https://x.com/")).toBe("home");
    expect(pageSlugFromUrl("https://x.com/rooms/lagoon")).toBe("rooms__lagoon");
  });
});
