"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExpertLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [expertId, setExpertId] = useState("expert_kavinda");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/expert/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, expert_id: expertId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        marginTop: "1.5rem",
        maxWidth: 400,
        display: "grid",
        gap: 10,
        background: "#fff",
        border: "1px solid #d5cbb8",
        borderRadius: 10,
        padding: "1.25rem",
      }}
    >
      <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
        Expert id
        <input
          value={expertId}
          onChange={(e) => setExpertId(e.target.value)}
          style={input}
        />
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={input}
          placeholder="phase1-expert"
          required
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        style={{
          background: "#0b3a4a",
          color: "#f4efe6",
          border: "none",
          padding: "0.75rem 1rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {busy ? "Checking…" : "Enter expert workspace"}
      </button>
      {error ? <p style={{ color: "#8a2a1a", margin: 0 }}>{error}</p> : null}
      <p style={{ fontSize: 12, color: "#3a4a55", margin: 0 }}>
        Local default password: <code>phase1-expert</code>
      </p>
    </form>
  );
}

const input = {
  padding: "0.6rem 0.7rem",
  border: "1px solid #d5cbb8",
  borderRadius: 6,
  fontSize: 15,
} as const;
