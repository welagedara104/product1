"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Ga4Connection } from "@/lib/audit/types";
import type { ConnectorPlan } from "@/lib/connectors";

type Props = {
  auditId: string;
  oauthConfigured: boolean;
  current: Ga4Connection | null;
};

export function Ga4ConnectPanel({ auditId, oauthConfigured, current }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ga4, setGa4] = useState(current);
  const [plan, setPlan] = useState<ConnectorPlan | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/audits/${auditId}/ga4`);
      const data = await res.json();
      if (cancelled) return;
      setPlan(data.connector_plan ?? null);
      setInviteUrl(data.colleague_invite_url ?? data.oauth_url ?? null);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [auditId, ga4]);

  async function connectFixture() {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/audits/${auditId}/ga4`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "fixture" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Failed");
      return;
    }
    setGa4(data.ga4);
    setPlan(data.connector_plan ?? null);
    setMessage(data.message);
    router.refresh();
  }

  async function startOauth() {
    setBusy(true);
    const res = await fetch(`/api/audits/${auditId}/ga4`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "oauth" }),
    });
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
      return;
    }
    setBusy(false);
    setMessage(data.gap || data.message || "OAuth not available; use fixture.");
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage("Colleague invite link copied — they sign in with Google (no password shared with Cranial).");
    } catch {
      setMessage(inviteUrl);
    }
  }

  return (
    <div
      style={{
        marginTop: "1.5rem",
        maxWidth: 560,
        background: "#fff",
        border: "1px solid #d5cbb8",
        borderRadius: 10,
        padding: "1.25rem",
        display: "grid",
        gap: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: 14 }}>
        OAuth secrets:{" "}
        <strong>{oauthConfigured ? "present" : "missing (use fixture)"}</strong>
      </p>
      <p style={{ margin: 0, fontSize: 13, color: "#3a4a55" }}>
        Clients never share Google passwords with Cranial. Prefer OAuth (or a
        colleague invite). CSV/PDF uploads are the fallback when OAuth is not
        possible.
      </p>
      {plan ? (
        <div style={{ fontSize: 13, background: "#f7f4ef", padding: "0.75rem" }}>
          <div>
            Analytics: <strong>{plan.analytics.status}</strong> — {plan.analytics.note}
          </div>
          <div style={{ marginTop: 6 }}>
            Behaviour: <strong>{plan.behaviour.status}</strong> —{" "}
            {plan.behaviour.note}
          </div>
        </div>
      ) : null}
      {ga4 ? (
        <div style={{ fontSize: 14, background: "#eef6f3", padding: "0.75rem" }}>
          <div>
            Mode: <strong>{ga4.mode}</strong>
          </div>
          <div>Property: {ga4.property_name}</div>
          <div>Id: {ga4.property_id}</div>
          {ga4.note ? <div style={{ marginTop: 6 }}>{ga4.note}</div> : null}
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button
          type="button"
          disabled={busy || !oauthConfigured}
          onClick={startOauth}
          style={btn(oauthConfigured)}
        >
          Connect with Google OAuth
        </button>
        <button
          type="button"
          disabled={busy || !inviteUrl}
          onClick={copyInvite}
          style={btn(Boolean(inviteUrl))}
        >
          Copy colleague invite link
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={connectFixture}
          style={btn(true)}
        >
          Use tier-1 GA4 fixture
        </button>
        <button
          type="button"
          disabled={busy || !ga4}
          onClick={() => router.push(`/intake/${auditId}/run`)}
          style={btn(Boolean(ga4))}
        >
          Continue to run
        </button>
      </div>
      {message ? <p style={{ margin: 0, fontSize: 14 }}>{message}</p> : null}
    </div>
  );
}

function btn(enabled: boolean) {
  return {
    background: enabled ? "#0b3a4a" : "#9aa7ae",
    color: "#f4efe6",
    border: "none",
    padding: "0.7rem 1rem",
    fontWeight: 600,
    cursor: enabled ? ("pointer" as const) : ("not-allowed" as const),
  };
}
