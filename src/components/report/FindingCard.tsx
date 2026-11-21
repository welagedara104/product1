"use client";

import type { Finding } from "@/lib/report/types";
import { parseFindingCopy } from "@/lib/report/parse-copy";

export function FindingCard({
  finding,
  onClose,
  onOpenSection,
}: {
  finding: Finding;
  onClose: () => void;
  onOpenSection?: (secId: string) => void;
}) {
  const { thesis, bullets } = parseFindingCopy(finding.f);
  const isFriction = finding.cat === "C" || finding.cat === "O";
  const label =
    finding.cat === "M"
      ? "Lack of motivation"
      : finding.cat === "C"
        ? "Friction · Capability"
        : "Friction · Opportunity";

  return (
    <aside
      className="finding-card"
      data-testid={`finding-card-${finding.id}`}
      role="dialog"
      aria-label={thesis}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: isFriction ? "var(--friction)" : "var(--motivation)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <h3 style={{ fontSize: "1.05rem", margin: "0 0 0.5rem", fontWeight: 700 }}>
        {thesis}
      </h3>
      {bullets.length > 0 && (
        <ul style={{ margin: "0 0 0.75rem", paddingLeft: "1.1rem" }}>
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {finding.b === 1 && finding.r.length > 0 && (
        <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
          {finding.r.map(([kind, text]) => (
            <div
              key={`${kind}-${text}`}
              style={{
                background: kind === "Definite" ? "var(--ok-soft)" : "var(--paper-2)",
                borderRadius: 6,
                padding: "0.5rem 0.65rem",
                fontSize: 13,
              }}
            >
              <strong>{kind}:</strong> {text}
            </div>
          ))}
        </div>
      )}
      {finding.sec && finding.b !== 1 && (
        <button
          type="button"
          onClick={() => onOpenSection?.(finding.sec!)}
          style={{
            border: 0,
            background: "transparent",
            color: "var(--accent)",
            fontWeight: 600,
            padding: 0,
            cursor: "pointer",
            marginBottom: 8,
          }}
        >
          Fix: see Section review →
        </button>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} data-testid="close-finding">
          Close
        </button>
      </div>
    </aside>
  );
}
