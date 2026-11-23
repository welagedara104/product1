/**
 * Client data connectors — OAuth / client-created keys first; uploads as fallback.
 * The client never shares account passwords with Cranial.
 */

export type ConnectorKind = "ga4" | "behaviour" | "upload";

export type ConnectorStatus =
  | "not_started"
  | "awaiting_oauth"
  | "awaiting_api_key"
  | "awaiting_upload"
  | "connected"
  | "fixture"
  | "skipped";

export type BehaviourProvider =
  | "contentsquare"
  | "hotjar"
  | "clarity"
  | "other"
  | "none";

export type UploadKind =
  | "ga4_export"
  | "behaviour_heatmap"
  | "behaviour_funnel"
  | "behaviour_csv"
  | "other";

export type ConnectorUpload = {
  id: string;
  kind: UploadKind;
  /** Relative path under .data/uploads/{auditId}/ — never a password. */
  path: string;
  original_name: string;
  uploaded_at: string;
  note?: string;
};

export type BehaviourConnection = {
  provider: BehaviourProvider;
  provider_label: string;
  mode: "oauth" | "api_key" | "upload" | "none" | "stub";
  status: ConnectorStatus;
  connected_at: string | null;
  /** True when a refresh token / API key reference exists (never store secrets in job JSON). */
  has_secret_ref: boolean;
  note: string;
  uploads: ConnectorUpload[];
};

export type ConnectorPlan = {
  analytics: {
    tool: "ga4" | "other" | "none";
    other_name: string;
    preferred: "oauth" | "upload" | "skip";
    status: ConnectorStatus;
    note: string;
  };
  behaviour: BehaviourConnection;
  /** Explicit rule for UI / operators. */
  password_policy: "never_ask_client_for_passwords";
};
