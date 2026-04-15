// ─── Brand colours ────────────────────────────────────────────────────────────
export const B = {
  navy:        "#0a1520",
  packard:     "#16283F",
  packardMid:  "#1c3350",
  copper:      "#CD7925",
  gold:        "#F7A900",
  electric:    "#0857C3",
  sky:         "#74D2E7",
  neon:        "#79DD05",
  forest:      "#004624",
  warmWhite:   "#FBFAF6",
  alum1:       "#F1F1F1",
  alum2:       "#888B8D",
  border:      "rgba(205,121,37,0.18)",
  borderFaint: "rgba(205,121,37,0.08)",
} as const;

// ─── Badge colours per automation status ─────────────────────────────────────
export const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  "Manual":         { bg: "#9b1c1c", text: "#fff" },
  "Semi-Automated": { bg: "#F7A900", text: "#000" },
  "Automated":      { bg: "#79DD05", text: "#000" },
};

// ─── Static process list (hub view) ──────────────────────────────────────────
// Maps a process name → visual overrides used when loading from SharePoint.
export interface IProcessVisualConfig {
  domain: string;
  accent: string;
}

export const PROCESS_VISUAL_CONFIG: Record<string, IProcessVisualConfig> = {
  "Source-to-Pay": { domain: "Procurement", accent: B.copper },
  "Order-to-Cash": { domain: "Sales Ops",   accent: B.electric },
};

// Links between processes shown in the hub graph (by name)
export const PROCESS_LINK_NAMES: Array<{ source: string; target: string }> = [
  { source: "Source-to-Pay", target: "Order-to-Cash" },
];

// ─── Admin password ───────────────────────────────────────────────────────────
export const ADMIN_PASSWORD = "carrot";
export const ADMIN_KEY      = "pim-admin-v2";

// ─── Default field configuration ─────────────────────────────────────────────
import { IFieldDef } from "./types";

export const DEFAULT_FIELD_CONFIG: IFieldDef[] = [
  { key: "stepName",          label: "Step Name",        type: "input",         required: true,  builtIn: true, undeletable: true },
  { key: "owner",             label: "Owner",            type: "input",         required: true,  builtIn: true, undeletable: true, hint: "teams+outlook" },
  { key: "ownerEmail",        label: "Owner Email",      type: "input",         required: false, builtIn: true },
  { key: "manualOrAutomated", label: "Status",           type: "select-status", required: true,  builtIn: true, undeletable: true },
  { key: "description",       label: "Description",      type: "textarea",      required: true,  builtIn: true, undeletable: true },
  { key: "dataCollected",     label: "Data Collected",   type: "input",         required: false, builtIn: true },
  { key: "dataSource",        label: "Data Source",      type: "input",         required: false, builtIn: true },
  { key: "transformation",    label: "Transformation",   type: "input",         required: false, builtIn: true },
  { key: "output",            label: "Output",           type: "input",         required: false, builtIn: true },
  { key: "systemsTouched",    label: "Systems Touched",  type: "input",         required: false, builtIn: true },
  { key: "frequency",         label: "Frequency",        type: "select-freq",   required: false, builtIn: true },
  { key: "timeSpent",         label: "Time Spent",       type: "input",         required: false, builtIn: true },
  { key: "painPoints",        label: "Pain Points",      type: "textarea",      required: false, builtIn: true },
  { key: "nextPerson",        label: "Hands Off To",     type: "input",         required: false, builtIn: true, hint: "teams+outlook" },
  { key: "nextPersonEmail",   label: "Next Person Email",type: "input",         required: false, builtIn: true },
];
