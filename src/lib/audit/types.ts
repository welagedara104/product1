import { z } from "zod";
import {
  CombStateSchema,
  ReportDocumentSchema,
  SignoffSchema,
} from "@/lib/report/types";
import {
  EmailStubSchema,
  FlagRecordSchema,
  FourCResearchSchema,
} from "@/lib/fourc/types";

/** Roles — only expert can sign off or publish (brief §19 / §20.4). */
export const RoleSchema = z.enum(["client", "expert", "operator", "admin"]);
export type Role = z.infer<typeof RoleSchema>;

export const StageIdSchema = z.enum([
  "intake",
  "ga4_connect",
  "fourc_research",
  "fourc_flag",
  "fourc_verify",
  "fourc_synthesis",
  "capture",
  "creative_score",
  "analytics",
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
  "flagged",
  "awaiting_client",
  "awaiting_expert",
  "in_expert_review",
  "signed_off",
  "published",
  "failed",
]);
export type AuditStatus = z.infer<typeof AuditStatusSchema>;

export const TierSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type Tier = z.infer<typeof TierSchema>;

/**
 * Locked intake (Kavinda walkthrough): 13 questions in 4 sections.
 * Cranial team fills on behalf of the client — no consent / recipients.
 */
export const IntakeAnswersSchema = z
  .object({
    business_name: z.string().min(1),
    website_url: z.string().url(),
    /** Why customers choose you — replaces old “difference” field. */
    why_choose_from_website: z.boolean(),
    why_choose: z.string().default(""),
    field_intel: z.string().default(""),
    website_goal: z.enum(["buy", "inquire", "other"]),
    website_goal_other: z.string().default(""),
    buy_elsewhere: z.string().min(1),
    cool_competitor_sites: z.string().default(""),
    wish_owned_sites: z.string().default(""),
    analytics_tool: z.enum(["ga4", "other", "none"]),
    analytics_other_name: z.string().default(""),
    behaviour_tool: z.enum(["contentsquare", "other", "no"]),
    behaviour_other_name: z.string().default(""),
    booking_provider: z.string().default(""),
    booking_engine_url: z.string().default(""),
    booking_different_domain: z.enum(["yes", "no", "not_sure"]).default("not_sure"),
    access_barriers: z.string().default(""),
  })
  .superRefine((data, ctx) => {
    if (!data.why_choose_from_website && !data.why_choose.trim()) {
      ctx.addIssue({
        code: "custom",
        message:
          "Say why customers choose them, or tick that the website already gives it",
        path: ["why_choose"],
      });
    }
    if (data.website_goal === "other" && !data.website_goal_other.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Say what the website should mainly do",
        path: ["website_goal_other"],
      });
    }
    if (data.analytics_tool === "other" && !data.analytics_other_name.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Name the analytics provider",
        path: ["analytics_other_name"],
      });
    }
    if (data.behaviour_tool === "other" && !data.behaviour_other_name.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Name the behaviour tool",
        path: ["behaviour_other_name"],
      });
    }
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
  /** Full 4C research artefact (Phase 2). */
  fourc_research: FourCResearchSchema.nullable().default(null),
  /** Flag-once record; null until first (and only) raise. */
  flag: FlagRecordSchema.nullable().default(null),
  /** Confirmed customer view used by Steps 5–6 and diagnosis. */
  customer_view_summary: z.string().nullable().default(null),
  customer_view_status: z
    .enum(["pending", "validated", "expert_verified"])
    .default("pending"),
  email_log: z.array(EmailStubSchema).default([]),
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

/**
 * Pipeline order for stage records.
 * Independent during flag: capture, creative_score, analytics.
 * Dependent (wait on flag): fourc_synthesis, diagnosis, writing.
 */
export const STAGE_ORDER: StageId[] = [
  "intake",
  "ga4_connect",
  "fourc_research",
  "fourc_flag",
  "fourc_verify",
  "capture",
  "creative_score",
  "analytics",
  "fourc_synthesis",
  "diagnosis",
  "writing",
  "expert_review",
  "signoff",
  "publish",
];

export const INDEPENDENT_DURING_FLAG: StageId[] = [
  "capture",
  "creative_score",
  "analytics",
];

export const DEPENDENT_ON_CUSTOMER_VIEW: StageId[] = [
  "fourc_synthesis",
  "diagnosis",
  "writing",
];

export function emptyStages(): StageRecord[] {
  return STAGE_ORDER.map((id) => ({
    id,
    status: id === "intake" ? "running" : "waiting",
    log: [],
  }));
}
