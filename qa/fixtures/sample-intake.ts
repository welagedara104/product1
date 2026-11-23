/** Shared locked-intake payload for Playwright / unit fixtures. */
export const sampleIntakePayload = {
  business_name: "Coral Reach Resort",
  website_url: "https://example.com",
  why_choose_from_website: false,
  why_choose: "Clear evenings and totals",
  field_intel: "Repeat guests mostly come in shoulder season",
  website_goal: "buy" as const,
  website_goal_other: "",
  buy_elsewhere: "Major OTAs and nearby lagoon resorts",
  cool_competitor_sites: "OTA A; Lagoon B",
  wish_owned_sites: "Airbnb listing clarity",
  analytics_tool: "ga4" as const,
  analytics_other_name: "",
  behaviour_tool: "no" as const,
  behaviour_other_name: "",
  booking_provider: "Demo engine",
  booking_engine_url: "/demo-site/book",
  booking_different_domain: "no" as const,
  access_barriers: "",
};

export const forceFlagIntakePayload = {
  ...sampleIntakePayload,
  field_intel:
    "FORCE_FLAG: first-visit couples only, ignore repeat guests",
};
