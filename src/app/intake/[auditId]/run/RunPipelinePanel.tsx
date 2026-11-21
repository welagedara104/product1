"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuditStatus, StageRecord } from "@/lib/audit/types";

type Props = {
  auditId: string;
  status: AuditStatus;
  stages: StageRecord[];
  hasIntake: boolean;
  hasGa4: boolean;
};

export function RunPipelinePanel({
  auditId,
  status,
  stages: initialStages,
  hasIntake,
  hasGa4,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stages, setStages] = useState(initialStages);
  const [currentStatus, setCurrentStatus] = useState(status);

  async function run() {
    setBusy(true);
    setMessage("Running capture → Creative Score → COM-B…");
    try {
      const res = await fetch(`/api/audits/${auditId}/run`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Run failed");
      setMessage(data.message);
      setCurrentStatus(data.status);
      const fresh = await fetch(`/api/audits/${auditId}`);
      const job = await fresh.json();
      setStages(job.stages);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem", maxWidth: 640, display: "grid", gap: 14 }}>
      <div style={{ fontSize: 14 }}>
        Status: <strong>{currentStatus}</strong>
        {" · "}
        Intake: {hasIntake ? "yes" : "missing"}
        {" · "}
        GA4: {hasGa4 ? "yes" : "will use fixture on run"}
      </div>
      <ol style={{ margin: 0, paddingLeft: "1.2rem", fontSize: 14 }}>
        {stages.map((s) => (
          <li key={s.id} style={{ marginBottom: 6 }}>
            <strong>{s.id}</strong> — {s.status}
            {s.log?.length ? (
              <div style={{ color: "#3a4a55" }}>{s.log[s.log.length - 1]}</div>
            ) : null}
            {s.error ? (
              <div style={{ color: "#8a2a1a" }}>{s.error}</div>
            ) : null}
          </li>
        ))}
      </ol>
      <button
        type="button"
        disabled={busy || !hasIntake}
        onClick={run}
        style={{
          justifySelf: "start",
          background: hasIntake ? "#0b3a4a" : "#9aa7ae",
          color: "#f4efe6",
          border: "none",
          padding: "0.85rem 1.2rem",
          fontWeight: 600,
          cursor: busy || !hasIntake ? "not-allowed" : "pointer",
        }}
      >
        {busy ? "Running…" : "Run tier-1 pipeline"}
      </button>
      {message ? <p style={{ margin: 0 }}>{message}</p> : null}
    </div>
  );
}
