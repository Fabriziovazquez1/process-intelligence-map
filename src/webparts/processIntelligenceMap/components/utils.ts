import { IFieldDef } from "./types";
import { ADMIN_KEY, DEFAULT_FIELD_CONFIG } from "./constants";

// ─── Text wrapping for D3 labels ──────────────────────────────────────────────
export function wrapText(text: string, max: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (t.length > max && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ─── Initialise form state from field config + optional seed values ───────────
export function initFormData(cfg: IFieldDef[], seed: Record<string, unknown> = {}): Record<string, string> {
  const d: Record<string, string> = {};
  cfg.forEach(f => {
    const v = seed[f.key];
    if (v !== undefined && v !== null) {
      d[f.key] = String(v);
    } else {
      d[f.key] = f.type === "select-freq" ? "Daily" : f.type === "select-status" ? "Manual" : "";
    }
  });
  return d;
}

// ─── Field config persistence (localStorage) ─────────────────────────────────
export function loadFieldConfig(): IFieldDef[] {
  try {
    const s = localStorage.getItem(ADMIN_KEY);
    if (s) {
      const a = JSON.parse(s);
      if (Array.isArray(a)) return a as IFieldDef[];
    }
  } catch (e) { /* ignore */ }
  return DEFAULT_FIELD_CONFIG.map(f => ({ ...f }));
}

export function saveFieldConfig(cfg: IFieldDef[]): void {
  try { localStorage.setItem(ADMIN_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
}

// ─── CSV export ───────────────────────────────────────────────────────────────
export function exportCSV(steps: Record<string, unknown>[], processName: string): void {
  const cols = [
    "level", "parentStepId", "parentStepName", "stepName", "owner", "ownerEmail",
    "description", "dataCollected", "dataSource", "transformation", "output",
    "nextPerson", "manualOrAutomated", "frequency", "timeSpent", "systemsTouched", "painPoints",
  ];
  const esc = (v: unknown): string => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = steps.map(s => {
    const parent = s.subprocessParentId
      ? steps.find(x => x.id === s.subprocessParentId)
      : null;
    return [
      s.subprocessParentId ? 2 : 1,
      s.subprocessParentId ?? "",
      (parent?.stepName as string) ?? "",
      s.stepName ?? "", s.owner ?? "", s.ownerEmail ?? "",
      s.description ?? "", s.dataCollected ?? "", s.dataSource ?? "",
      s.transformation ?? "", s.output ?? "", s.nextPerson ?? "",
      s.manualOrAutomated ?? "", s.frequency ?? "", s.timeSpent ?? "",
      s.systemsTouched ?? "", s.painPoints ?? "",
    ];
  });
  const csv = [cols.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(processName || "process").replace(/\s+/g, "-").toLowerCase()}-map.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Invite mailto builder ────────────────────────────────────────────────────
export function buildInviteMailto(step: Record<string, unknown>, processName: string): string | null {
  if (!step.nextPersonEmail) return null;
  const proc = processName || "Source-to-Pay";
  const subj = encodeURIComponent(`Process Intelligence Map — Your Step in ${proc}`);
  const body = encodeURIComponent(
`Hi ${(step.nextPerson as string) || "there"},

I've just finished mapping my step in our ${proc} process as part of Versigent's Digitalization North Star initiative — and according to my notes, you're next in the chain.

My step: "${(step.stepName as string) || ""}"
What I hand off to you: ${(step.output as string) || "(see attached process map)"}

Capturing your step is a key milestone in our supply chain digitalization journey. It helps us identify automation opportunities and build a shared understanding of how work actually flows across the team. It only takes about 5 minutes.

I'd really appreciate your support — your contribution will directly shape what we automate and improve first.

Thank you!

Best,
${(step.owner as string) || ""}

---
Versigent Supply Chain Process Intelligence Initiative`
  );
  return `mailto:${step.nextPersonEmail as string}?subject=${subj}&body=${body}`;
}
