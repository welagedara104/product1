"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuditJob, AuditStatus } from "@/lib/audit/types";

type Props = {
  auditId: string;
  status: AuditStatus;
  inferredCount: number;
  publishedReportId: string | null;
  publishAttempts: AuditJob["publish_attempts"];
};

export function ExpertActions({
  auditId,
  status,
  inferredCount,
  publishedReportId,
  publishAttempts,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(publishAttempts);
  const [reportId, setReportId] = useState(publishedReportId);

  async function call(path: string, body?: object, label?: string) {
    setBusy(label || path);
    setMessage(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setMessage(
        data.message ||
          data.error ||
          (Array.isArray(data.errors) ? data.errors.join("; ") : "Failed"),
      );
      if (data.errors) {
        setAttempts((prev) => [
          ...prev,
          {
            at: new Date().toISOString(),
            ok: false,
            errors: data.errors,
            layer: data.layer || "publisher",
          },
        ]);
      }
      router.refresh();
      return;
    }
    setMessage(data.message || "OK");
    if (data.report_id) setReportId(data.report_id);
    router.refresh();
  }

  return (
    <section
      style={{
        marginTop: "1.5rem",
        maxWidth: 640,
        display: "grid",
        gap: 12,
        background: "#fff",
        border: "1px solid #d5cbb8",
        borderRadius: 10,
        padding: "1.25rem",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Hard gate actions</h2>
      <p style={{ margin: 0, fontSize: 14, color: "#3a4a55" }}>
        1) Mark all scores reviewed → 2) Sign off this build → 3) Publish privately.
        Publish without sign-off fails at workflow, publisher and hosting.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          disabled={Boolean(busy) || inferredCount === 0}
          onClick={() => call(`/api/audits/${auditId}/expert/review`, {}, "review")}
          style={btn}
        >
          {busy === "review" ? "…" : "Mark all reviewed"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || inferredCount > 0}
          onClick={() => call(`/api/audits/${auditId}/expert/signoff`, {}, "signoff")}
          style={btn}
        >
          {busy === "signoff" ? "…" : "Sign off report"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || status === "published"}
          onClick={() => call(`/api/audits/${auditId}/expert/publish`, {}, "publish")}
          style={btn}
        >
          {busy === "publish" ? "…" : "Publish (expert)"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() =>
            call(
              `/api/audits/${auditId}/expert/publish`,
              { as_role: "operator" },
              "operator",
            )
          }
          style={{ ...btn, background: "#6a4a3a" }}
        >
          {busy === "operator" ? "…" : "Try publish as operator (should fail)"}
        </button>
      </div>
      {message ? <p style={{ margin: 0, fontSize: 14 }}>{message}</p> : null}
      {reportId ? (
        <p style={{ margin: 0, fontSize: 14 }}>
          Client report:{" "}
          <Link href={`/report/${reportId}`}>{reportId}</Link> (password gated)
        </p>
      ) : null}
      {attempts.length ? (
        <div style={{ fontSize: 13 }}>
          <strong>Publish attempts</strong>
          <ul>
            {attempts.slice(-5).map((a, i) => (
              <li key={`${a.at}-${i}`}>
                {a.at.slice(11, 19)} · {a.layer} · {a.ok ? "ok" : a.errors.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const btn = {
  background: "#0b3a4a",
  color: "#f4efe6",
  border: "none",
  padding: "0.65rem 0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
} as const;
