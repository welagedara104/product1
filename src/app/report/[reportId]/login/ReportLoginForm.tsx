"use client";

import { FormEvent, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export function ReportLoginForm() {
  const params = useParams<{ reportId: string }>();
  const search = useSearchParams();
  const reportId = decodeURIComponent(params.reportId);
  const next = search.get("next") || `/report/${reportId}`;

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/report-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error || "Could not unlock report");
        setPending(false);
        return;
      }
      // Full navigation so the access cookie is present on the next document request.
      window.location.assign(next);
    } catch {
      setError("Network error");
      setPending(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        background:
          "radial-gradient(900px 500px at 20% 0%, #e7f3ef, transparent), #f7f4ef",
        color: "#12212b",
        fontFamily: "Georgia, serif",
      }}
    >
      <form
        onSubmit={onSubmit}
        data-testid="report-login"
        style={{
          width: "min(420px, 100%)",
          background: "#fff",
          border: "1px solid #d5cbb8",
          borderRadius: 12,
          padding: "1.5rem",
          boxShadow: "0 12px 40px rgba(18,33,43,0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "system-ui,sans-serif",
          }}
        >
          Private report
        </p>
        <h1 style={{ margin: "0.4rem 0 0.75rem", fontSize: "1.7rem" }}>
          Unlock to continue
        </h1>
        <p
          style={{
            fontFamily: "system-ui,sans-serif",
            fontSize: 14,
            color: "#3a4a55",
          }}
        >
          This audit is noindex and password-gated. It is not a public URL.
        </p>
        <label
          style={{
            display: "grid",
            gap: 6,
            fontFamily: "system-ui,sans-serif",
            fontSize: 14,
            marginTop: 16,
          }}
        >
          Access password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="report-password"
            required
            style={{
              border: "1px solid #d5cbb8",
              borderRadius: 8,
              padding: "0.65rem 0.75rem",
              fontSize: 16,
            }}
          />
        </label>
        {error && (
          <p
            role="alert"
            style={{
              color: "#9f1239",
              fontFamily: "system-ui,sans-serif",
              fontSize: 14,
            }}
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          data-testid="report-unlock"
          style={{
            marginTop: 14,
            width: "100%",
            border: 0,
            borderRadius: 999,
            padding: "0.75rem 1rem",
            background: "#12212b",
            color: "#fff",
            fontFamily: "system-ui,sans-serif",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {pending ? "Checking…" : "Open report"}
        </button>
      </form>
    </main>
  );
}
