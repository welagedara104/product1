import { promises as fs } from "fs";
import path from "path";
import type { ConnectorUpload, UploadKind } from "@/lib/connectors/types";

const UPLOAD_ROOT = path.join(process.cwd(), ".data", "uploads");

/**
 * Upload fallback when OAuth / API keys are unavailable.
 * Stores file bytes under `.data/uploads/{auditId}/` and returns metadata only.
 * Never used for passwords — reject suspicious filenames.
 */
export async function saveConnectorUpload(opts: {
  auditId: string;
  kind: UploadKind;
  originalName: string;
  bytes: Buffer;
  note?: string;
}): Promise<ConnectorUpload> {
  assertSafeUploadName(opts.originalName);
  const dir = path.join(UPLOAD_ROOT, opts.auditId);
  await fs.mkdir(dir, { recursive: true });
  const id = `upl_${Date.now().toString(36)}`;
  const safe = opts.originalName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const rel = path.join(".data", "uploads", opts.auditId, `${id}-${safe}`);
  const abs = path.join(process.cwd(), rel);
  await fs.writeFile(abs, opts.bytes);
  return {
    id,
    kind: opts.kind,
    path: rel,
    original_name: opts.originalName,
    uploaded_at: new Date().toISOString(),
    note:
      opts.note ??
      "Client export upload (fallback when OAuth/API is unavailable). Not a password.",
  };
}

export function listUploadKindsForGap(gap: "ga4" | "behaviour"): UploadKind[] {
  if (gap === "ga4") return ["ga4_export"];
  return ["behaviour_heatmap", "behaviour_funnel", "behaviour_csv"];
}

function assertSafeUploadName(name: string): void {
  const lower = name.toLowerCase();
  if (
    lower.includes("password") ||
    lower.includes("passwd") ||
    lower.endsWith(".pem") ||
    lower.endsWith(".key")
  ) {
    throw new Error(
      "Refusing password-like or key material uploads. Use OAuth or a client-created read-only key.",
    );
  }
}
