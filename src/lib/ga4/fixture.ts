/** Tier-1 GA4-shaped fixture when OAuth credentials are absent. */
export function ga4FixtureSummary(businessName: string) {
  return {
    property_id: "properties/fixture-tier1-001",
    property_name: `${businessName} · GA4 fixture`,
    window: "Last 12 months (fixture)",
    landing_pages: [
      { path: "/", sessions: 18420, bounce_rate: 0.41, conversions: 312 },
      { path: "/rooms", sessions: 6210, bounce_rate: 0.36, conversions: 188 },
      { path: "/book", sessions: 4102, bounce_rate: 0.22, conversions: 401 },
      { path: "/book/payment", sessions: 980, bounce_rate: 0.11, conversions: 0 },
    ],
    device_split: { desktop: 0.58, mobile: 0.42 },
  };
}
