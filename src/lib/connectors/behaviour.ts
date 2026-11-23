import type { IntakeAnswers } from "@/lib/audit/types";
import type {
  BehaviourConnection,
  BehaviourProvider,
  ConnectorStatus,
} from "@/lib/connectors/types";

/**
 * Behaviour-tool connection stub (ContentSquare / Hotjar / Clarity / other).
 * Real OAuth/API keys are Phase 3; here we record intent + honest next steps.
 * Never asks for or stores client passwords.
 */
export function planBehaviourConnection(intake: IntakeAnswers): BehaviourConnection {
  const provider = mapProvider(intake);
  const label = providerLabel(provider, intake.behaviour_other_name);

  if (provider === "none") {
    return {
      provider,
      provider_label: label,
      mode: "none",
      status: "skipped",
      connected_at: null,
      has_secret_ref: false,
      note: "No behaviour tool — Creative Score predicted attention only (tier ≤ 1).",
      uploads: [],
    };
  }

  if (provider === "contentsquare") {
    return stubConnection(provider, label, "oauth", "awaiting_oauth", [
      "Prefer ContentSquare OAuth / read-only API credentials the client creates in their console.",
      "If the plan has no API: accept PNG/CSV heatmap or funnel uploads (never a password).",
      "Live ContentSquare pull is Phase 3 — connection status is recorded for the connect UI.",
    ]);
  }

  return stubConnection(provider, label, "api_key", "awaiting_api_key", [
    `${label}: ask the client to create a read-only API key in their own console, or upload exports.`,
    "Do not collect account passwords.",
    "Upload fallback: PNG/CSV under .data/uploads/{auditId}/ when wired.",
  ]);
}

export function behaviourConnectStubMessage(conn: BehaviourConnection): string {
  if (conn.status === "skipped") return conn.note;
  return `${conn.provider_label}: ${conn.note}`;
}

function stubConnection(
  provider: BehaviourProvider,
  label: string,
  mode: BehaviourConnection["mode"],
  status: ConnectorStatus,
  lines: string[],
): BehaviourConnection {
  return {
    provider,
    provider_label: label,
    mode,
    status,
    connected_at: null,
    has_secret_ref: false,
    note: lines.join(" "),
    uploads: [],
  };
}

function mapProvider(intake: IntakeAnswers): BehaviourProvider {
  if (intake.behaviour_tool === "contentsquare") return "contentsquare";
  if (intake.behaviour_tool === "no") return "none";
  const name = intake.behaviour_other_name.trim().toLowerCase();
  if (name.includes("hotjar")) return "hotjar";
  if (name.includes("clarity")) return "clarity";
  return "other";
}

function providerLabel(provider: BehaviourProvider, otherName: string): string {
  if (provider === "contentsquare") return "ContentSquare";
  if (provider === "hotjar") return "Hotjar";
  if (provider === "clarity") return "Microsoft Clarity";
  if (provider === "none") return "None";
  return otherName.trim() || "Other behaviour tool";
}
