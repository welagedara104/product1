import { chromium, type Browser, type Page } from "playwright";
import { promises as fs } from "fs";
import path from "path";
import type { CaptureFrame } from "@/lib/audit/types";
import { shouldAbortCaptureRequest } from "@/lib/capture/payment-guard";
import {
  capturePageDir,
  desktopMirrorHint,
  pageSlugFromUrl,
  VIEWPORTS,
  type CaptureDevice,
} from "@/lib/capture/paths";

export type ScreenshotPageInput = {
  url: string;
  pageSlug?: string;
};

export type ScreenshotterResult = {
  frames: CaptureFrame[];
  notes: string[];
  mode: "url" | "demo-fallback";
};

/**
 * Walk pages one-by-one with Playwright.
 * Desktop 1440 + mobile 390; full-page + first-view; snip into viewport-height frames.
 * Never navigates to / submits payment endpoints (route abort + URL filter).
 */
export async function capturePagesWithPlaywright(opts: {
  auditId: string;
  clientName: string;
  pages: ScreenshotPageInput[];
  devices?: CaptureDevice[];
}): Promise<ScreenshotterResult> {
  const devices = opts.devices ?? (["d", "m"] as CaptureDevice[]);
  const notes: string[] = [];
  const frames: CaptureFrame[] = [];
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    for (let i = 0; i < opts.pages.length; i++) {
      const pageInput = opts.pages[i]!;
      const slug = pageInput.pageSlug ?? pageSlugFromUrl(pageInput.url, i);
      for (const device of devices) {
        const captured = await captureOnePage({
          browser,
          auditId: opts.auditId,
          clientName: opts.clientName,
          url: pageInput.url,
          pageSlug: slug,
          device,
        });
        frames.push(...captured.frames);
        notes.push(...captured.notes);
      }
    }
  } finally {
    await browser?.close();
  }

  return { frames, notes, mode: "url" };
}

async function captureOnePage(opts: {
  browser: Browser;
  auditId: string;
  clientName: string;
  url: string;
  pageSlug: string;
  device: CaptureDevice;
}): Promise<{ frames: CaptureFrame[]; notes: string[] }> {
  const { browser, auditId, clientName, url, pageSlug, device } = opts;
  const viewport = VIEWPORTS[device];
  const outDir = capturePageDir(auditId, pageSlug, device);
  await fs.mkdir(outDir, { recursive: true });

  const notes: string[] = [];
  const frames: CaptureFrame[] = [];
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

  // Soft-block in-page form submits that look like pay.
  await page.addInitScript(() => {
    document.addEventListener(
      "submit",
      (ev) => {
        const form = ev.target as HTMLFormElement | null;
        const action = (form?.getAttribute("action") || "").toLowerCase();
        const text = (form?.innerText || "").toLowerCase();
        if (
          action.includes("pay") ||
          action.includes("checkout") ||
          text.includes("pay now") ||
          text.includes("complete purchase")
        ) {
          ev.preventDefault();
          ev.stopPropagation();
        }
      },
      true,
    );
  });

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (shouldAbortCaptureRequest(page.url(), "GET") || page.url().includes("/payment")) {
      notes.push(`Aborted payment URL after navigation: ${page.url()}`);
      await page.goBack().catch(() => undefined);
    }

    await settlePage(page);

    const firstViewPath = path.join(outDir, "first-view.png");
    await page.screenshot({ path: firstViewPath, fullPage: false });

    // Dismiss common consent/cookie overlays for a cleaner second shot (best-effort).
    await dismissOverlays(page);
    await settlePage(page);

    const fullPagePath = path.join(outDir, "full-page.png");
    await page.screenshot({ path: fullPagePath, fullPage: true });

    const framePaths = await snipViewportFrames(page, outDir, viewport.height);
    const capturedAt = new Date().toISOString();
    const mirror = desktopMirrorHint(clientName, pageSlug, device);

    const meta = {
      page_id: pageSlug,
      url: page.url(),
      requested_url: url,
      device,
      viewport,
      captured_at: capturedAt,
      stopped_before_payment: true,
      files: {
        first_view: "first-view.png",
        full_page: "full-page.png",
        frames: framePaths.map((p) => path.basename(p)),
      },
      desktop_mirror_hint: mirror,
      user_agent: await page.evaluate(() => navigator.userAgent),
    };
    await fs.writeFile(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2));

    // Pipeline gets one CaptureFrame per page/device (first-view).
    // Viewport frames + full-page live on disk for Creative Score / operators.
    frames.push({
      page_id: pageSlug,
      url: page.url(),
      device,
      viewport,
      stopped_before_payment: true,
      path: path.relative(process.cwd(), firstViewPath),
      captured_at: capturedAt,
    });

    notes.push(
      `Captured ${pageSlug}/${device} → ${path.relative(process.cwd(), outDir)} (${framePaths.length} frames). Mirror: ${mirror}`,
    );
  } catch (e) {
    notes.push(
      `Capture failed for ${url} (${device}): ${e instanceof Error ? e.message : String(e)}`,
    );
    throw e;
  } finally {
    await context.close();
  }

  return { frames, notes };
}

async function settlePage(page: Page): Promise<void> {
  // Slow scroll to trigger lazy-load, then return to top.
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    const max = Math.max(
      document.body?.scrollHeight ?? 0,
      document.documentElement?.scrollHeight ?? 0,
    );
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(150);
}

async function dismissOverlays(page: Page): Promise<void> {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Agree")',
    'button:has-text("I agree")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
    '[aria-label="Close"]',
    'button[aria-label="Close"]',
  ];
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if (await loc.isVisible().catch(() => false)) {
      await loc.click({ timeout: 1000 }).catch(() => undefined);
    }
  }
}

/**
 * Snip the page into viewport-height frames by scrolling and screenshotting
 * each screenful — matches what a user sees, without an image-codec dependency.
 */
async function snipViewportFrames(
  page: Page,
  outDir: string,
  viewportHeight: number,
): Promise<string[]> {
  const totalHeight = await page.evaluate(() =>
    Math.max(
      document.body?.scrollHeight ?? 0,
      document.documentElement?.scrollHeight ?? 0,
      window.innerHeight,
    ),
  );
  const paths: string[] = [];
  const maxFrames = 40;
  let offset = 0;
  let index = 1;
  while (offset < totalHeight && index <= maxFrames) {
    await page.evaluate((y) => window.scrollTo(0, y), offset);
    await page.waitForTimeout(80);
    const fileName = `frame-${String(index).padStart(2, "0")}.png`;
    const filePath = path.join(outDir, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    paths.push(filePath);
    offset += viewportHeight;
    index += 1;
    // Stop when the last scroll didn't move (short pages / bottom).
    const y = await page.evaluate(() => window.scrollY);
    if (y + viewportHeight >= totalHeight - 2) {
      if (offset < totalHeight && index <= maxFrames) {
        // Capture final bottom-aligned frame once.
        await page.evaluate(() =>
          window.scrollTo(0, document.documentElement.scrollHeight),
        );
        await page.waitForTimeout(80);
        const lastName = `frame-${String(index).padStart(2, "0")}.png`;
        const lastPath = path.join(outDir, lastName);
        // Avoid duplicate identical bottom frame when already flush.
        if (y + viewportHeight < totalHeight - 2) {
          await page.screenshot({ path: lastPath, fullPage: false });
          paths.push(lastPath);
        }
      }
      break;
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  return paths;
}
