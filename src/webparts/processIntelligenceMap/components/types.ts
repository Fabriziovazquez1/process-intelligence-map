// ─── Field configuration ──────────────────────────────────────────────────────
export interface IFieldDef {
  key: string;
  label: string;
  type: "input" | "textarea" | "select-status" | "select-freq" | "number";
  required: boolean;
  builtIn?: boolean;
  undeletable?: boolean;
  hint?: string;
}

// ─── Step data ────────────────────────────────────────────────────────────────
// ILocalStep mirrors IProcessStep from SharePointService but uses:
//   - stepName instead of name  (matches field config keys)
//   - nextPersonEmail added
//   - inviteStatus for local UI tracking (not persisted to SP)
// index signature allows dynamic custom fields from admin panel
export interface ILocalStep {
  id: number;
  processMapId: number;
  subprocessParentId: number | null;
  stepName: string;
  owner: string;
  ownerEmail: string;
  manualOrAutomated: "Manual" | "Semi-Automated" | "Automated";
  sortOrder: number;
  description: string;
  dataCollected: string;
  dataSource: string;
  transformation: string;
  output: string;
  nextPerson: string;
  nextPersonEmail: string;
  frequency: string;
  timeSpent: string;
  systemsTouched: string;
  painPoints: string;
  inviteStatus?: string;           // "drafted" | "sent" — local only, not in SP
  [key: string]: unknown;          // custom admin-added fields
}

// ─── Process visual data (hub view) ──────────────────────────────────────────
export interface IProcessHubItem {
  id: number;          // SP ProcessMaps item ID
  name: string;
  domain: string;
  accent: string;
  active: boolean;
  steps?: number;      // filled in at render time from stepCounts
}

// ─── Local attachment (URL links — not persisted to SP) ───────────────────────
export interface ILocalLink {
  id: string;
  name: string;
  url: string;
  type: "link";
}

// ─── Process link (directed arrow between steps, persisted to SP) ─────────────
export interface IProcessLink {
  id: number;
  sourceStepId: number;
  targetStepId: number;
  processMapId: number;
}
