import { z } from "zod";

/** Report schema aligned to brief section 15 (Phase 0 foundations). */

export const CombStateSchema = z.enum(["inferred", "reviewed", "expert"]);
export type CombState = z.infer<typeof CombStateSchema>;

export const DeviceSchema = z.enum(["d", "m"]);
export type Device = z.infer<typeof DeviceSchema>;

export const FindingCategorySchema = z.enum(["C", "O", "M"]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const SourceSchema = z.object({
  key: z.string(),
  text: z.string(),
  rules: z
    .array(
      z.object({
        needle: z.string(),
        pages: z.array(z.string()),
      }),
    )
    .optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const FindingSourceSchema = z.object({
  kind: z.enum(["expert", "inferred"]),
  author: z.string().optional(),
  version: z.number().optional(),
});

export const FindingSchema = z.object({
  id: z.string(),
  dev: DeviceSchema,
  y: z.number(),
  x: z.number(),
  cat: FindingCategorySchema,
  also: z.string().nullable().optional(),
  f: z.string(),
  r: z.array(z.tuple([z.string(), z.string()])).default([]),
  sec: z.string().optional(),
  b: z.number().default(0),
  pf: z.number().default(0),
  k: z.number().optional(),
  source: FindingSourceSchema.optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const RadarSchema = z.object({
  score: z.number(),
  label: z.string(),
  names: z.array(z.string()),
  axes: z.array(z.number()),
  ids: z.array(z.string()).optional(),
  n: z.number().optional(),
});
export type Radar = z.infer<typeof RadarSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  dev: DeviceSchema,
  name: z.string(),
  y0: z.number(),
  y1: z.number(),
  x0: z.number(),
  x1: z.number(),
  of: z.array(z.string()),
  r: z.array(z.tuple([z.string(), z.string()])),
  comb: z.object({ C: z.number(), O: z.number(), M: z.number() }),
  combt: z.number(),
  comb_state: CombStateSchema,
  radar: RadarSchema.optional(),
});
export type Section = z.infer<typeof SectionSchema>;

export const PageFixesSchema = z.object({
  rec: z.string(),
  label: z.string(),
  frames: z.array(z.tuple([z.string(), z.array(z.string())])),
  tests: z.array(z.string()),
});
export type PageFixes = z.infer<typeof PageFixesSchema>;

export const DeviceMetaSchema = z.object({
  segh: z.array(z.number()),
  w: z.number(),
  sticky: z.array(z.unknown()).default([]),
  heat: z.boolean().default(false),
  screen_h: z.number(),
  /** Placeholder strip labels for Phase 0 (real captures land in Phase 1). */
  segments: z.array(z.string()).optional(),
});
export type DeviceMeta = z.infer<typeof DeviceMetaSchema>;

export const CombAvgSchema = z.object({
  C: z.number(),
  O: z.number(),
  M: z.number(),
  t: z.number(),
  n: z.number(),
  cc: z.number(),
});

export const PageDataSchema = z.object({
  name: z.string(),
  set: z.string(),
  idx: z.number(),
  d: DeviceMetaSchema,
  m: DeviceMetaSchema,
  pts: z.array(FindingSchema),
  secs: z.array(SectionSchema),
  pfx: z
    .object({
      d: PageFixesSchema.nullable().optional(),
      m: PageFixesSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  weak: z.object({
    d: z.array(z.string()),
    m: z.array(z.string()),
  }),
  cavg: z.object({
    d: CombAvgSchema,
    m: CombAvgSchema,
  }),
  cs: z
    .object({
      d: RadarSchema.optional(),
      m: RadarSchema.optional(),
    })
    .optional(),
  fn: z
    .object({
      d: z.array(z.tuple([z.number(), z.string()])).optional(),
      m: z.array(z.tuple([z.number(), z.string()])).optional(),
    })
    .optional(),
});
export type PageData = z.infer<typeof PageDataSchema>;

export const ActionSchema = z.object({
  rank: z.number(),
  action: z.string(),
  evidence: z.string(),
  source: z.string(),
  comb: z.string(),
  impact: z.string(),
  effort: z.string(),
});
export type Action = z.infer<typeof ActionSchema>;

export const ExecSummarySchema = z.object({
  question: z.string(),
  key_findings: z.array(
    z.object({
      text: z.string(),
      fn: z.array(z.string()),
    }),
  ),
  leads: z.array(
    z.object({
      text: z.string(),
      fn: z.array(z.string()),
    }),
  ),
  top_actions: z.array(z.number()),
});
export type ExecSummary = z.infer<typeof ExecSummarySchema>;

export const FourCSchema = z.object({
  steps: z.record(z.string(), z.string()).optional(),
  validation: z.array(
    z.object({
      check: z.string(),
      result: z.enum(["pass", "partial", "fail", "insufficient_evidence"]),
      evidence: z.string(),
    }),
  ),
  slide: z.object({
    title: z.string(),
    themes: z.object({
      company: z.string(),
      customer: z.string(),
      category: z.string(),
      culture: z.string(),
    }),
    points: z.object({
      company: z.array(z.string()),
      customer: z.array(z.string()),
      category: z.array(z.string()),
      culture: z.array(z.string()),
    }),
    collisions: z.record(z.string(), z.string()),
    centre: z.string(),
    files: z
      .object({
        png: z.string().optional(),
        pptx: z.string().optional(),
      })
      .optional(),
  }),
  insight: z.object({
    customer_insight: z.string(),
    category_movement: z.string(),
    primary_tension: z.string(),
    tiers: z.array(z.string()),
    name: z.string(),
    name_options: z.array(z.string()),
    pressure_test: z.object({
      credibility: z.string(),
      revenue_model: z.string(),
      parity: z.string(),
      evidence: z.string(),
    }),
    client_decisions: z.array(z.string()),
  }),
  review_state: z.enum(["draft", "reviewed"]),
});
export type FourC = z.infer<typeof FourCSchema>;

export const SignoffSchema = z.object({
  expert_id: z.string(),
  at: z.string(),
  build_sha: z.string(),
  method_versions: z.record(z.string(), z.string()),
  checklist: z.object({
    all_pages_reviewed: z.boolean(),
    fourc_reviewed: z.boolean(),
    qa_green: z.boolean(),
  }),
});
export type Signoff = z.infer<typeof SignoffSchema>;

export const UnitSchema = z.object({
  slug: z.string(),
  set: z.string(),
  name: z.string(),
  k: z.number(),
  n: z.number(),
  proxy_for: z.string().optional(),
});

export const ChapterMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  read_min: z.number(),
  evidence_min: z.number().optional(),
});

export const ReportDocumentSchema = z.object({
  report_id: z.string(),
  client: z.object({
    name: z.string(),
    market: z.string(),
  }),
  tier: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  o1: z.string(),
  customer_view: z.object({
    status: z.enum(["validated", "expert_verified"]),
    date: z.string(),
    summary: z.string(),
    flag: z
      .object({
        raised_at: z.string().optional(),
        client_notified: z
          .object({
            dashboard: z.boolean().optional(),
            email_sent_at: z.string().optional(),
          })
          .optional(),
        client_response_at: z.string().optional(),
        resolved_by: z.string().optional(),
        resolution: z.enum(["confirmed", "revised"]).optional(),
      })
      .optional(),
  }),
  fourc: FourCSchema,
  signoff: SignoffSchema.nullable(),
  units: z.array(UnitSchema),
  setname: z.record(z.string(), z.string()),
  pages: z.record(z.string(), PageDataSchema),
  exec_summary: ExecSummarySchema,
  action_plan: z.array(ActionSchema),
  footnote_sources: z.record(z.string(), SourceSchema),
  chapters: z.array(ChapterMetaSchema),
  data_gaps: z.array(z.string()),
  sources_method: z.array(z.string()),
  approach: z.object({
    in_short: z.string(),
    comb_terms: z.array(
      z.object({
        term: z.string(),
        plain: z.string(),
        analogy: z.string(),
      }),
    ),
  }),
  traffic_map: z
    .object({
      nodes: z.array(
        z.object({
          id: z.string(),
          set: z.string(),
          label: z.string(),
          sessions: z.number(),
        }),
      ),
      edges: z.array(
        z.object({
          from: z.string(),
          to: z.string(),
          weight: z.number(),
        }),
      ),
    })
    .optional(),
  mobile_theme: z.object({
    in_short: z.string(),
    headline: z.string(),
    points: z.array(z.string()),
  }),
  build: z.object({
    sha: z.string(),
    created_at: z.string(),
    fixture: z.boolean().default(false),
  }),
});
export type ReportDocument = z.infer<typeof ReportDocumentSchema>;

/** Published hosting only allows reviewed/expert scores (brief 18.4). */
export function assertClientPublishable(report: ReportDocument): string[] {
  const errors: string[] = [];
  if (!report.signoff) {
    errors.push("Missing expert sign-off");
  } else if (report.signoff.build_sha !== report.build.sha) {
    errors.push("Sign-off build_sha does not match report build.sha");
  }
  for (const [slug, page] of Object.entries(report.pages)) {
    for (const sec of page.secs) {
      if (sec.comb_state === "inferred") {
        errors.push(`${slug}/${sec.id}: comb_state is inferred`);
      }
    }
  }
  return errors;
}
