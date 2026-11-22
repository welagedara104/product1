import { createHash } from "crypto";
import {
  intakeCompetitors,
  intakeCustomerView,
  intakeDifference,
  intakeGoalLabel,
  intakeGoalShort,
  intakeMarket,
  intakeWhatYouSell,
  intakeWhyNot,
} from "@/lib/audit/intake-fields";
import type {
  AuditJob,
  CaptureFrame,
  CreativeScoreResult,
  IntakeAnswers,
} from "@/lib/audit/types";
import { fourCResearchToChapter } from "@/lib/fourc/agent";
import { customerViewApproachLine } from "@/lib/fourc/validate";
import { ga4FixtureSummary } from "@/lib/ga4/fixture";
import type { PageData, ReportDocument, Section } from "@/lib/report/types";

/**
 * COM-B diagnosis + writing pipeline.
 * Uses completed 4C Steps 5–6 for the report chapter when present.
 * Expert workspace must promote every score before publish.
 */
export function buildDraftReport(job: AuditJob): ReportDocument {
  if (!job.intake) throw new Error("Intake required before diagnosis");
  if (
    job.customer_view_status !== "validated" &&
    job.customer_view_status !== "expert_verified"
  ) {
    throw new Error(
      "Diagnosis waits until customer view is validated or expert-verified",
    );
  }
  const intake = job.intake;
  const now = new Date().toISOString();
  const buildSha = createHash("sha256")
    .update(
      JSON.stringify({
        audit: job.audit_id,
        intake,
        captures: job.captures,
        cs: job.creative_scores,
        fourc: job.fourc_research?.completed_at,
        at: now,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  const pages = buildPages(intake, job.captures, job.creative_scores);
  const ga = ga4FixtureSummary(intake.business_name);
  const difference = intakeDifference(intake);
  const competitors = intakeCompetitors(intake);
  const whyNot = intakeWhyNot(intake);
  const whatYouSell = intakeWhatYouSell(intake);
  const market = intakeMarket(intake);
  const cvSummary =
    job.customer_view_summary || intakeCustomerView(intake);
  const cvStatus =
    job.customer_view_status === "expert_verified"
      ? ("expert_verified" as const)
      : ("validated" as const);

  const fourc =
    job.fourc_research && job.fourc_research.steps_5_to_6.length > 0
      ? fourCResearchToChapter(job.fourc_research, "draft")
      : fourCResearchToChapter(
          {
            mode: "fixture",
            scenario: "validated",
            steps_1_to_4: [],
            review: null,
            validation: job.fourc_research?.validation ?? [],
            validated: true,
            steps_5_to_6: [],
            completed_at: now,
          },
          "draft",
        );

  // Fallback slide if synthesis somehow missing (should not happen after runDependentStages).
  if (!job.fourc_research?.steps_5_to_6.length) {
    fourc.slide = {
      title: "Make the stay feel settled before they compare",
      themes: {
        company: difference.slice(0, 80),
        customer: cvSummary.slice(0, 80),
        category: competitors.slice(0, 80),
        culture: market,
      },
      points: {
        company: [whatYouSell, difference],
        customer: [cvSummary, whyNot],
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
      centre: "Show the stay, the total and a short safe checkout.",
    };
    fourc.insight = {
      customer_insight: cvSummary,
      category_movement: `Buyers also consider: ${competitors}`,
      primary_tension: whyNot,
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
        evidence: "Draft; expert confirms before publish.",
      },
      client_decisions: [
        intakeGoalLabel(intake),
        "Confirm page list and booking stop before payment.",
      ],
    };
    fourc.validation =
      job.fourc_research?.validation.map((v) => ({
        check: v.check,
        result: v.result,
        evidence: v.evidence,
      })) ?? fourc.validation;
  }

  const report: ReportDocument = {
    report_id: `rpt_${job.audit_id}`,
    client: {
      name: intake.business_name,
      market,
    },
    tier: job.tier,
    o1: intakeGoalLabel(intake),
    customer_view: {
      status: cvStatus,
      date: now.slice(0, 10),
      summary: cvSummary,
      flag: job.flag
        ? {
            raised_at: job.flag.raised_at,
            client_notified: {
              dashboard: job.flag.client_notified.dashboard,
              email_sent_at:
                job.flag.client_notified.email_sent_at ?? undefined,
            },
            client_response_at: job.flag.client_response?.at,
            resolved_by: job.flag.resolution?.by,
            resolution: job.flag.resolution?.kind,
          }
        : undefined,
    },
    fourc,
    signoff: null,
    units: Object.keys(pages).map((slug, i) => ({
      slug,
      set: pages[slug]!.set,
      name: pages[slug]!.name,
      k: i,
      n: Object.keys(pages).length,
    })),
    setname: {
      arrival: "Arrival pages",
      booking: "Booking path",
    },
    pages,
    exec_summary: {
      question: `Where is ${intake.business_name} losing ${intakeGoalShort(intake)}, and why?`,
      key_findings: [
        {
          text: `Guests say they stop because: ${whyNot}`,
          fn: ["intake-why-not"],
        },
        {
          text:
            job.tier >= 1
              ? `GA fixture shows Home bounce around ${Math.round(ga.landing_pages[0]!.bounce_rate * 100)}% with ${ga.landing_pages[0]!.sessions} sessions.`
              : "No GA connected; bounce figures wait on analytics.",
          fn: job.tier >= 1 ? ["ga-landing"] : ["gap-ga"],
        },
      ],
      leads: [
        {
          text: `Commercial goal (O1): ${intakeGoalLabel(intake)}.`,
          fn: ["intake-o1"],
        },
      ],
      top_actions: [1, 2, 3],
    },
    action_plan: [
      {
        rank: 1,
        action: "Open Home with one clear evening (or stay) story and a single next step.",
        evidence: "Intake customer opinion + capture of Home",
        source: "Intake + capture",
        comb: "Capability; Opportunity",
        impact: "High",
        effort: "Medium",
      },
      {
        rank: 2,
        action: "Show price, taxes and cancellation together before the payment screen.",
        evidence: "Why-not-book answer from intake",
        source: "Intake",
        comb: "Opportunity; Motivation",
        impact: "High",
        effort: "Medium",
      },
      {
        rank: 3,
        action: "Keep checkout to two short steps; stop capture before Pay (already enforced).",
        evidence: "Capture stopped_before_payment on booking frames",
        source: "Capture",
        comb: "Physical capability; reflective motivation",
        impact: "Medium",
        effort: "Low",
      },
    ],
    footnote_sources: {
      "intake-why-not": {
        key: "intake-why-not",
        text: `Client intake (${now.slice(0, 10)}): why visitors do not book.`,
      },
      "intake-o1": {
        key: "intake-o1",
        text: `Client intake: commercial goal ${intakeGoalLabel(intake)}.`,
      },
      "ga-landing": {
        key: "ga-landing",
        text: `${ga.property_name}, ${ga.window}: Home landing sessions and bounce (fixture or OAuth).`,
      },
      "gap-ga": {
        key: "gap-ga",
        text: "GA4 not connected; traffic figures omitted.",
      },
    },
    chapters: [
      { id: "exec", title: "What we found, in brief", read_min: 3 },
      { id: "fourc", title: "Your customer: the four Cs", read_min: 4 },
      { id: "approach", title: "Approach", read_min: 4 },
      { id: "arrival", title: "Arrival pages", read_min: 8 },
      { id: "booking", title: "Booking path", read_min: 6 },
      { id: "actions", title: "Action plan", read_min: 4 },
      { id: "gaps", title: "Data gaps and judgement calls", read_min: 2 },
    ],
    data_gaps: [
      ...(job.ga4?.mode === "fixture"
        ? ["GA4 used fixture analytics (OAuth credentials not configured)."]
        : []),
      ...(job.creative_scores.some((c) => c.mode === "fixture")
        ? ["Creative Score used fixture scores (API key not configured)."]
        : []),
      ...(job.fourc_research?.mode === "fixture"
        ? ["4C research used the fixture agent (no live web research in this build)."]
        : []),
      "ContentSquare deferred to Phase 3.",
    ],
    sources_method: [
      "4C Steps 1–6 + AI-mistake review (fixture agent in Phase 2)",
      "COM-B section ratings (Capability, Opportunity, Motivation) 0–4",
      "Capture at 1440×900 and 390×844; stop before payment",
      "Creative Score attention axes per frame",
      job.tier >= 1 ? "GA4 landing and funnel figures (fixture or OAuth)" : "No GA4",
    ],
    approach: {
      in_short: `${customerViewApproachLine({
        status: cvStatus,
        date: now.slice(0, 10),
      })} We captured the site, scored attention, read analytics when present, then rated each section with COM-B. An expert must review every score before anything goes to the client.`,
      comb_terms: [
        {
          term: "Capability",
          plain: "Can they picture the stay?",
          analogy: "Like knowing what the room feels like before you pack.",
        },
        {
          term: "Opportunity",
          plain: "Can they act here, without competition?",
          analogy: "Like a clear door, not five doors and a chat popup.",
        },
        {
          term: "Motivation",
          plain: "Do they want to act now?",
          analogy: "Like a reason that beats waiting or booking elsewhere.",
        },
      ],
    },
    traffic_map:
      job.tier >= 1
        ? {
            nodes: [
              { id: "home", set: "arrival", label: "Home", sessions: ga.landing_pages[0]!.sessions },
              { id: "rooms", set: "arrival", label: "Rooms", sessions: ga.landing_pages[1]!.sessions },
              { id: "book", set: "booking", label: "Book", sessions: ga.landing_pages[2]!.sessions },
            ],
            edges: [
              { from: "home", to: "rooms", weight: 0.34 },
              { from: "rooms", to: "book", weight: 0.28 },
              { from: "home", to: "book", weight: 0.12 },
            ],
          }
        : undefined,
    mobile_theme: {
      in_short: "Mobile is for research; the booking path still needs a short safe finish.",
      headline: "Phone visitors need the same certainty in fewer steps",
      points: [
        "Keep one next step above the fold on phone.",
        "Show total cost before payment.",
        "Do not ask for pay details until the stay is clear.",
      ],
    },
    build: {
      sha: buildSha,
      created_at: now,
      fixture: false,
    },
  };

  return report;
}

function buildPages(
  intake: IntakeAnswers,
  captures: CaptureFrame[],
  scores: CreativeScoreResult[],
): Record<string, PageData> {
  const homeCs = scores.find((s) => s.page_id === "home" && s.device === "d");
  const bookCs = scores.find((s) => s.page_id === "book" && s.device === "d");

  const homeSecs = inferredSections("home", [
    {
      id: "hero",
      name: "Top of page",
      y0: 0,
      y1: 0.35,
      comb: { C: 2, O: 1, M: 1 },
      finding:
        "The top of Home does not give guests one clear picture of the stay they came for.",
      fix: "Lead with one stay story and one next step.",
    },
    {
      id: "proof",
      name: "Proof and next step",
      y0: 0.35,
      y1: 0.7,
      comb: { C: 2, O: 2, M: 1 },
      finding: "Proof and the ask compete with extra links and noise.",
      fix: "Keep one proof block and one primary action.",
    },
  ]);

  const bookSecs = inferredSections("book", [
    {
      id: "summary",
      name: "Stay summary",
      y0: 0,
      y1: 0.4,
      comb: { C: 2, O: 2, M: 2 },
      finding: "The booking summary still hides parts of the total until late.",
      fix: "Show price, taxes and cancellation together.",
    },
    {
      id: "checkout",
      name: "Checkout before payment",
      y0: 0.4,
      y1: 0.85,
      comb: { C: 2, O: 1, M: 1 },
      finding:
        "Checkout asks for commitment before the guest feels the path is safe.",
      fix: "Two short steps, trust cues beside Continue, never auto-advance to Pay.",
    },
  ]);

  const homeCaptureNote = captures.some((c) => c.page_id === "home")
    ? "Captured"
    : "Missing capture";
  const bookCaptureNote = captures.some((c) => c.page_id === "book")
    ? "Captured; stopped before payment"
    : "Missing capture";

  return {
    home: {
      name: "Home",
      set: "arrival",
      idx: 0,
      d: deviceMeta(1440, 900, homeCaptureNote),
      m: deviceMeta(390, 844, homeCaptureNote),
      pts: homeSecs.flatMap((sec, i) => [
        {
          id: `home-f${i + 1}`,
          dev: "d" as const,
          y: (sec.y0 + sec.y1) / 2,
          x: 0.42,
          cat: "C" as const,
          f: sec._finding,
          r: [["Fix", sec._fix]],
          sec: sec.id,
          b: 0,
          pf: 0,
          source: { kind: "inferred" as const },
        },
      ]),
      secs: homeSecs.map(stripMeta),
      weak: {
        d: ["Lead with one stay story", "One clear next step"],
        m: ["Same story, fewer steps on phone"],
      },
      cavg: averages(homeSecs),
      cs: homeCs
        ? {
            d: {
              score: homeCs.score,
              label: homeCs.label,
              names: homeCs.names,
              axes: homeCs.axes,
            },
          }
        : undefined,
      pfx: null,
    },
    book: {
      name: "Book",
      set: "booking",
      idx: 1,
      d: deviceMeta(1440, 900, bookCaptureNote),
      m: deviceMeta(390, 844, bookCaptureNote),
      pts: bookSecs.flatMap((sec, i) => [
        {
          id: `book-f${i + 1}`,
          dev: "d" as const,
          y: (sec.y0 + sec.y1) / 2,
          x: 0.5,
          cat: "O" as const,
          f: sec._finding,
          r: [["Fix", sec._fix]],
          sec: sec.id,
          b: 0,
          pf: 0,
          source: { kind: "inferred" as const },
        },
      ]),
      secs: bookSecs.map(stripMeta),
      weak: {
        d: ["Show the full total early", "Short safe checkout"],
        m: ["Keep payment off-screen until ready"],
      },
      cavg: averages(bookSecs),
      cs: bookCs
        ? {
            d: {
              score: bookCs.score,
              label: bookCs.label,
              names: bookCs.names,
              axes: bookCs.axes,
            },
          }
        : undefined,
      pfx: {
        d: {
          rec: "Rebuild checkout so the total and trust cues sit before Pay.",
          label: "How booking should feel, top to bottom",
          frames: [
            [
              "Frame 01 · Stay summary",
              [
                "Room, dates and inclusions in one block.",
                "Price, taxes and cancellation on the same screen.",
              ],
            ],
            [
              "Frame 02 · Details",
              [
                "Guest details only; no payment fields yet.",
                "Continue with trust cues beside the button.",
              ],
            ],
          ],
          tests: ["Test a two-step form with perks as tick boxes."],
        },
        m: null,
      },
    },
  };
}

type SecDraft = Section & { _finding: string; _fix: string };

function inferredSections(
  _page: string,
  defs: Array<{
    id: string;
    name: string;
    y0: number;
    y1: number;
    comb: { C: number; O: number; M: number };
    finding: string;
    fix: string;
  }>,
): SecDraft[] {
  return defs.map((d) => ({
    id: d.id,
    dev: "d" as const,
    name: d.name,
    y0: d.y0,
    y1: d.y1,
    x0: 0,
    x1: 1,
    of: [],
    r: [["Definite", d.fix]],
    comb: d.comb,
    combt: d.comb.C + d.comb.O + d.comb.M,
    comb_state: "inferred" as const,
    _finding: d.finding,
    _fix: d.fix,
  }));
}

function stripMeta(s: SecDraft): Section {
  const { _finding: _f, _fix: _x, ...rest } = s;
  return rest;
}

function averages(secs: Section[]) {
  const n = secs.length || 1;
  const C = secs.reduce((a, s) => a + s.comb.C, 0) / n;
  const O = secs.reduce((a, s) => a + s.comb.O, 0) / n;
  const M = secs.reduce((a, s) => a + s.comb.M, 0) / n;
  const avg = {
    C: round1(C),
    O: round1(O),
    M: round1(M),
    t: round1(C + O + M),
    n: secs.length,
    cc: secs.length,
  };
  return { d: avg, m: avg };
}

function deviceMeta(w: number, h: number, segment: string) {
  return {
    segh: [0, 0.5, 1],
    w,
    sticky: [],
    heat: false,
    screen_h: h,
    segments: [segment, "COM-B draft"],
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
