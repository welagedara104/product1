import { z } from "zod";

/** Validation check results from brief §7.3. */
export const ValidationResultSchema = z.enum([
  "pass",
  "partial",
  "fail",
  "insufficient_evidence",
]);
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export const ValidationCheckSchema = z.object({
  check: z.enum([
    "who",
    "why_buy",
    "why_not",
    "contradiction",
    "evidence_floor",
  ]),
  result: ValidationResultSchema,
  evidence: z.string(),
  plain_words: z.string(),
});
export type ValidationCheck = z.infer<typeof ValidationCheckSchema>;

export const FourCStepIdSchema = z.enum([
  "inputs",
  "company",
  "customer",
  "category",
  "culture",
  "review",
  "synthesis",
  "insight",
]);
export type FourCStepId = z.infer<typeof FourCStepIdSchema>;

export const FourCStepOutputSchema = z.object({
  step: FourCStepIdSchema,
  title: z.string(),
  saved_at: z.string(),
  /** Plain-language summary for internal/expert use — never shown on client dashboard. */
  summary: z.string(),
  /** Structured artefact body (fixture or research agent). */
  body: z.record(z.string(), z.unknown()),
});
export type FourCStepOutput = z.infer<typeof FourCStepOutputSchema>;

export const FlagStatusSchema = z.enum([
  "pending_wording",
  "awaiting_client",
  "awaiting_expert",
  "resolved",
]);
export type FlagStatus = z.infer<typeof FlagStatusSchema>;

export const FlagRecordSchema = z.object({
  raised_at: z.string(),
  status: FlagStatusSchema,
  /** Flag-once: true after first raise; never raise again. */
  raised_once: z.literal(true),
  failed_checks: z.array(ValidationCheckSchema),
  /** Client-facing copy (expert-approved before email). */
  wording: z
    .object({
      title: z.string(),
      what_is_flagged: z.array(z.string()),
      questions: z.array(
        z.object({
          id: z.string(),
          prompt: z.string(),
        }),
      ),
      what_happens_next: z.string(),
      approved_at: z.string().nullable(),
      approved_by: z.string().nullable(),
    })
    .nullable(),
  client_notified: z.object({
    dashboard: z.boolean(),
    email_sent_at: z.string().nullable(),
  }),
  client_response: z
    .object({
      at: z.string(),
      answers: z.record(z.string(), z.string()),
      notes: z.string().optional(),
      request_call: z.boolean().default(false),
    })
    .nullable(),
  resolution: z
    .object({
      at: z.string(),
      by: z.string(),
      kind: z.enum(["confirmed", "revised"]),
      customer_view_summary: z.string(),
      note: z.string().optional(),
    })
    .nullable(),
  reminders_sent: z.array(z.string()).default([]),
});
export type FlagRecord = z.infer<typeof FlagRecordSchema>;

export const FourCResearchSchema = z.object({
  mode: z.enum(["fixture", "live"]),
  scenario: z.enum(["validated", "force_flag"]),
  steps_1_to_4: z.array(FourCStepOutputSchema),
  review: FourCStepOutputSchema.nullable(),
  validation: z.array(ValidationCheckSchema),
  validated: z.boolean(),
  /** Steps 5–6 only after validated or expert-verified. */
  steps_5_to_6: z.array(FourCStepOutputSchema).default([]),
  completed_at: z.string().nullable(),
});
export type FourCResearch = z.infer<typeof FourCResearchSchema>;

export const EmailStubSchema = z.object({
  id: z.string(),
  audit_id: z.string(),
  template: z.enum([
    "audit_started",
    "flag_raised",
    "flag_reminder",
    "flag_resolved",
    "report_ready",
  ]),
  to: z.array(z.string()),
  subject: z.string(),
  body: z.string(),
  sent_at: z.string(),
  provider: z.literal("stub"),
});
export type EmailStub = z.infer<typeof EmailStubSchema>;
