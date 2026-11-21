import { z } from "zod";
import {
  CombStateSchema,
  ReportDocumentSchema,
  SignoffSchema,
} from "@/lib/report/types";

/** Roles — only expert can sign off or publish (brief §19 / §20.4). */
export const RoleSchema = z.enum(["client", "expert", "operator", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

export const StageIdSchema = z.enum([
  "intake",
  "ga4_connect",
  "capture",
  "creative_score",
  "diagnosis",
  "writing",
  "expert_review",
  "signoff",
  "publish",
]);
export type StageId = z.infer<typeof StageIdSchema>;

export const StageStatusSchema = z.enum([
  "waiting",
  "running",
  "done",
  "failed",
  "blocked",
  "skipped",
]);
export type StageStatus = z.infer<typeof StageStatusSchema>;

export const AuditStatusSchema = z.enum([
  "intake",
  "ready_to_run",
  "running",
  "in_expert_review",
  "signed_off",
  "published",
  "failed",
]);
export type AuditStatus = z.infer<typeof AuditStatusSchema>;

export const TierSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type Tier = z.infer<typeof TierSchema>;

/** Minimal but real intake — required fields from brief §4, condensed for MVP. */
export const IntakeAnswersSchema = z.object({
  business_name: z.string().min(1),
  website_url: z.string().url(),
  market: z.string().min(1),
  what_you_sell: z.string().min(1),
  difference: z.string().min(1),
  goal_o1: z.enum([
    "direct_bookings",
    "enquiries",
    "sales",
    "sign_ups",
    "other",
  ]),
  goal_detail: z.string().min(1),
  customer_opinion: z.string().min(1),
  why_not_book: z.string().min(1),
  competitors: z.string().min(1),
  pages: z.string().min(1),
  devices: z.enum(["both", "desktop", "mobile"]).default("both"),
  report_recipients: z.string().min(1),
  consent: z.literal(true),
  ga4_status: z.enum([
    "yes_connect",
    "yes_colleague",
    "no",
    "not_sure",
  ]),
  booking_engine_url: z.string().optional(),
  capture_ok_to_payment: z.boolean().default(true),
});
export type IntakeAnswers = z.infer<typeof IntakeAnswersSchema>;

export const Ga4ConnectionSchema = z.object({
  mode: z.enum(["oauth", "fixture"]),
  property_id: z.string().nullable(),
  property_name: z.string().nullable(),
  connected_at: z.string().nullable(),
  /** Never store tokens in plain text in production; MVP fixture has none. */
  has_refresh_token: z.boolean().default(false),
  note: z.string().optional(),
});
export type Ga4Connection = z.infer<typeof Ga4ConnectionSchema>;

export const CaptureFrameSchema = z.object({
  page_id: z.string(),
  url: z.string(),
  device: z.enum(["d", "m"]),
  viewport: z.object({ width: z.number(), height: z.number() }),
  stopped_before_payment: z.boolean(),
  path: z.string(),
  captured_at: z.string(),
});
export type CaptureFrame = z.infer<typeof CaptureFrameSchema>;

export const CreativeScoreResultSchema = z.object({
  page_id: z.string(),
  device: z.enum(["d", "m"]),
  mode: z.enum(["live", "fixture"]),
  score: z.number(),
  label: z.string(),
  axes: z.array(z.number()),
  names: z.array(z.string()),
  todo: z.string().optional(),
});
export type CreativeScoreResult = z.infer<typeof CreativeScoreResultSchema>;

export const StageRecordSchema = z.object({
  id: StageIdSchema,
  status: StageStatusSchema,
  started_at: z.string().nullable().optional(),
  finished_at: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  log: z.array(z.string()).default([]),
});
export type StageRecord = z.infer<typeof StageRecordSchema>;

export const ExpertOverrideSchema = z.object({
  section_id: z.string(),
  page_slug: z.string(),
  comb: z.object({ C: z.number(), O: z.number(), M: z.number() }),
  comb_state: CombStateSchema,
  note: z.string().optional(),
  at: z.string(),
  expert_id: z.string(),
});
export type ExpertOverride = z.infer<typeof ExpertOverrideSchema>;

export const AuditJobSchema = z.object({
  audit_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  status: AuditStatusSchema,
  tier: TierSchema,
  intake: IntakeAnswersSchema.nullable(),
  ga4: Ga4ConnectionSchema.nullable(),
  stages: z.array(StageRecordSchema),
  captures: z.array(CaptureFrameSchema).default([]),
  creative_scores: z.array(CreativeScoreResultSchema).default([]),
  draft_report: ReportDocumentSchema.nullable(),
  published_report_id: z.string().nullable(),
  overrides: z.array(ExpertOverrideSchema).default([]),
  signoff: SignoffSchema.nullable(),
  assigned_expert_id: z.string().nullable(),
  publish_attempts: z
    .array(
      z.object({
        at: z.string(),
        ok: z.boolean(),
        errors: z.array(z.string()),
        layer: z.enum(["workflow", "publisher", "hosting"]),
      }),
    )
    .default([]),
});
export type AuditJob = z.infer<typeof AuditJobSchema>;

export const STAGE_ORDER: StageId[] = [
  "intake",
  "ga4_connect",
  "capture",
  "creative_score",
  "diagnosis",
  "writing",
  "expert_review",
  "signoff",
  "publish",
];

export function emptyStages(): StageRecord[] {
  return STAGE_ORDER.map((id) => ({
    id,
    status: id === "intake" ? "running" : "waiting",
    log: [],
  }));
}
