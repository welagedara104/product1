"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FlagRecord, FourCResearch } from "@/lib/fourc/types";

type Props = {
  auditId: string;
  flag: FlagRecord | null;
  fourc: FourCResearch | null;
  customerViewSummary: string | null;
};

export function ExpertFlagPanel({
  auditId,
  flag,
  fourc,
  customerViewSummary,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState(
    customerViewSummary ||
      flag?.client_response?.answers?.q_who ||
      "",
  );
  const [note, setNote] = useState("");

  if (!flag) {
    return (
      <section style={box}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>4C flag queue</h2>
        <p style={{ margin: 0, fontSize: 14, color: "#3a4a55" }}>
          No flag on this audit
          {fourc?.validated
            ? " — customer view validated automatically."
            : fourc
              ? "."
              : " (run the pipeline first)."}
        </p>
      </section>
    );
  }

  async function call(path: string, body: object, label: string) {
    setBusy(label);
    setMessage(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(data.error || "Failed");
      return;
    }
    setMessage(data.message || "OK");
    router.refresh();
  }

  return (
    <section style={box} data-testid="expert-flag-panel">
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>4C flag queue</h2>
      <p style={{ margin: 0, fontSize: 14, color: "#3a4a55" }}>
        Status: <strong>{flag.status}</strong> · raised once on{" "}
        {flag.raised_at.slice(0, 10)} · never flag twice
      </p>

      <div style={{ fontSize: 13 }}>
        <strong>Failed checks</strong>
        <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
          {flag.failed_checks.map((c) => (
            <li key={c.check}>
              {c.check}: {c.result} — {c.plain_words}
            </li>
          ))}
        </ul>
      </div>

      {flag.client_response ? (
        <div style={{ fontSize: 13 }}>
          <strong>Client response</strong>
          <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem" }}>
            {Object.entries(flag.client_response.answers).map(([k, v]) => (
              <li key={k}>
                <em>{k}</em>: {v || "(empty)"}
              </li>
            ))}
          </ul>
          {flag.client_response.notes ? (
            <p style={{ margin: "0.35rem 0 0" }}>
              Notes: {flag.client_response.notes}
            </p>
          ) : null}
        </div>
      ) : null}

      {flag.status === "pending_wording" ? (
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            call(`/api/audits/${auditId}/flag/approve`, {}, "approve")
          }
          style={btn}
        >
          {busy === "approve" ? "…" : "Approve wording + send stub email"}
        </button>
      ) : null}

      {flag.status === "awaiting_expert" ||
      flag.status === "awaiting_client" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
            Customer view the audit will use
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              style={input}
            />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
            Note (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={input}
            />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              disabled={Boolean(busy) || !summary.trim()}
              onClick={() =>
                call(
                  `/api/audits/${auditId}/flag/resolve`,
                  {
                    kind: "confirmed",
                    customer_view_summary: summary,
                    note,
                  },
                  "confirm",
                )
              }
              style={btn}
            >
              {busy === "confirm" ? "…" : "Confirm client's view"}
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || !summary.trim()}
              onClick={() =>
                call(
                  `/api/audits/${auditId}/flag/resolve`,
                  {
                    kind: "revised",
                    customer_view_summary: summary,
                    note,
                  },
                  "revise",
                )
              }
              style={{ ...btn, background: "#4a3a2a" }}
            >
              {busy === "revise" ? "…" : "Revise customer view"}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#5a6a75" }}>
            You can resolve without a client reply (decide from evidence). After
            resolve, Steps 5–6 and diagnosis run. No second flag.
          </p>
        </div>
      ) : null}

      {flag.status === "resolved" ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          Resolved ({flag.resolution?.kind}) by {flag.resolution?.by} on{" "}
          {flag.resolution?.at?.slice(0, 10)}. View:{" "}
          {flag.resolution?.customer_view_summary}
        </p>
      ) : null}

      {message ? <p style={{ margin: 0, fontSize: 14 }}>{message}</p> : null}
    </section>
  );
}

const box = {
  marginTop: "1.5rem",
  maxWidth: 640,
  display: "grid",
  gap: 12,
  background: "#fff",
  border: "1px solid #d5cbb8",
  borderRadius: 10,
  padding: "1.25rem",
} as const;

const btn = {
  background: "#0b3a4a",
  color: "#f4efe6",
  border: "none",
  padding: "0.65rem 0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
  justifySelf: "start",
} as const;

const input = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  border: "1px solid #d5cbb8",
  borderRadius: 8,
  font: "inherit",
} as const;
