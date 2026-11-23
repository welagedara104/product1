import { chromium, type Browser } from "playwright";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CAPTURE_PAGES } from "@/lib/audit/intake-fields";
import type { CaptureFrame, IntakeAnswers } from "@/lib/audit/types";
import { shouldAbortCaptureRequest } from "@/lib/capture/payment-guard";
import {
  CAPTURE_ROOT,
  pageSlugFromUrl,
  VIEWPORTS,
  type CaptureDevice,
} from "@/lib/capture/paths";
import { discoverSitePages } from "@/lib/capture/sitemap";
import { capturePagesWithPlaywright } from "@/lib/capture/screenshotter";

/**
 * Capture orchestration.
 *
 * Prefer real URL capture when intake.website_url is reachable:
 *   1) discover pages via sitemap (+ nested) or nav crawl
 *   2) screenshot desktop 1440 + mobile 390 (full-page, first-view, frames)
 *
 * Fallback: previous demo behaviour (inline HTML, or CAPTURE_TARGET=http → /demo-site)
 * so the pipeline stays runnable when live capture fails.
 *
 * Always stops before payment — never loads or submits the payment step.
 *
 * Env:
 *   CAPTURE_MODE=auto|url|demo  (default auto)
 *   CAPTURE_TARGET=http         (demo path hits baseUrl/demo-site)
 *   CAPTURE_MAX_PAGES=N         (default 12 for pipeline runs)
 */
export async function runCapture(opts: {
  auditId: string;
  intake: IntakeAnswers;
  baseUrl: string;
}): Promise<CaptureFrame[]> {
  const mode = (process.env.CAPTURE_MODE || "auto").toLowerCase();
  const maxPages = Number(process.env.CAPTURE_MAX_PAGES || 12);

  if (mode !== "demo") {
    try {
      const frames = await runUrlCapture(opts, maxPages);
      if (frames.length) return frames;
    } catch (e) {
      if (mode === "url") throw e;
      // auto: fall through to demo
      console.warn(
        "[capture] URL capture failed; falling back to demo:",
        e instanceof Error ? e.message : e,
      );
    }
  }

  return runDemoCapture(opts);
}

async function runUrlCapture(
  opts: { auditId: string; intake: IntakeAnswers; baseUrl: string },
  maxPages: number,
): Promise<CaptureFrame[]> {
  const websiteUrl = opts.intake.website_url?.trim();
  if (!websiteUrl) {
    throw new Error("No website_url on intake");
  }

  // Placeholders / self-URLs would deadlock the Next server mid-/run — use demo path.
  if (isDemoPlaceholderUrl(websiteUrl, opts.baseUrl)) {
    throw new Error(
      "Placeholder or local website_url — use demo capture (set CAPTURE_TARGET=http for /demo-site)",
    );
  }

  const targetUrl = websiteUrl.startsWith("/")
    ? `${opts.baseUrl.replace(/\/$/, "")}${websiteUrl}`
    : websiteUrl;

  const discovered = await discoverSitePages(targetUrl, { maxPages });
  const pages = discovered.pages
    .filter((p) => !shouldAbortCaptureRequest(p.url, "GET"))
    .slice(0, maxPages)
    .map((p, i) => ({
      url: p.url,
      pageSlug: pageSlugFromUrl(p.url, i),
    }));

  if (!pages.length) {
    throw new Error(`No capturable pages discovered for ${targetUrl}`);
  }

  const result = await capturePagesWithPlaywright({
    auditId: opts.auditId,
    clientName: opts.intake.business_name || "Client",
    pages,
  });

  // Persist discovery notes next to captures for operators.
  const notePath = path.join(CAPTURE_ROOT, opts.auditId, "discovery.json");
  await fs.mkdir(path.dirname(notePath), { recursive: true });
  await fs.writeFile(
    notePath,
    JSON.stringify(
      {
        website_url: websiteUrl,
        target_url: targetUrl,
        discovered,
        capture_notes: result.notes,
        captured_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  return result.frames;
}

function isDemoPlaceholderUrl(websiteUrl: string, baseUrl: string): boolean {
  if (websiteUrl.startsWith("/demo-site") || websiteUrl.startsWith("/")) {
    return true;
  }
  try {
    const u = new URL(websiteUrl.includes("://") ? websiteUrl : `https://${websiteUrl}`);
    if (
      u.hostname === "example.com" ||
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1"
    ) {
      return true;
    }
    const base = new URL(baseUrl);
    if (u.origin === base.origin) return true;
  } catch {
    return true;
  }
  return false;
}

/**
 * Original demo capture path (inline HTML or /demo-site over HTTP).
 * Kept as reliable fallback when live URL capture fails.
 */
async function runDemoCapture(opts: {
  auditId: string;
  intake: IntakeAnswers;
  baseUrl: string;
}): Promise<CaptureFrame[]> {
  const { auditId, intake, baseUrl } = opts;
  const outDir = path.join(CAPTURE_ROOT, auditId, "_demo");
  await fs.mkdir(outDir, { recursive: true });

  const pageIds = parsePageIds(intake);
  const devices: CaptureDevice[] = ["d", "m"];
  const frames: CaptureFrame[] = [];
  const useHttp = process.env.CAPTURE_TARGET === "http";

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    for (const pageId of pageIds) {
      if (pageId === "payment") continue;
      for (const device of devices) {
        const viewport = VIEWPORTS[device];
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();

        await page.route("**/*", async (route) => {
          const req = route.request();
          if (shouldAbortCaptureRequest(req.url(), req.method())) {
            await route.abort();
            return;
          }
          await route.continue();
        });

        let targetLabel: string;
        if (useHttp) {
          const pathUrl =
            pageId === "book" ? "/demo-site/book" : "/demo-site";
          targetLabel = `${baseUrl.replace(/\/$/, "")}${pathUrl}`;
          await page.goto(targetLabel, {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
          });
          if (page.url().includes("/payment")) {
            await page.goBack().catch(() => undefined);
          }
        } else {
          targetLabel = `inline://${pageId}`;
          await page.setContent(demoHtml(pageId), {
            waitUntil: "domcontentloaded",
          });
        }

        const pageDir = path.join(outDir, pageId, device);
        await fs.mkdir(pageDir, { recursive: true });
        const filePath = path.join(pageDir, "full-page.png");
        await page.screenshot({ path: filePath, fullPage: true });
        await context.close();

        frames.push({
          page_id: pageId,
          url: targetLabel,
          device,
          viewport,
          stopped_before_payment: true,
          path: path.relative(process.cwd(), filePath),
          captured_at: new Date().toISOString(),
        });
      }
    }
  } finally {
    await browser?.close();
  }

  return frames;
}

function parsePageIds(_intake: IntakeAnswers): string[] {
  const lines = DEFAULT_CAPTURE_PAGES.split(/[\n,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const ids = new Set<string>(["home"]);
  for (const line of lines) {
    if (line.includes("book")) ids.add("book");
    if (line.includes("payment") || line.includes("pay")) {
      continue;
    }
  }
  if (lines.some((l) => l.includes("book")) || lines.length === 0) {
    ids.add("book");
  }
  return [...ids];
}

function demoHtml(pageId: string): string {
  if (pageId === "book") {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Book</title>
<style>body{font-family:system-ui;background:#f4efe6;color:#12212b;margin:0;padding:2rem}
.card{max-width:480px;background:#fff;border:1px solid #d5cbb8;padding:1.25rem}
.btn{display:inline-block;margin-top:1rem;background:#0b3a4a;color:#f4efe6;padding:.7rem 1.2rem;text-decoration:none}</style></head>
<body><p>CORAL REACH · BOOKING</p><h1>Your stay summary</h1>
<div class="card"><p><strong>Lagoon room</strong> · 3 nights</p>
<p>Total: £1,426 · Free cancelation until 7 days before</p>
<p>Guest details only — payment is the next screen (not captured).</p>
<a class="btn" href="/demo-site/book/payment">Continue</a>
<p style="font-size:12px;color:#6a5a48">Capture stops before Pay.</p></div></body></html>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>Home</title>
<style>body{margin:0;font-family:Georgia,serif;background:linear-gradient(180deg,#0b3a4a 0%,#14586a 42%,#f4efe6 42%);color:#12212b}
header,section.hero{color:#f4efe6;padding:2rem}h1{font-size:3rem;max-width:12ch;line-height:1.05}
.cta{display:inline-block;margin-top:1rem;background:#f4efe6;color:#0b3a4a;padding:.85rem 1.4rem;text-decoration:none;font-family:system-ui;font-weight:600}
.lower{padding:2rem;background:#f4efe6}</style></head>
<body><header>CORAL REACH RESORT</header>
<section class="hero"><h1>Evenings on a quiet lagoon</h1>
<p>A small resort for couples who want the stay to feel settled before they pay.</p>
<a class="cta" href="/demo-site/book">Check dates</a></section>
<section class="lower"><h2>Why guests choose us</h2>
<ul><li>Private lagoon rooms</li><li>Totals shown before payment</li><li>Direct perks next to the rate</li></ul>
</section></body></html>`;
}
