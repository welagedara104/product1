import type { ReportDocument } from "@/lib/report/types";

const CS_NAMES = [
  "Aesthetic",
  "Attention",
  "Authenticity",
  "Clarity",
  "Cohesion",
  "Creativity",
  "Emotion",
  "Memorability",
  "Motivation",
  "Narrative",
  "Relevance",
  "Urgency",
  "Virality",
];

/**
 * Anonymised Velifushi-inspired fixture for Phase 0.
 * Brand, place names and figures are fictional; structure mirrors brief §15.
 */
export const velifushiAnonFixture: ReportDocument = {
  report_id: "rpt_fixture_lagoon_anon_001",
  client: {
    name: "Lagoon Atoll Resort",
    market: "UK and EU long-haul leisure",
  },
  tier: 1,
  o1: "Direct bookings on the resort's own site",
  customer_view: {
    status: "expert_verified",
    date: "2026-11-18",
    summary:
      "Guests want a clear picture of evenings, total cost and how booking ends, without trading certainty for a lower OTA price.",
  },
  fourc: {
    validation: [
      {
        check: "who",
        result: "pass",
        evidence: "Couples and small families planning a once-a-year long-haul stay.",
      },
      {
        check: "why_buy",
        result: "pass",
        evidence: "They buy a private lagoon setting they can picture themselves in.",
      },
      {
        check: "why_not",
        result: "partial",
        evidence: "Total price and what is included stay unclear until late in booking.",
      },
      {
        check: "contradiction",
        result: "pass",
        evidence: "Site leads with variety; guests need one clear evening story first.",
      },
      {
        check: "evidence_floor",
        result: "pass",
        evidence: "Intake answers and GA landing paths agree on Home and Rooms as gates.",
      },
    ],
    slide: {
      title: "End the trade of certainty for a lower OTA price",
      themes: {
        company: "Private lagoon evenings, done properly",
        customer: "I need to see the total and finish safely",
        category: "OTAs win on price clarity, not place",
        culture: "Long-haul guests plan once and hate surprises",
      },
      points: {
        company: [
          "Overwater and beach rooms on one lagoon",
          "Direct perks that matter at the desk",
          "A booking path the team can own",
        ],
        customer: [
          "Picture the evening before they pick a room",
          "See price, taxes and cancellation together",
          "Finish without a payment scare",
        ],
        category: [
          "OTAs show totals earlier",
          "Resort sites often bury inclusions",
          "Parity fights start at the first rate",
        ],
        culture: [
          "UK and EU guests book months ahead",
          "Trust cues beat flash sales",
          "Mobile is research; desktop still books",
        ],
      },
      collisions: {
        "company×customer": "Variety on Home fights the one evening story guests need.",
        "company×category": "Direct perks are real but appear after the OTA comparison.",
        "company×culture": "Legal notes sit next to BOOK NOW on room pages.",
        "customer×category": "Guests leave when the total stays hidden.",
        "customer×culture": "They will pay fair if the path feels safe.",
        "category×culture": "Published hotel checkout drop-off is high; clarity wins.",
      },
      centre: "Show the evening, the total and a short safe checkout before they compare.",
    },
    insight: {
      customer_insight:
        "The guest trades certainty for a lower OTA price when the resort site hides the total and the evening story.",
      category_movement: "Direct sites win when they make the stay feel settled earlier than OTAs.",
      primary_tension:
        "Buyers trade X for Y to get Z. Lagoon Atoll ends that trade by showing evenings, totals and a short checkout.",
      tiers: [
        "See the lagoon evening on Home",
        "Pick a room with price and cancellation together",
        "Finish booking in two short steps",
      ],
      name: "Evenings, settled",
      name_options: ["Evenings, settled", "Lagoon clear", "Stay decided"],
      pressure_test: {
        credibility: "Needs real evening photos, not empty decks.",
        revenue_model: "Direct perks must stay visible next to rate.",
        parity: "Rate note belongs with revenue, not as a page score.",
        evidence: "Checkout drop-off and Home bounce support the order of fixes.",
      },
      client_decisions: [
        "Which evening story leads Home?",
        "Which direct perk sits next to BOOK NOW?",
      ],
    },
    review_state: "reviewed",
  },
  signoff: {
    expert_id: "expert_fixture",
    at: "2026-11-20T16:00:00Z",
    build_sha: "fixture-build-sha-001",
    method_versions: { diagnostic: "v16", fourc: "v1" },
    checklist: {
      all_pages_reviewed: true,
      fourc_reviewed: true,
      qa_green: true,
    },
  },
  units: [
    { slug: "home", set: "A", name: "Home", k: 1, n: 2 },
    {
      slug: "sunset",
      set: "C",
      name: "Overwater suite (proxy for room pages)",
      k: 2,
      n: 2,
      proxy_for: "room inner pages",
    },
  ],
  setname: {
    A: "Set A · Entry and inspiration",
    B: "Set B · Research for mid-funnel",
    C: "Set C · Choosing a room or offer",
    D: "Set D · Booking engine",
  },
  pages: {
    home: {
      name: "Home",
      set: "A",
      idx: 1,
      d: {
        segh: [900, 900, 900],
        w: 1280,
        sticky: [],
        heat: true,
        screen_h: 720,
        segments: [
          "Hero video and BOOK NOW",
          "Highlights and offers strip",
          "Rooms teaser and footer",
        ],
      },
      m: {
        segh: [1100, 1100, 1100],
        w: 390,
        sticky: [],
        heat: true,
        screen_h: 844,
        segments: [
          "Hero and consent",
          "Highlights stack",
          "Rooms and footer",
        ],
      },
      pts: [
        {
          id: "home-d1",
          dev: "d",
          y: 0.08,
          x: 0.72,
          cat: "O",
          also: null,
          f: "A consent panel covers most of the first screen.\n- It sits over the hero and BOOK NOW.\n- Guests must clear it before they can see the place.",
          r: [],
          sec: "home-d-top-video",
          b: 0,
          pf: 0,
          source: { kind: "expert", author: "expert_fixture", version: 16 },
        },
        {
          id: "home-d2",
          dev: "d",
          y: 0.22,
          x: 0.35,
          cat: "M",
          also: null,
          f: "The top video shows wide shots and fast action, with few people.\n- Guests cannot picture an evening on the lagoon.\n- Jet-ski cuts fight the calm the brand sells.",
          r: [],
          sec: "home-d-top-video",
          b: 0,
          pf: 0,
          source: { kind: "expert", author: "expert_fixture", version: 16 },
        },
        {
          id: "home-d3",
          dev: "d",
          y: 0.48,
          x: 0.55,
          cat: "C",
          also: null,
          f: "Three offer cards compete with BOOK NOW.\n- Each card has its own CTA.\n- The main ask is no longer the only ask.",
          r: [],
          sec: "home-d-offers",
          b: 0,
          pf: 0,
          source: { kind: "expert", author: "expert_fixture", version: 16 },
        },
        {
          id: "home-d4",
          dev: "d",
          y: 0,
          x: 0.5,
          cat: "O",
          also: null,
          f: "Chat greeting and loyalty currency appear on every first view.\n- They arrive before the guest has a reason to stay.\n- Order of asks is unclear.",
          r: [
            [
              "Definite",
              "Delay chat and loyalty until after the first scroll past the hero.",
            ],
            [
              "Experiment",
              "Test showing loyalty only after BOOK NOW is in view.",
            ],
          ],
          sec: undefined,
          b: 1,
          pf: 0,
          k: 1,
          source: { kind: "expert", author: "expert_fixture", version: 16 },
        },
        {
          id: "home-m1",
          dev: "m",
          y: 0.12,
          x: 0.5,
          cat: "O",
          also: null,
          f: "On a phone the consent panel fills the screen.\n- BOOK NOW sits under it.\n- The guest cannot see the lagoon first.",
          r: [],
          sec: "home-m-hero",
          b: 0,
          pf: 0,
          source: { kind: "expert", author: "expert_fixture", version: 16 },
        },
        {
          id: "home-m2",
          dev: "m",
          y: 0.42,
          x: 0.48,
          cat: "M",
          also: null,
          f: "Room teaser cards show empty decks.\n- No guests, no evening light.\n- The phone story feels unfinished.",
          r: [],
          sec: "home-m-rooms",
          b: 0,
          pf: 0,
          source: { kind: "expert", author: "expert_fixture", version: 16 },
        },
      ],
      secs: [
        {
          id: "home-d-top-video",
          dev: "d",
          name: "Top video",
          y0: 0.0,
          y1: 0.32,
          x0: 0.02,
          x1: 0.98,
          of: ["home-d1", "home-d2"],
          r: [
            [
              "Definite",
              "Lead with an evening lagoon clip with guests in frame.\n- Keep BOOK NOW free of panels on first paint.",
            ],
            [
              "Definite",
              "Move consent to a slim bar after the first interaction.",
            ],
          ],
          comb: { C: 2, O: 1, M: 1 },
          combt: 4,
          comb_state: "expert",
          radar: {
            score: 48,
            label: "Average",
            names: CS_NAMES,
            axes: [52, 38, 44, 61, 49, 28, 41, 33, 29, 47, 50, 21, 8],
            ids: ["cs_home_1"],
          },
        },
        {
          id: "home-d-offers",
          dev: "d",
          name: "Offers strip",
          y0: 0.32,
          y1: 0.62,
          x0: 0.02,
          x1: 0.98,
          of: ["home-d3"],
          r: [
            [
              "Definite",
              "Keep one primary BOOK NOW. Offer cards link as text, not buttons.",
            ],
            [
              "Experiment",
              "Test a single seasonal offer under the hero instead of three cards.",
            ],
          ],
          comb: { C: 2, O: 2, M: 1 },
          combt: 5,
          comb_state: "expert",
          radar: {
            score: 51,
            label: "Average",
            names: CS_NAMES,
            axes: [55, 40, 46, 70, 52, 30, 44, 35, 31, 49, 53, 24, 9],
          },
        },
        {
          id: "home-m-hero",
          dev: "m",
          name: "Hero and consent",
          y0: 0.0,
          y1: 0.36,
          x0: 0.02,
          x1: 0.98,
          of: ["home-m1"],
          r: [
            [
              "Definite",
              "Show a lagoon still behind a slim consent bar, with BOOK NOW visible.",
            ],
          ],
          comb: { C: 2, O: 1, M: 1 },
          combt: 4,
          comb_state: "expert",
        },
        {
          id: "home-m-rooms",
          dev: "m",
          name: "Rooms teaser",
          y0: 0.36,
          y1: 0.72,
          x0: 0.02,
          x1: 0.98,
          of: ["home-m2"],
          r: [
            [
              "Definite",
              "Replace empty deck photos with guests at dusk next to BOOK NOW.",
            ],
          ],
          comb: { C: 1, O: 2, M: 1 },
          combt: 4,
          comb_state: "reviewed",
        },
      ],
      pfx: null,
      weak: {
        d: [
          "Lead with an evening lagoon story and keep BOOK NOW clear of panels.",
          "Cut competing CTAs so the main ask stays one ask.",
        ],
        m: [
          "Make consent slim so the lagoon and BOOK NOW show on first paint.",
          "Use guest photos on room teasers, not empty decks.",
        ],
      },
      cavg: {
        d: { C: 2.0, O: 1.5, M: 1.0, t: 4.5, n: 2, cc: 1 },
        m: { C: 1.5, O: 1.5, M: 1.0, t: 4.0, n: 2, cc: 1 },
      },
      cs: {
        d: {
          score: 50,
          label: "Average",
          names: CS_NAMES,
          axes: [54, 39, 45, 66, 51, 29, 43, 34, 30, 48, 52, 23, 9],
          ids: ["cs_home_d1", "cs_home_d2"],
          n: 2,
        },
        m: {
          score: 46,
          label: "Average",
          names: CS_NAMES,
          axes: [50, 36, 42, 60, 48, 26, 40, 31, 28, 45, 49, 20, 7],
          ids: ["cs_home_m1"],
        },
      },
      fn: {
        d: [
          [
            1,
            "Home first view, captured 16 Nov 2026: consent panel covering hero and BOOK NOW.",
          ],
          [
            2,
            "GA 12 mo: Home landings bounce about 29%, better than a published hotel average near 36%.",
          ],
        ],
        m: [
          [
            1,
            "Home mobile first view, captured 16 Nov 2026: full-screen consent before lagoon.",
          ],
        ],
      },
    },
    sunset: {
      name: "Overwater suite with deck",
      set: "C",
      idx: 2,
      d: {
        segh: [1000, 1000],
        w: 1280,
        sticky: [],
        heat: true,
        screen_h: 720,
        segments: ["Gallery and BOOK NOW", "Description and extras"],
      },
      m: {
        segh: [1200, 1200],
        w: 390,
        sticky: [],
        heat: false,
        screen_h: 844,
        segments: ["Gallery stack", "BOOK NOW and terms"],
      },
      pts: [
        {
          id: "sunset-d1",
          dev: "d",
          y: 0.28,
          x: 0.44,
          cat: "M",
          also: null,
          f: "A legal note about children sits just above BOOK NOW.\n- It explains who counts as a child.\n- It is the last thing guests read before they decide.",
          r: [],
          sec: "sunset-d-book",
          b: 0,
          pf: 0,
          source: { kind: "expert", author: "expert_fixture", version: 16 },
        },
        {
          id: "sunset-d2",
          dev: "d",
          y: 0.3,
          x: 0.78,
          cat: "C",
          also: null,
          f: "Price, taxes and cancellation are missing next to BOOK NOW.\n- Guests must leave the page to learn the total.\n- The button asks for a decision without the facts.",
          r: [],
          sec: "sunset-d-book",
          b: 0,
          pf: 0,
          source: { kind: "expert", author: "expert_fixture", version: 16 },
        },
        {
          id: "sunset-m1",
          dev: "m",
          y: 0.55,
          x: 0.5,
          cat: "C",
          also: null,
          f: "Two identical BOOK NOW buttons sit one above the other.\n- Neither shows price or cancellation.\n- The double ask feels unsure.",
          r: [],
          sec: "sunset-m-book",
          b: 0,
          pf: 0,
          source: { kind: "inferred", author: "cranial", version: 16 },
        },
      ],
      secs: [
        {
          id: "sunset-d-book",
          dev: "d",
          name: "Room description and BOOK NOW",
          y0: 0.18,
          y1: 0.55,
          x0: 0.01,
          x1: 0.99,
          of: ["sunset-d1", "sunset-d2"],
          r: [
            [
              "Definite",
              "Start with three lines on the deck, the lagoon and the evening.\n- Move the note about children into booking terms.",
            ],
            [
              "Definite",
              "Next to BOOK NOW show a from price with taxes, free cancellation up to 14 days, and two Book Direct benefits.",
            ],
          ],
          comb: { C: 2, O: 1, M: 1 },
          combt: 4,
          comb_state: "expert",
          radar: {
            score: 55,
            label: "Average",
            names: CS_NAMES,
            axes: [55, 43, 45, 79, 50, 21, 47, 36, 26, 51, 54, 23, 5],
          },
        },
        {
          id: "sunset-m-book",
          dev: "m",
          name: "BOOK NOW block",
          y0: 0.4,
          y1: 0.75,
          x0: 0.02,
          x1: 0.98,
          of: ["sunset-m1"],
          r: [
            [
              "Definite",
              "One BOOK NOW, with price and cancellation on the same screen.",
            ],
          ],
          comb: { C: 1, O: 1, M: 1 },
          combt: 3,
          comb_state: "reviewed",
        },
      ],
      pfx: null,
      weak: {
        d: [
          "Lead with the deck and the evening, and move the legal note away from BOOK NOW.",
          "Put the price, a cancellation note and the extras next to BOOK NOW.",
        ],
        m: [
          "One BOOK NOW, with the price and the cancellation note.\n| Today two identical buttons sit one above the other.",
        ],
      },
      cavg: {
        d: { C: 2.0, O: 1.0, M: 1.0, t: 4.0, n: 1, cc: 1 },
        m: { C: 1.0, O: 1.0, M: 1.0, t: 3.0, n: 1, cc: 1 },
      },
      cs: {
        d: {
          score: 55,
          label: "Average",
          names: CS_NAMES,
          axes: [55, 43, 45, 79, 50, 21, 47, 36, 26, 51, 54, 23, 5],
          ids: ["cs_sunset_1"],
        },
      },
      fn: {
        d: [
          [
            1,
            "Suite page At a Glance list, captured 16 Nov 2026: 100 m², up to 3 adults, lagoon-facing, king bed.",
          ],
          [
            2,
            "Industry note: published hotel averages put strong checkout completion near 20% or higher.",
          ],
        ],
        m: [
          [
            1,
            "Suite mobile capture 16 Nov 2026: duplicate BOOK NOW without price.",
          ],
        ],
      },
    },
  },
  exec_summary: {
    question: "Where is the site losing direct bookings, and why?",
    key_findings: [
      {
        text: "About 82% of sessions that reach checkout never complete a booking, against a published hotel average near 80%.",
        fn: ["ga-checkout", "bench-abandon"],
      },
      {
        text: "Home landings bounce about 29%, better than a hotel average near 36%, so the leak is later in the path.",
        fn: ["ga-landing", "bench-bounce"],
      },
      {
        text: "Room pages hide price and cancellation next to BOOK NOW, so guests leave to compare on OTAs.",
        fn: ["capture-room"],
      },
    ],
    leads: [
      {
        text: "Home bounce is better than the hotel average, so the brand story can still hold attention.",
        fn: ["ga-landing", "bench-bounce"],
      },
      {
        text: "Creative Score clarity on room pages is already a relative strength when the facts sit nearby.",
        fn: ["cs-room"],
      },
    ],
    top_actions: [1, 2, 3, 4],
  },
  action_plan: [
    {
      rank: 1,
      action:
        "Shorten checkout to a two-step form, with perks as tick boxes and trust cues next to Continue.",
      evidence: "Checkout sessions to confirmations stay well under a 20%+ good line.",
      source: "GA 12 mo",
      comb: "Physical capability; reflective motivation (payment trust)",
      impact: "High",
      effort: "Medium",
    },
    {
      rank: 2,
      action:
        "On room pages, put from-price, taxes and cancellation next to one BOOK NOW.",
      evidence: "Room pages send guests away before the engine.",
      source: "Capture + GA paths",
      comb: "Psychological capability; automatic motivation",
      impact: "High",
      effort: "Low",
    },
    {
      rank: 3,
      action:
        "Rebuild Home first view around an evening lagoon story with consent delayed.",
      evidence: "Consent and chat compete with BOOK NOW on first paint.",
      source: "Capture 16 Nov 2026",
      comb: "Opportunity; reflective motivation",
      impact: "Medium",
      effort: "Medium",
    },
    {
      rank: 4,
      action: "Cut competing CTAs on Home so offer cards do not outrank BOOK NOW.",
      evidence: "Three offer buttons sit beside the main ask.",
      source: "Capture 16 Nov 2026",
      comb: "Opportunity",
      impact: "Medium",
      effort: "Low",
    },
  ],
  footnote_sources: {
    "ga-checkout": {
      key: "ga-checkout",
      text: "GA4 12 Nov 2025 to 12 Nov 2026: checkout sessions versus booking confirmations (anonymised fixture figures).",
    },
    "bench-abandon": {
      key: "bench-abandon",
      text: "Published hotel average near 80% checkout abandonment (industry benchmark pack, fact-check confirmed).",
    },
    "ga-landing": {
      key: "ga-landing",
      text: "GA4 12 mo: Home landing bounce rate (anonymised fixture figures).",
    },
    "bench-bounce": {
      key: "bench-bounce",
      text: "Published hotel average bounce near 36% (industry benchmark pack).",
    },
    "capture-room": {
      key: "capture-room",
      text: "Room page captures 16 Nov 2026: BOOK NOW without price or cancellation.",
    },
    "cs-room": {
      key: "cs-room",
      text: "Creative Score Standard on suite first view, clarity axis relative strength.",
    },
  },
  chapters: [
    { id: "cover", title: "Cover", read_min: 1 },
    { id: "objectives", title: "Objectives", read_min: 2 },
    {
      id: "exec",
      title: "What we found, in brief",
      read_min: 2,
      evidence_min: 8,
    },
    { id: "fourc", title: "Your customer: the four Cs", read_min: 4 },
    { id: "traffic", title: "Traffic map", read_min: 3 },
    { id: "approach", title: "Approach: page sets and COM-B", read_min: 3 },
    { id: "set-a", title: "Set A · Entry and inspiration", read_min: 6 },
    { id: "set-c", title: "Set C · Choosing a room", read_min: 6 },
    { id: "mobile", title: "Mobile: the headline theme", read_min: 3 },
    { id: "gaps", title: "Data gaps and judgement calls", read_min: 2 },
    { id: "sources", title: "Sources and method", read_min: 2 },
    { id: "actions", title: "Action plan", read_min: 3 },
  ],
  data_gaps: [
    "ContentSquare not connected (tier 1): measured heatmaps and map overlay are off.",
    "Mobile Creative Score on the suite page was not run in this fixture.",
    "Booking engine pages are out of fixture scope; Phase 1 expands capture to payment screen only.",
    "Competitor mobile comparisons hidden while incomplete.",
  ],
  sources_method: [
    "Data tier: 1 (GA connected; ContentSquare absent).",
    "Captures: desktop 1440 and mobile 390, 16 Nov 2026. Booking flow not included in this fixture.",
    "Creative Score: Standard on scored frames; radar shows axes present.",
    "Scores shown are expert or reviewed Cranial audit ratings. No inferred scores in this client build.",
    "4C customer view: expert-verified on 18 Nov 2026.",
    "Expert sign-off: 20 Nov 2026 on build fixture-build-sha-001.",
    "Timezone: Europe/London.",
  ],
  approach: {
    in_short:
      "We group pages by job, score Capability, Opportunity and Motivation, and only publish ratings an expert has reviewed.",
    comb_terms: [
      {
        term: "Capability",
        plain: "Can the guest do the next step with what is on the page?",
        analogy: "Like having the right tools on the workbench before you start.",
      },
      {
        term: "Opportunity",
        plain: "Does the page make the next step easy to see and reach?",
        analogy: "Like a clear path through a busy lobby to the desk.",
      },
      {
        term: "Motivation",
        plain: "Does the page give a reason to act now, not later on an OTA?",
        analogy: "Like smelling dinner before you choose a table.",
      },
    ],
  },
  traffic_map: {
    nodes: [
      { id: "home", set: "A", label: "Home", sessions: 42000 },
      { id: "sunset", set: "C", label: "Suite", sessions: 9000 },
      { id: "engine", set: "D", label: "Booking engine", sessions: 6000 },
    ],
    edges: [
      { from: "home", to: "sunset", weight: 0.22 },
      { from: "sunset", to: "engine", weight: 0.41 },
      { from: "home", to: "engine", weight: 0.08 },
    ],
  },
  mobile_theme: {
    in_short:
      "Phones lose the evening story under consent and duplicate BOOK NOW buttons without price.",
    headline: "Mobile research is strong; mobile booking cues are weak.",
    points: [
      "Consent fills the first screen on Home.",
      "Room teasers show empty decks.",
      "Suite pages stack two BOOK NOW buttons with no total.",
    ],
  },
  build: {
    sha: "fixture-build-sha-001",
    created_at: "2026-11-20T15:55:00Z",
    fixture: true,
  },
};
