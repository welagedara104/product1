import type { IntakeAnswers } from "@/lib/audit/types";

/** Default capture targets until sitemap propose exists. */
export const DEFAULT_CAPTURE_PAGES = "/demo-site\n/demo-site/book";

/** Why-choose / meaningful difference text for research helpers. */
export function intakeDifference(intake: IntakeAnswers): string {
  if (intake.why_choose_from_website) return "The website already gives you this";
  return intake.why_choose.trim() || "Not provided";
}

export function intakeWhyChoose(intake: IntakeAnswers): string {
  return intakeDifference(intake);
}

/** Competitive alternatives — used where pipeline used to read competitors. */
export function intakeCompetitors(intake: IntakeAnswers): string {
  return [intake.buy_elsewhere, intake.cool_competitor_sites, intake.wish_owned_sites]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("; ");
}

/** Primary customer/hypothesis signal. */
export function intakeCustomerView(intake: IntakeAnswers): string {
  return intake.buy_elsewhere.trim();
}

export function intakeWhyNot(intake: IntakeAnswers): string {
  const parts = [intake.buy_elsewhere, intake.field_intel]
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.join("; ") || "Not provided";
}

export function intakeWhatYouSell(intake: IntakeAnswers): string {
  return "From website (not asked in intake)";
}

export function intakeMarket(intake: IntakeAnswers): string {
  return intake.field_intel.trim() || "From website (not asked in intake)";
}

export function intakeGoalLabel(intake: IntakeAnswers): string {
  if (intake.website_goal === "buy") return "I want people to buy";
  if (intake.website_goal === "inquire") {
    return "I want people to inquire (lead). Buying happens elsewhere";
  }
  return intake.website_goal_other.trim() || "Something else";
}

export function intakeGoalShort(intake: IntakeAnswers): string {
  if (intake.website_goal === "buy") return "direct purchases";
  if (intake.website_goal === "inquire") return "enquiries";
  return "conversions";
}

export function intakeWantsGa4(intake: IntakeAnswers): boolean {
  return intake.analytics_tool === "ga4";
}

/** Stub recipients — client does not fill; Cranial team runs intake. */
export function intakeEmailRecipients(_intake: IntakeAnswers): string[] {
  return ["team@cranial.local"];
}

export function intakeForceFlagBlob(intake: IntakeAnswers): string {
  return [
    intake.buy_elsewhere,
    intake.field_intel,
    intake.why_choose,
    intake.cool_competitor_sites,
    intake.wish_owned_sites,
  ].join(" ");
}

export function emptyIntakeDraft(): IntakeAnswers {
  return {
    business_name: "",
    website_url: "",
    why_choose_from_website: false,
    why_choose: "",
    field_intel: "",
    website_goal: "buy",
    website_goal_other: "",
    buy_elsewhere: "",
    cool_competitor_sites: "",
    wish_owned_sites: "",
    analytics_tool: "ga4",
    analytics_other_name: "",
    behaviour_tool: "no",
    behaviour_other_name: "",
    booking_provider: "",
    booking_engine_url: "",
    booking_different_domain: "not_sure",
    access_barriers: "",
  };
}

/** Sample answers for demos / Try Live. */
export function sampleIntakeAnswers(): IntakeAnswers {
  return {
    business_name: "Coral Reach Resort",
    website_url: "https://example.com",
    why_choose_from_website: false,
    why_choose: "Quiet lagoon evenings with clear totals before payment",
    field_intel: "Repeat guests mostly come in shoulder season",
    website_goal: "buy",
    website_goal_other: "",
    buy_elsewhere: "Major OTAs and nearby lagoon resorts",
    cool_competitor_sites: "OTA A booking flow; Lagoon B homepage",
    wish_owned_sites: "Apple.com product pages; Airbnb listing clarity",
    analytics_tool: "ga4",
    analytics_other_name: "",
    behaviour_tool: "no",
    behaviour_other_name: "",
    booking_provider: "Demo engine",
    booking_engine_url: "/demo-site/book",
    booking_different_domain: "no",
    access_barriers: "",
  };
}
