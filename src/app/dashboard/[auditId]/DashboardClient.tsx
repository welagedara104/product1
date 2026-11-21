"use client";

import { useCallback, useEffect, useState } from "react";
import { FlagCard } from "./FlagCard";

type DashPayload = {
  audit_id: string;
  status: string;
  business_name: string | null;
  tier: number;
  overall_eta: string;
  current_activity: string;
  what_happens_next: string;
  needs_input: boolean;
  stages: Array<{
    id: string;
    name: string;
    status_label: string;
    status: string;
    eta: string;
    activity: string | null;
  }>;
  flag: {
    status: string;
    raised_at: string;
    wording: {
      title: string;
      what_is_flagged: string[];
      questions: Array<{ id: string; prompt: string }>;
      what_happens_next: string;
    } | null;
    client_responded?: boolean;
    history_line?: string;
    resolved_at?: string | null;
  } | null;
  published_report_id: string | null;
};

type Props = { auditId: string; initial: DashPayload };

export function DashboardClient({ auditId, initial }: Props) {
  const [data, setData] = useState(initial);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/audits/${auditId}/dashboard`);
    if (!res.ok) return;
    setData(await res.json());
  }, [auditId]);

  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <div style={{ maxWidth: 720 }}>
      {data.needs_input ? (
        <p
          data-testid="needs-input-banner"
          style={{
            margin: "1rem 0 0",
            padding: "0.65rem 0.9rem",
            background: "#fff0e4",
            border: "1px solid #e0a070",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Needs your input
        </p>
      ) : null}

      {data.flag ? <FlagCard auditId={auditId} flag={data.flag} /> : null}

      <section style={{ marginTop: "1.5rem" }}>
        <p style={{ margin: 0, fontSize: 14, color: "#3a4a55" }}>
          Now: <strong>{data.current_activity}</strong>
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: 14, color: "#3a4a55" }}>
          Overall ETA: {data.overall_eta}
        </p>
        <p style={{ margin: "0.35rem 0 0", fontSize: 14, color: "#3a4a55" }}>
          What happens next: {data.what_happens_next}
        </p>
      </section>

      <ol
        data-testid="dashboard-stages"
        style={{
          margin: "1.5rem 0 0",
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 8,
        }}
      >
        {data.stages.map((s) => (
          <li
            key={s.id}
            data-stage={s.id}
            style={{
              background: "#fff",
              border: "1px solid #d5cbb8",
              borderRadius: 10,
              padding: "0.75rem 0.9rem",
              display: "grid",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: 14 }}>
                {s.id}. {s.name}
              </strong>
              <span
                data-testid={`stage-chip-${s.id}`}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "0.2rem 0.5rem",
                  borderRadius: 6,
                  background: chipBg(s.status),
                  color: "#12212b",
                }}
              >
                {s.status_label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#5a6a75" }}>ETA: {s.eta}</div>
            {s.activity ? (
              <div style={{ fontSize: 13, color: "#3a4a55" }}>{s.activity}</div>
            ) : null}
          </li>
        ))}
      </ol>

      {data.published_report_id ? (
        <p style={{ marginTop: "1.5rem", fontSize: 14 }}>
          Report ready:{" "}
          <a href={`/report/${data.published_report_id}`}>
            {data.published_report_id}
          </a>
        </p>
      ) : null}

      <p style={{ marginTop: "1rem", fontSize: 12, color: "#7a8a95" }}>
        Status: {data.status} · tier {data.tier} · refreshes every few seconds.
        Draft scores and 4C research stay hidden until expert sign-off.
      </p>
    </div>
  );
}

function chipBg(status: string): string {
  switch (status) {
    case "done":
      return "#d8ebe0";
    case "running":
      return "#d6e6f2";
    case "flagged":
    case "needs_input":
      return "#f7e0c4";
    case "failed":
      return "#f0d0c8";
    case "paused_expert":
      return "#e4e0f2";
    default:
      return "#eeeae2";
  }
}
