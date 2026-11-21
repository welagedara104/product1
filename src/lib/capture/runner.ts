import { chromium, type Browser } from "playwright";
import { promises as fs } from "fs";
import path from "path";
import type { CaptureFrame, IntakeAnswers } from "@/lib/audit/types";

const CAPTURE_ROOT = path.join(process.cwd(), ".data", "captures");

const VIEWPORTS = {
  d: { width: 1440, height: 900 },
  m: { width: 390, height: 844 },
} as const;

/**
 * Capture desktop 1440 + mobile 390.
 * Default: inline HTML (avoids deadlocking the Next server while /run is in-flight).
 * Optional: CAPTURE_TARGET=http to hit baseUrl/demo-site when a second server is up.
 * Always stops before payment — never loads or submits the payment step.
 */
export async function runCapture(opts: {
  auditId: string;
  intake: IntakeAnswers;
  baseUrl: string;
}): Promise<CaptureFrame[]> {
  const { auditId, intake, baseUrl } = opts;
  const outDir = path.join(CAPTURE_ROOT, auditId);
  await fs.mkdir(outDir, { recursive: true });

  const pageIds = parsePageIds(intake);
  const devices = devicesFor(intake.devices);
  const frames: CaptureFrame[] = [];
  const useHttp = process.env.CAPTURE_TARGET === "http";

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    for (const pageId of pageIds) {
      if (pageId === "payment") continue; // hard stop before payment
      for (const device of devices) {
        const viewport = VIEWPORTS[device];
        const context = await browser.newContext({
          viewport,
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();

        await page.route("**/*", async (route) => {
          const url = route.request().url().toLowerCase();
          const method = route.request().method();
          if (
            url.includes("/book/payment") ||
            url.includes("stripe.com") ||
            (method === "POST" && url.includes("payment"))
          ) {
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
          await page.setContent(demoHtml(pageId), { waitUntil: "domcontentloaded" });
        }

        const fileName = `${pageId}-${device}.png`;
        const filePath = path.join(outDir, fileName);
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

function devicesFor(mode: IntakeAnswers["devices"]): Array<"d" | "m"> {
  if (mode === "desktop") return ["d"];
  if (mode === "mobile") return ["m"];
  return ["d", "m"];
}

function parsePageIds(intake: IntakeAnswers): string[] {
  const lines = intake.pages
    .split(/[\n,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const ids = new Set<string>(["home"]);
  for (const line of lines) {
    if (line.includes("book")) ids.add("book");
    if (line.includes("payment") || line.includes("pay")) {
      // Explicitly ignore payment URLs in the page list.
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
