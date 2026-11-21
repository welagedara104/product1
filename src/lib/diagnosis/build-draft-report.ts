import { createHash } from "crypto";
import type {
  AuditJob,
  CaptureFrame,
  CreativeScoreResult,
  IntakeAnswers,
} from "@/lib/audit/types";
import { ga4FixtureSummary } from "@/lib/ga4/fixture";
import type { PageData, ReportDocument, Section } from "@/lib/report/types";

/**
 * COM-B diagnosis + writing pipeline (Phase 1).
 * Fills the Phase 0 report model with inferred scores.
 * Expert workspace must promote every score before publish.
 */
export function buildDraftReport(job: AuditJob): ReportDocument {
  if (!job.intake) throw new Error("Intake required before diagnosis");
  const intake = job.intake;
  const now = new Date().toISOString();
  const buildSha = createHash("sha256")
    .update(
      JSON.stringify({
        audit: job.audit_id,
        intake,
        captures: job.captures,
        cs: job.creative_scores,
        at: now,
      }),
    )
    .digest("hex")
    .slice(0, 16);

  const pages = buildPages(intake, job.captures, job.creative_scores);
  const ga = ga4FixtureSummary(intake.business_name);

  const report: ReportDocument = {
    report_id: `rpt_${job.audit_id}`,
    client: {
      name: intake.business_name,
      market: intake.market,
    },
    tier: job.tier,
    o1: goalLabel(intake),
    customer_view: {
      status: "validated",
      date: now.slice(0, 10),
      summary: intake.customer_opinion,
    },
    fourc: {
      validation: [
        {
          check: "who",
          result: "pass",
          evidence: intake.customer_opinion.slice(0, 180),
        },
        {
          check: "why_buy",
          result: "partial",
          evidence: intake.difference.slice(0, 180),
        },
        {
          check: "why_not",
          result: "partial",
          evidence: intake.why_not_book.slice(0, 180),
        },
        {
          check: "contradiction",
          result: "pass",
          evidence: "Phase 1 skips full 4C agent; expert verifies in workspace.",
        },
        {
          check: "evidence_floor",
          result: job.tier >= 1 ? "pass" : "insufficient_evidence",
          evidence:
            job.tier >= 1
              ? "GA4 fixture/OAuth present (tier 1)."
              : "No GA4; qualitative only.",
        },
      ],
      slide: {
        title: "Make the stay feel settled before they compare",
        themes: {
          company: intake.difference.slice(0, 80),
          customer: intake.customer_opinion.slice(0, 80),
          category: intake.competitors.slice(0, 80),
          culture: intake.market,
        },
        points: {
          company: [intake.what_you_sell, intake.difference],
          customer: [intake.customer_opinion, intake.why_not_book],
          category: intake.competitors.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 3),
          culture: [intake.market, "Plan once, hate surprises"],
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
      },
      insight: {
        customer_insight: intake.customer_opinion,
        category_movement: `Buyers also consider: ${intake.competitors}`,
        primary_tension: intake.why_not_book,
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
          evidence: "Phase 1 draft; expert confirms before publish.",
        },
        client_decisions: [
          intake.goal_detail,
          "Confirm page list and booking stop before payment.",
        ],
      },
      review_state: "draft",
    },
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
      question: `Where is ${intake.business_name} losing ${goalShort(intake)}, and why?`,
      key_findings: [
        {
          text: `Guests say they stop because: ${intake.why_not_book}`,
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
          text: `Commercial goal (O1): ${goalLabel(intake)}.`,
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
        text: `Client intake: commercial goal ${goalLabel(intake)}.`,
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
      "Full 4C agent deferred to Phase 2; customer view taken from intake.",
      "ContentSquare deferred to Phase 3.",
    ],
    sources_method: [
      "COM-B section ratings (Capability, Opportunity, Motivation) 0–4",
      "Capture at 1440×900 and 390×844; stop before payment",
      "Creative Score attention axes per frame",
      job.tier >= 1 ? "GA4 landing and funnel figures (fixture or OAuth)" : "No GA4",
    ],
    approach: {
      in_short:
        "We captured the site, scored attention, read the intake (and GA when present), then rated each section with COM-B. An expert must review every score before anything goes to the client.",
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

function goalLabel(intake: IntakeAnswers): string {
  const map = {
    direct_bookings: "Direct bookings",
    enquiries: "Enquiries",
    sales: "Sales",
    sign_ups: "Sign-ups",
    other: "Other goal",
  } as const;
  return `${map[intake.goal_o1]}: ${intake.goal_detail}`;
}

function goalShort(intake: IntakeAnswers): string {
  return {
    direct_bookings: "direct bookings",
    enquiries: "enquiries",
    sales: "sales",
    sign_ups: "sign-ups",
    other: "conversions",
  }[intake.goal_o1];
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
