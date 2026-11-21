"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StartAuditButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/audits", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start");
      router.push(`/intake/${data.audit_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        style={{
          marginTop: "1.5rem",
          background: "#0b3a4a",
          color: "#f4efe6",
          border: "none",
          padding: "0.9rem 1.4rem",
          fontSize: 16,
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Starting…" : "Start intake"}
      </button>
      {error ? (
        <p style={{ color: "#8a2a1a", marginTop: 8 }}>{error}</p>
      ) : null}
    </div>
  );
}
