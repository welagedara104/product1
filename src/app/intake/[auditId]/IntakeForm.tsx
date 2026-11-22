"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  emptyIntakeDraft,
  sampleIntakeAnswers,
} from "@/lib/audit/intake-fields";
import type { IntakeAnswers } from "@/lib/audit/types";

type Props = { auditId: string; initial: IntakeAnswers | null };

const SECTIONS = [
  { id: "about", title: "About the business", hint: "Section 1 of 4" },
  { id: "goals", title: "Goals", hint: "Section 2 of 4" },
  { id: "benchmarks", title: "Competitive benchmarks", hint: "Section 3 of 4" },
  { id: "tools", title: "Tools you use", hint: "Section 4 of 4" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function IntakeForm({ auditId, initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<IntakeAnswers>(
    initial ?? sampleIntakeAnswers(),
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof IntakeAnswers>(key: K, value: IntakeAnswers[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateSection(section: SectionId): string | null {
    if (section === "about") {
      if (!form.business_name.trim()) return "Business name is required.";
      try {
        // eslint-disable-next-line no-new
        new URL(form.website_url);
      } catch {
        return "Enter a valid website URL (include https://).";
      }
      if (!form.difference_from_website && !form.difference.trim()) {
        return "Say what makes them different, or tick that the website already gives it.";
      }
      return null;
    }
    if (section === "goals") {
      if (form.website_goal === "other" && !form.website_goal_other.trim()) {
        return "Type the other goal.";
      }
      return null;
    }
    if (section === "benchmarks") {
      if (!form.buy_elsewhere.trim()) {
        return "Say where people buy if not from them.";
      }
      return null;
    }
    if (section === "tools") {
      if (form.analytics_tool === "other" && !form.analytics_other_name.trim()) {
        return "Name the analytics provider.";
      }
      if (form.behaviour_tool === "other" && !form.behaviour_other_name.trim()) {
        return "Name the behaviour tool.";
      }
      return null;
    }
    return null;
  }

  function onNext() {
    const section = SECTIONS[step]!.id;
    const err = validateSection(section);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, SECTIONS.length - 1));
  }

  function onBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit() {
    const err = validateSection("tools");
    if (err) {
      setError(err);
      return;
    }
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
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const section = SECTIONS[step]!;
  const isLast = step === SECTIONS.length - 1;

  return (
    <div style={{ marginTop: "1.5rem", maxWidth: 640 }}>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
        aria-hidden
      >
        {SECTIONS.map((s, i) => (
          <span
            key={s.id}
            style={{
              height: 4,
              flex: 1,
              minWidth: 48,
              borderRadius: 2,
              background: i <= step ? "#0b3a4a" : "#d5cbb8",
            }}
          />
        ))}
      </div>

      <p style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0, color: "#5a6a75" }}>
        {section.hint}
      </p>
      <h2
        style={{
          fontFamily: "var(--font-report-display), Georgia, serif",
          fontSize: "1.55rem",
          margin: "0.35rem 0 1rem",
        }}
      >
        {section.title}
      </h2>

      <div style={{ display: "grid", gap: "1rem" }}>
        {section.id === "about" ? <AboutSection form={form} set={set} /> : null}
        {section.id === "goals" ? <GoalsSection form={form} set={set} /> : null}
        {section.id === "benchmarks" ? (
          <BenchmarksSection form={form} set={set} />
        ) : null}
        {section.id === "tools" ? <ToolsSection form={form} set={set} /> : null}
      </div>

      {error ? <p style={{ color: "#8a2a1a", marginTop: "1rem" }}>{error}</p> : null}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginTop: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {step > 0 ? (
          <button type="button" onClick={onBack} style={btnSecondary} disabled={busy}>
            Back
          </button>
        ) : null}
        {!isLast ? (
          <button type="button" onClick={onNext} style={btnPrimary}>
            Continue
          </button>
        ) : (
          <button type="button" onClick={onSubmit} disabled={busy} style={btnPrimary}>
            {busy ? "Saving…" : "Save and connect GA4"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setForm(sampleIntakeAnswers())}
          style={{ ...btnGhost, marginLeft: "auto" }}
          disabled={busy}
        >
          Load sample answers
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(emptyIntakeDraft());
            setStep(0);
            setError(null);
          }}
          style={btnGhost}
          disabled={busy}
        >
          Clear
        </button>
      </div>
    </div>
  );
}

type SetFn = <K extends keyof IntakeAnswers>(key: K, value: IntakeAnswers[K]) => void;

function AboutSection({ form, set }: { form: IntakeAnswers; set: SetFn }) {
  return (
    <>
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
          placeholder="https://"
          value={form.website_url}
          onChange={(e) => set("website_url", e.target.value)}
          style={input}
        />
      </Field>
      <Field label="What makes you different from the places buyers also consider? *">
        <WebsiteOrType
          fromWebsite={form.difference_from_website}
          onFromWebsite={(v) => set("difference_from_website", v)}
          value={form.difference}
          onValue={(v) => set("difference", v)}
          placeholder="Meaningful difference, in their words"
        />
      </Field>
      <Field label="Why do customers choose you? (testimonials / top reasons)">
        <WebsiteOrType
          fromWebsite={form.testimonials_from_website}
          onFromWebsite={(v) => set("testimonials_from_website", v)}
          value={form.testimonials}
          onValue={(v) => set("testimonials", v)}
          placeholder="Quotes or top reasons"
        />
      </Field>
      <Field label="Anything internal we won’t find online?">
        <textarea
          value={form.field_intel}
          onChange={(e) => set("field_intel", e.target.value)}
          style={{ ...input, minHeight: 72 }}
          placeholder='e.g. "Repeat guests mostly come in shoulder season"'
        />
        <span style={{ fontSize: 12, color: "#5a6a75" }}>
          We treat this as something to test, not proven. Demo tip: put{" "}
          <code>FORCE_FLAG</code> here to try the flag-once path.
        </span>
      </Field>
    </>
  );
}

function GoalsSection({ form, set }: { form: IntakeAnswers; set: SetFn }) {
  return (
    <Field label="What should the website mainly do? *">
      <div style={{ display: "grid", gap: 8 }}>
        {(
          [
            ["buy", "I want people to buy"],
            [
              "inquire",
              "I want people to inquire (lead). Buying happens elsewhere",
            ],
            ["other", "Something else"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              background: "#fff",
              border: "1px solid #d5cbb8",
              borderRadius: 8,
              padding: "0.75rem 0.9rem",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="website_goal"
              checked={form.website_goal === value}
              onChange={() => set("website_goal", value)}
              style={{ marginTop: 3 }}
            />
            <span>{label}</span>
          </label>
        ))}
        {form.website_goal === "other" ? (
          <input
            required
            value={form.website_goal_other}
            onChange={(e) => set("website_goal_other", e.target.value)}
            placeholder="Type the goal"
            style={input}
          />
        ) : null}
      </div>
    </Field>
  );
}

function BenchmarksSection({ form, set }: { form: IntakeAnswers; set: SetFn }) {
  return (
    <>
      <Field label="In your view — where do people buy if not from you? *">
        <textarea
          required
          value={form.buy_elsewhere}
          onChange={(e) => set("buy_elsewhere", e.target.value)}
          style={{ ...input, minHeight: 88 }}
        />
      </Field>
      <Field label="Which direct/indirect competitors have cool websites? (optional)">
        <textarea
          value={form.cool_competitor_sites}
          onChange={(e) => set("cool_competitor_sites", e.target.value)}
          style={{ ...input, minHeight: 72 }}
        />
      </Field>
      <Field label="Websites you wish you owned? (optional)">
        <textarea
          value={form.wish_owned_sites}
          onChange={(e) => set("wish_owned_sites", e.target.value)}
          style={{ ...input, minHeight: 72 }}
        />
      </Field>
    </>
  );
}

function ToolsSection({ form, set }: { form: IntakeAnswers; set: SetFn }) {
  return (
    <>
      <p style={{ margin: 0, color: "#3a4a55" }}>
        Which of the following tools do they currently use?
      </p>
      <Field label="Data analytics tools like Google Analytics *">
        <select
          value={form.analytics_tool}
          onChange={(e) =>
            set("analytics_tool", e.target.value as IntakeAnswers["analytics_tool"])
          }
          style={input}
        >
          <option value="ga4">GA4</option>
          <option value="other">Something else</option>
          <option value="none">I don&apos;t use</option>
        </select>
        {form.analytics_tool === "other" ? (
          <input
            required
            value={form.analytics_other_name}
            onChange={(e) => set("analytics_other_name", e.target.value)}
            placeholder="Provider name"
            style={{ ...input, marginTop: 8 }}
          />
        ) : null}
      </Field>
      <Field label="A behaviour tool like ContentSquare?">
        <select
          value={form.behaviour_tool}
          onChange={(e) =>
            set(
              "behaviour_tool",
              e.target.value as IntakeAnswers["behaviour_tool"],
            )
          }
          style={input}
        >
          <option value="contentsquare">Content Square</option>
          <option value="other">Something else</option>
          <option value="no">No</option>
        </select>
        {form.behaviour_tool === "other" ? (
          <input
            required
            value={form.behaviour_other_name}
            onChange={(e) => set("behaviour_other_name", e.target.value)}
            placeholder="Provider name"
            style={{ ...input, marginTop: 8 }}
          />
        ) : null}
      </Field>
      <Field label="Booking / checkout engine — provider name and URL">
        <input
          value={form.booking_provider}
          onChange={(e) => set("booking_provider", e.target.value)}
          placeholder="Provider name"
          style={input}
        />
        <input
          value={form.booking_engine_url}
          onChange={(e) => set("booking_engine_url", e.target.value)}
          placeholder="URL where booking starts"
          style={{ ...input, marginTop: 8 }}
        />
      </Field>
      <Field label="Is booking on a different domain from the main site?">
        <select
          value={form.booking_different_domain}
          onChange={(e) =>
            set(
              "booking_different_domain",
              e.target.value as IntakeAnswers["booking_different_domain"],
            )
          }
          style={input}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="not_sure">Not sure</option>
        </select>
      </Field>
      <Field label="Anything behind login, geo-block, or bot check that we need to see?">
        <textarea
          value={form.access_barriers}
          onChange={(e) => set("access_barriers", e.target.value)}
          style={{ ...input, minHeight: 72 }}
        />
      </Field>
    </>
  );
}

function WebsiteOrType({
  fromWebsite,
  onFromWebsite,
  value,
  onValue,
  placeholder,
}: {
  fromWebsite: boolean;
  onFromWebsite: (v: boolean) => void;
  value: string;
  onValue: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
        <input
          type="checkbox"
          checked={fromWebsite}
          onChange={(e) => onFromWebsite(e.target.checked)}
        />
        The website already gives you this
      </label>
      {!fromWebsite ? (
        <textarea
          value={value}
          onChange={(e) => onValue(e.target.value)}
          style={{ ...input, minHeight: 72 }}
          placeholder={placeholder}
        />
      ) : null}
    </div>
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
  width: "100%",
  boxSizing: "border-box" as const,
};

const btnPrimary = {
  background: "#0b3a4a",
  color: "#f4efe6",
  border: "none",
  padding: "0.85rem 1.2rem",
  fontWeight: 600,
  cursor: "pointer",
} as const;

const btnSecondary = {
  background: "#fff",
  color: "#0b3a4a",
  border: "1px solid #0b3a4a",
  padding: "0.85rem 1.2rem",
  fontWeight: 600,
  cursor: "pointer",
} as const;

const btnGhost = {
  background: "transparent",
  color: "#3a4a55",
  border: "none",
  padding: "0.5rem 0.4rem",
  fontSize: 13,
  cursor: "pointer",
  textDecoration: "underline",
} as const;
