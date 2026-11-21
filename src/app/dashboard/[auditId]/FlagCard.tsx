"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Question = { id: string; prompt: string };

type Props = {
  auditId: string;
  flag: {
    status: string;
    raised_at: string;
    wording: {
      title: string;
      what_is_flagged: string[];
      questions: Question[];
      what_happens_next: string;
    } | null;
    client_responded?: boolean;
    history_line?: string;
    resolved_at?: string | null;
  };
};

export function FlagCard({ auditId, flag }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [requestCall, setRequestCall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (flag.status === "resolved") {
    return (
      <div
        data-testid="flag-history"
        style={{
          marginTop: "1rem",
          padding: "0.85rem 1rem",
          background: "#e8f0ec",
          border: "1px solid #b7cfc0",
          borderRadius: 10,
          fontSize: 14,
        }}
      >
        {flag.history_line ?? "Customer view verified by a Cranial expert."}
      </div>
    );
  }

  if (flag.status === "pending_wording") {
    return (
      <div
        data-testid="flag-pending-wording"
        style={{
          marginTop: "1rem",
          padding: "1rem 1.1rem",
          background: "#fff8e8",
          border: "1px solid #e0c98a",
          borderRadius: 12,
        }}
      >
        <strong>We need your view on your customer</strong>
        <p style={{ margin: "0.5rem 0 0", fontSize: 14, color: "#3a4a55" }}>
          A Cranial expert is preparing the question. Your site capture keeps
          running in the meantime.
        </p>
      </div>
    );
  }

  if (flag.status === "awaiting_expert" || flag.client_responded) {
    return (
      <div
        data-testid="flag-awaiting-expert"
        style={{
          marginTop: "1rem",
          padding: "1rem 1.1rem",
          background: "#eef4f7",
          border: "1px solid #b8c9d4",
          borderRadius: 12,
        }}
      >
        <strong>Thanks, an expert is reviewing your answer</strong>
        <p style={{ margin: "0.5rem 0 0", fontSize: 14, color: "#3a4a55" }}>
          Diagnosis waits for confirmation. Capture and scoring keep going.
        </p>
      </div>
    );
  }

  if (!flag.wording) return null;

  async function send() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/audits/${auditId}/flag/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          notes,
          request_call: requestCall,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send");
      setMessage(data.message);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-testid="flag-card"
      style={{
        marginTop: "1rem",
        padding: "1.15rem 1.2rem",
        background: "#fff6e9",
        border: "2px solid #c9852a",
        borderRadius: 12,
        display: "grid",
        gap: 12,
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: "1.15rem" }}>{flag.wording.title}</h2>
        <p style={{ margin: "0.35rem 0 0", fontSize: 13, color: "#5a4a30" }}>
          Flagged on {flag.raised_at.slice(0, 10)}
        </p>
      </div>

      <div>
        <strong style={{ fontSize: 13 }}>What is flagged</strong>
        <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.1rem", fontSize: 14 }}>
          {flag.wording.what_is_flagged.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <strong style={{ fontSize: 13 }}>What we need from you</strong>
        {flag.wording.questions.map((q) => (
          <label key={q.id} style={{ display: "grid", gap: 4, fontSize: 14 }}>
            <span>{q.prompt}</span>
            <textarea
              rows={2}
              value={answers[q.id] ?? ""}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
              }
              style={{
                width: "100%",
                padding: "0.55rem 0.65rem",
                border: "1px solid #d5cbb8",
                borderRadius: 8,
                font: "inherit",
              }}
            />
          </label>
        ))}
        <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
          <span>Anything else? (optional)</span>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.65rem",
              border: "1px solid #d5cbb8",
              borderRadius: 8,
              font: "inherit",
            }}
          />
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={requestCall}
            onChange={(e) => setRequestCall(e.target.checked)}
          />
          Book a short call instead
        </label>
      </div>

      <p style={{ margin: 0, fontSize: 14, color: "#3a4a55" }}>
        {flag.wording.what_happens_next}
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={send}
        data-testid="flag-send"
        style={{
          justifySelf: "start",
          background: "#0b3a4a",
          color: "#f4efe6",
          border: "none",
          padding: "0.7rem 1.1rem",
          fontWeight: 600,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Sending…" : "Send my answer"}
      </button>
      {message ? <p style={{ margin: 0, fontSize: 14 }}>{message}</p> : null}
    </section>
  );
}
