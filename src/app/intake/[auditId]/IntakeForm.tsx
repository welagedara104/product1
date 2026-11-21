"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { IntakeAnswers } from "@/lib/audit/types";

const defaults: IntakeAnswers = {
  business_name: "Coral Reach Resort",
  website_url: "https://example.com",
  market: "UK and EU long-haul leisure",
  what_you_sell: "Lagoon resort stays for couples",
  difference: "Quiet lagoon evenings with clear totals before payment",
  goal_o1: "direct_bookings",
  goal_detail: "Raise direct share without discounting into OTAs",
  customer_opinion:
    "Couples planning a once-a-year long-haul stay who need to see the evening and the total before they commit",
  why_not_book: "Total price unclear; checkout feels long; OTAs look safer",
  competitors: "Nearby lagoon resorts, major OTAs",
  pages: "/demo-site\n/demo-site/book",
  devices: "both",
  report_recipients: "owner@coralreach.example",
  consent: true,
  ga4_status: "yes_connect",
  booking_engine_url: "/demo-site/book",
  capture_ok_to_payment: true,
};

type Props = { auditId: string; initial: IntakeAnswers | null };

export function IntakeForm({ auditId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<IntakeAnswers>(initial ?? defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof IntakeAnswers>(key: K, value: IntakeAnswers[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/audits/${auditId}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push(`/intake/${auditId}/ga4`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        marginTop: "1.5rem",
        maxWidth: 640,
        display: "grid",
        gap: "1rem",
      }}
    >
      <Field label="Business name *">
        <input
          required
          value={form.business_name}
          onChange={(e) => set("business_name", e.target.value)}
          style={input}
        />
      </Field>
      <Field label="Main website URL *">
        <input
          required
          type="url"
          value={form.website_url}
          onChange={(e) => set("website_url", e.target.value)}
          style={input}
        />
      </Field>
      <Field label="Where most buyers live *">
        <input
          required
          value={form.market}
          onChange={(e) => set("market", e.target.value)}
          style={input}
        />
      </Field>
      <Field label="What do you sell, and to whom? *">
        <textarea
          required
          value={form.what_you_sell}
          onChange={(e) => set("what_you_sell", e.target.value)}
          style={{ ...input, minHeight: 72 }}
        />
      </Field>
      <Field label="What makes you different? *">
        <textarea
          required
          value={form.difference}
          onChange={(e) => set("difference", e.target.value)}
          style={{ ...input, minHeight: 72 }}
        />
      </Field>
      <Field label="Commercial goal (O1) *">
        <select
          value={form.goal_o1}
          onChange={(e) =>
            set("goal_o1", e.target.value as IntakeAnswers["goal_o1"])
          }
          style={input}
        >
          <option value="direct_bookings">Direct bookings</option>
          <option value="enquiries">Enquiries</option>
          <option value="sales">Sales</option>
          <option value="sign_ups">Sign-ups</option>
          <option value="other">Other</option>
        </select>
      </Field>
      <Field label="Goal detail *">
        <input
          required
          value={form.goal_detail}
          onChange={(e) => set("goal_detail", e.target.value)}
          style={input}
        />
      </Field>
      <Field label="Who do you believe books, and why? *">
        <textarea
          required
          value={form.customer_opinion}
          onChange={(e) => set("customer_opinion", e.target.value)}
          style={{ ...input, minHeight: 88 }}
        />
        <span style={{ fontSize: 12, color: "#5a6a75" }}>
          Demo tip: put <code>FORCE_FLAG</code> in this answer to try the
          flag-once path (dashboard card + stub email).
        </span>
      </Field>
      <Field label="Why do visitors not book? (up to three reasons) *">
        <textarea
          required
          value={form.why_not_book}
          onChange={(e) => set("why_not_book", e.target.value)}
          style={{ ...input, minHeight: 72 }}
        />
      </Field>
      <Field label="Competitors (3–6 names or links) *">
        <textarea
          required
          value={form.competitors}
          onChange={(e) => set("competitors", e.target.value)}
          style={{ ...input, minHeight: 64 }}
        />
      </Field>
      <Field label="Pages that matter most (URLs, one per line) *">
        <textarea
          required
          value={form.pages}
          onChange={(e) => set("pages", e.target.value)}
          style={{ ...input, minHeight: 72 }}
        />
      </Field>
      <Field label="Devices *">
        <select
          value={form.devices}
          onChange={(e) =>
            set("devices", e.target.value as IntakeAnswers["devices"])
          }
          style={input}
        >
          <option value="both">Desktop and mobile</option>
          <option value="desktop">Desktop only</option>
          <option value="mobile">Mobile only</option>
        </select>
      </Field>
      <Field label="GA4 status *">
        <select
          value={form.ga4_status}
          onChange={(e) =>
            set("ga4_status", e.target.value as IntakeAnswers["ga4_status"])
          }
          style={input}
        >
          <option value="yes_connect">Yes, I can connect it</option>
          <option value="yes_colleague">Yes, a colleague must connect it</option>
          <option value="no">No</option>
          <option value="not_sure">Not sure</option>
        </select>
      </Field>
      <Field label="Report recipients (names / emails) *">
        <input
          required
          value={form.report_recipients}
          onChange={(e) => set("report_recipients", e.target.value)}
          style={input}
        />
      </Field>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={form.consent === true}
          onChange={(e) => {
            if (e.target.checked) set("consent", true);
          }}
          required
        />
        <span style={{ fontSize: 14 }}>
          I agree you may capture our public pages and aggregate analytics only. No
          customer personal data. *
        </span>
      </label>
      {error ? <p style={{ color: "#8a2a1a" }}>{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        style={{
          background: "#0b3a4a",
          color: "#f4efe6",
          border: "none",
          padding: "0.85rem 1.2rem",
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
          justifySelf: "start",
        }}
      >
        {busy ? "Saving…" : "Save and connect GA4"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 14 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}

const input = {
  padding: "0.65rem 0.75rem",
  border: "1px solid #d5cbb8",
  borderRadius: 6,
  fontSize: 15,
  fontFamily: "inherit",
  background: "#fff",
} as const;
