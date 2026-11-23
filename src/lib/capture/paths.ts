import path from "path";

/**
 * Capture storage layout
 * ----------------------
 * Canonical on-disk root (gitignored):
 *   `.data/captures/{auditId}/{pageSlug}/{device}/`
 *     first-view.png
 *     full-page.png
 *     frame-01.png … frame-NN.png
 *     meta.json
 *
 * Operator desktop mirror (document only — not written by the pipeline):
 *   Desktop/{ClientName}/Screenshots/{pageSlug}/
 *     d/ …   (desktop 1440)
 *     m/ …   (mobile 390)
 *
 * Copy or rsync from `.data/captures/{auditId}/` into the desktop tree when
 * handing artefacts to an operator. Keep pageSlug stable (see pageSlugFromUrl).
 */

export const CAPTURE_ROOT = path.join(process.cwd(), ".data", "captures");

export const VIEWPORTS = {
  d: { width: 1440, height: 900 },
  m: { width: 390, height: 844 },
} as const;

export type CaptureDevice = keyof typeof VIEWPORTS;

export function pageSlugFromUrl(pageUrl: string, index?: number): string {
  try {
    const u = new URL(pageUrl);
    let slug = u.pathname.replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
    if (!slug) slug = "home";
    slug = slug
      .replace(/\//g, "__")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    if (!slug) slug = "page";
    if (typeof index === "number") return `${String(index + 1).padStart(2, "0")}-${slug}`;
    return slug;
  } catch {
    return typeof index === "number" ? `page-${index + 1}` : "page";
  }
}

export function capturePageDir(
  auditId: string,
  pageSlug: string,
  device: CaptureDevice,
): string {
  return path.join(CAPTURE_ROOT, auditId, pageSlug, device);
}

/** Human-readable mirror path for docs / meta.json (not created automatically). */
export function desktopMirrorHint(
  clientName: string,
  pageSlug: string,
  device: CaptureDevice,
): string {
  const safeClient =
    clientName.trim().replace(/[^\w\s.-]+/g, "").replace(/\s+/g, "-") || "Client";
  return path.join("Desktop", safeClient, "Screenshots", pageSlug, device);
}
