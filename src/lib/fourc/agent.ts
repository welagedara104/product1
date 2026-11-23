import {
  intakeCompetitors,
  intakeCustomerView,
  intakeDifference,
  intakeGoalLabel,
  intakeMarket,
  intakeWhatYouSell,
  intakeWhyChoose,
  intakeWhyNot,
} from "@/lib/audit/intake-fields";
import type { IntakeAnswers } from "@/lib/audit/types";
import type {
  FourCResearch,
  FourCStepOutput,
  ValidationCheck,
} from "@/lib/fourc/types";
import {
  buildValidationChecks,
  detectForceFlag,
  evaluateValidation,
} from "@/lib/fourc/validate";
import type { FourC } from "@/lib/report/types";

function nowIso(): string {
  return new Date().toISOString();
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

/**
 * Fixture 4C research agent (brief §7).
 * Runs Steps 0–4 + AI-mistake review; Steps 5–6 via runFourCSynthesis after validation.
 */
export function runFourCResearch(intake: IntakeAnswers): {
  research: FourCResearch;
  validation: ValidationCheck[];
  validated: boolean;
} {
  const forceFlag = detectForceFlag(intake);
  const savedAt = nowIso();
  const difference = intakeDifference(intake);
  const customerView = intakeCustomerView(intake);
  const whyNot = intakeWhyNot(intake);
  const competitors = intakeCompetitors(intake);
  const whatYouSell = intakeWhatYouSell(intake);
  const whyChoose = intakeWhyChoose(intake);
  const market = intakeMarket(intake);

  const inputs: FourCStepOutput = {
    step: "inputs",
    title: "Inputs",
    saved_at: savedAt,
    summary: "Client words from intake; public records and field intel marked where missing.",
    body: {
      client_words: {
        business: intake.business_name,
        sell: whatYouSell,
        difference: whyChoose,
        why_choose: whyChoose,
        customer_opinion: customerView,
        why_not: whyNot,
        competitors,
      },
      public_records: "None available (fixture)",
      agency_past_work: "None available (fixture)",
      field_intel: intake.field_intel || market,
    },
  };

  const company: FourCStepOutput = {
    step: "company",
    title: "Company",
    saved_at: savedAt,
    summary: `Company in its own words: ${clip(difference, 100)}`,
    body: {
      quotes: [
        {
          q: "What do you sell?",
          a: whatYouSell,
          source: "intake",
        },
        {
          q: "Meaningful difference?",
          a: difference,
          source: "intake",
        },
        {
          q: "Where do people buy if not from you?",
          a: customerView,
          source: "intake",
        },
      ],
      hypotheses: [
        { id: "H1", text: clip(customerView, 140) },
        { id: "H2", text: clip(difference, 140) },
        { id: "H3", text: clip(whyNot, 140) },
      ],
      evidence_verdicts: [
        {
          claim: difference,
          verdict: forceFlag ? "fair inference" : "supported",
        },
        {
          claim: customerView,
          verdict: forceFlag ? "unsupported as stated" : "fair inference",
        },
      ],
      ladder_rival_test: forceFlag
        ? "category parity on price clarity"
        : "difference survives rival test",
    },
  };

  const shortlist = forceFlag
    ? [
        "Repeat guests in shoulder season",
        "Multi-gen groups booking for milestones",
        "OTA switchers hunting last-minute deals",
      ]
    : [
        clip(customerView, 80),
        "Couples comparing direct vs OTA on total cost",
        "Second-timers who already trust the stay",
      ];

  const step2Verdict = forceFlag
    ? "Right on price clarity mattering; wrong on the core audience."
    : `Right on ${clip(customerView, 60)}; refine on why-not barriers.`;

  const customer: FourCStepOutput = {
    step: "customer",
    title: "Customer",
    saved_at: savedAt,
    summary: step2Verdict,
    body: {
      long_list: [
        ...shortlist,
        "Families on school-holiday peaks",
        "Corporate wellness retreats",
        "Solo long-stay remote workers",
        "Anniversary packages",
        "Group celebrations",
      ],
      shortlist,
      one_line_verdict: step2Verdict,
      why_not_barriers: whyNot.split(/[;.]/).map((s) => s.trim()).filter(Boolean),
    },
  };

  const category: FourCStepOutput = {
    step: "category",
    title: "Category",
    saved_at: savedAt,
    summary: `Alternatives include: ${competitors}`,
    body: {
      alternatives: [
        "Book direct on this site",
        "Book via major OTA",
        "Choose a nearby lagoon resort",
        "Delay the trip",
        "Do nothing this season",
      ],
      competitors,
      reconciliation: forceFlag
        ? {
            H1: "weakened",
            H2: "refined",
            H3: "strengthened",
          }
        : {
            H1: "strengthened",
            H2: "strengthened",
            H3: "refined",
          },
      doing_nothing: "Sized as real: many plan and never book.",
    },
  };

  const culture: FourCStepOutput = {
    step: "culture",
    title: "Culture",
    saved_at: savedAt,
    summary: "Belief shift: plan once, hate surprises; clarity beats flash offers.",
    body: {
      patterns: [
        {
          theme: "Certainty over spectacle",
          horizon: "18–24 months",
        },
        {
          theme: "Totals must feel fair before pay",
          horizon: "ongoing",
        },
      ],
      one_theme: "Plan once, hate surprises",
      moved_to_customer_or_category: [
        "Last-minute deal hunting → Category",
      ],
    },
  };

  const review: FourCStepOutput = {
    step: "review",
    title: "AI-mistake review",
    saved_at: savedAt,
    summary: forceFlag
      ? "Review cleared sources; audience mismatch remains."
      : "No unresolved wrong-source errors on claims used in validation.",
    body: {
      mistakes: forceFlag
        ? [
            {
              step: "customer",
              claim: "First-visit couples dominate",
              problem: "Conflicts with fixture outside evidence",
              fix: "Flag for client confirmation",
            },
          ]
        : [],
      figure_check: [
        {
          claim: "Clarity beats flash offers",
          status: "ok",
          source_says: "Culture pattern table (fixture)",
        },
      ],
      unresolved_wrong_source: false,
    },
  };

  const validation = buildValidationChecks({
    intake,
    forceFlag,
    step2Verdict,
    step1SupportedReasons: forceFlag ? 1 : 2,
    shortlistIncludesClient: !forceFlag,
    unresolvedWrongSource: false,
  });
  const { validated } = evaluateValidation(validation);

  const research: FourCResearch = {
    mode: "fixture",
    scenario: forceFlag ? "force_flag" : "validated",
    steps_1_to_4: [inputs, company, customer, category, culture],
    review,
    validation,
    validated,
    steps_5_to_6: [],
    completed_at: null,
  };

  return { research, validation, validated };
}

/**
 * Steps 5–6: one-slide synthesis + insight distillation.
 * Only call after validated or expert-verified customer view.
 */
export function runFourCSynthesis(
  intake: IntakeAnswers,
  customerViewSummary: string,
  prior: FourCResearch,
): FourCResearch {
  const savedAt = nowIso();
  const centre =
    "Show the stay, the total and a short safe checkout before they compare.";

  const difference = intakeDifference(intake);
  const competitors = intakeCompetitors(intake);
  const whatYouSell = intakeWhatYouSell(intake);
  const whyNot = intakeWhyNot(intake);
  const market = intakeMarket(intake);

  const synthesis: FourCStepOutput = {
    step: "synthesis",
    title: "One-slide synthesis",
    saved_at: savedAt,
    summary: centre,
    body: {
      themes: {
        company: clip(difference, 80),
        customer: clip(customerViewSummary, 80),
        category: clip(competitors, 80),
        culture: "Plan once, hate surprises",
      },
      points: {
        company: [whatYouSell, difference],
        customer: [customerViewSummary, whyNot],
        category: competitors
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3),
        culture: [market, "Plan once, hate surprises"],
      },
      collisions: {
        "company×customer": "Site story vs what guests say stops them booking.",
        "company×category": "Competitors named in intake set the comparison set.",
        "company×culture": "Market expectations shape trust cues.",
        "customer×category": "Guests leave when totals stay unclear.",
        "customer×culture": "They will pay fair if the path feels safe.",
        "category×culture": "Clarity beats flash offers in this market.",
      },
      centre,
    },
  };

  const insight: FourCStepOutput = {
    step: "insight",
    title: "Insight and offer",
    saved_at: savedAt,
    summary: `${clip(customerViewSummary, 60)} trades uncertainty for a settled path.`,
    body: {
      customer_insight: customerViewSummary,
      category_movement: `Buyers also consider: ${competitors}`,
      primary_tension: `${clip(customerViewSummary, 50)} trades unclear totals for a settled direct path. ${intake.business_name} ends that trade.`,
      tiers: [
        "See the stay clearly on Home",
        "Pick with price and cancellation together",
        "Finish booking without a payment scare",
      ],
      name: "Stay settled",
      name_options: ["Stay settled", "Clear path", "Book with certainty"],
      pressure_test: {
        credibility: "Needs real photos of the stay, not empty rooms.",
        revenue_model: "Direct perks must stay visible next to rate.",
        parity: "Totals must match what OTAs show earlier.",
        evidence: "Built from Steps 1–4 after customer view confirmed.",
      },
      client_decisions: [
        intakeGoalLabel(intake),
        "Confirm page list and booking stop before payment.",
      ],
    },
  };

  return {
    ...prior,
    validated: true,
    steps_5_to_6: [synthesis, insight],
    completed_at: savedAt,
  };
}

/** Map completed 4C research into the report FourC chapter shape (§14.11 / §15.10). */
export function fourCResearchToChapter(
  research: FourCResearch,
  reviewState: "draft" | "reviewed" = "draft",
): FourC {
  const synthesis = research.steps_5_to_6.find((s) => s.step === "synthesis");
  const insight = research.steps_5_to_6.find((s) => s.step === "insight");
  const synBody = (synthesis?.body ?? {}) as Record<string, unknown>;
  const insBody = (insight?.body ?? {}) as Record<string, unknown>;

  const themes = (synBody.themes as FourC["slide"]["themes"]) ?? {
    company: "Company",
    customer: "Customer",
    category: "Category",
    culture: "Culture",
  };
  const points = (synBody.points as FourC["slide"]["points"]) ?? {
    company: [],
    customer: [],
    category: [],
    culture: [],
  };
  const collisions =
    (synBody.collisions as Record<string, string>) ?? {};
  const centre = String(synBody.centre ?? synthesis?.summary ?? "");

  const pressure = (insBody.pressure_test as FourC["insight"]["pressure_test"]) ?? {
    credibility: "",
    revenue_model: "",
    parity: "",
    evidence: "",
  };

  const stepDocs: Record<string, string> = {};
  for (const s of research.steps_1_to_4) {
    stepDocs[s.step] = s.summary;
  }
  if (research.review) stepDocs.review = research.review.summary;
  stepDocs.figure_check = "See AI-mistake review figure-check table";
  for (const s of research.steps_5_to_6) {
    stepDocs[s.step] = s.summary;
  }

  return {
    steps: stepDocs,
    validation: research.validation.map((v) => ({
      check: v.check,
      result: v.result,
      evidence: v.evidence,
    })),
    slide: {
      title: String(insBody.primary_tension ?? centre),
      themes,
      points,
      collisions,
      centre,
    },
    insight: {
      customer_insight: String(insBody.customer_insight ?? ""),
      category_movement: String(insBody.category_movement ?? ""),
      primary_tension: String(insBody.primary_tension ?? ""),
      tiers: (insBody.tiers as string[]) ?? [],
      name: String(insBody.name ?? "Stay settled"),
      name_options: (insBody.name_options as string[]) ?? [],
      pressure_test: pressure,
      client_decisions: (insBody.client_decisions as string[]) ?? [],
    },
    review_state: reviewState,
  };
}
