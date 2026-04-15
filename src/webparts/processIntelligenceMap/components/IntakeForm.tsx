import * as React from "react";
import { useState } from "react";
import { B } from "./constants";
import { IFieldDef, ILocalStep } from "./types";
import { initFormData } from "./utils";
import FormField from "./FormField";
import InviteButton from "./InviteButton";

interface IIntakeFormProps {
  fieldConfig: IFieldDef[];
  chainedFrom: ILocalStep | null;
  insertMode: "new" | "chain" | "after" | "before" | "branch";
  onSubmit: (data: Record<string, string>) => void;
  onCancel: () => void;
}

export default function IntakeForm({ fieldConfig, chainedFrom, insertMode, onSubmit, onCancel }: IIntakeFormProps): JSX.Element {
  const seed: Record<string, string> = {
    owner:           chainedFrom?.nextPerson      || "",
    ownerEmail:      chainedFrom?.nextPersonEmail || "",
  };
  const [form, setForm]             = useState<Record<string, string>>(() => initFormData(fieldConfig, seed));
  const [inviteStatus, setInvite]   = useState<string | undefined>(undefined);

  const ch = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (k === "nextPerson" || k === "nextPersonEmail") setInvite(undefined);
  };

  const handoffKeys   = new Set(["nextPerson", "nextPersonEmail"]);
  const mainFields    = fieldConfig.filter(f => !handoffKeys.has(f.key));
  const handoffFields = fieldConfig.filter(f =>  handoffKeys.has(f.key));
  const canSubmit     = fieldConfig.filter(f => f.required).every(f => form[f.key]?.trim());

  const ls: React.CSSProperties = { color: B.alum2, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, display: "block" };
  const fg: React.CSSProperties = { marginBottom: 16 };

  let ctx: JSX.Element | null = null;
  if (insertMode === "chain" && chainedFrom) {
    ctx = (
      <div style={{ background: `linear-gradient(135deg,rgba(8,87,195,0.15),rgba(8,87,195,0.08))`, border: `1px solid rgba(8,87,195,0.3)`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ color: B.sky, fontSize: 14, lineHeight: 1.6 }}>
          👋 <strong>Hi{form.owner ? ` ${form.owner.split(" ")[0]}` : ""}</strong> — <strong>{chainedFrom.owner}</strong> handles <em>"{chainedFrom.stepName}"</em> and said you're the next step.
          <br/><br/>Could you take a few minutes to describe what happens once you receive their output?
        </div>
      </div>
    );
  } else if (insertMode === "after" && chainedFrom) {
    ctx = (
      <div style={{ background: `linear-gradient(135deg,rgba(205,121,37,0.1),rgba(205,121,37,0.05))`, border: `1px solid ${B.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ color: B.gold, fontSize: 14, lineHeight: 1.6 }}>
          ➕ Adding a step <strong>after</strong> <em>"{chainedFrom.stepName}"</em> — slots between <strong>{chainedFrom.owner}</strong> and <strong>{chainedFrom.nextPerson || "the end of the chain"}</strong>.
        </div>
      </div>
    );
  } else if (insertMode === "before" && chainedFrom) {
    ctx = (
      <div style={{ background: `linear-gradient(135deg,rgba(205,121,37,0.1),rgba(205,121,37,0.05))`, border: `1px solid ${B.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ color: B.gold, fontSize: 14, lineHeight: 1.6 }}>
          ➕ Adding a step <strong>before</strong> <em>"{chainedFrom.stepName}"</em> — will feed into <strong>{chainedFrom.owner}'s</strong> step.
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(10,21,32,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, fontFamily: "Inter,sans-serif" }}>
      <div style={{ background: `linear-gradient(160deg,${B.packard},${B.packardMid})`, border: `1px solid ${B.border}`, borderRadius: 16, padding: 32, width: 640, maxHeight: "88vh", overflowY: "auto" }}>
        {ctx}
        <h2 style={{ color: B.warmWhite, fontSize: 20, margin: "0 0 24px 0", fontWeight: 700 }}>
          {insertMode === "chain" ? "Map Your Process Step"
            : insertMode === "after"  ? "Add Step After"
            : insertMode === "before" ? "Add Step Before"
            : "Add a New Process Step"}
        </h2>

        {mainFields.map(f => (
          <div key={f.key} style={fg}>
            <label style={ls}>{f.label}{f.required ? " *" : ""}</label>
            <FormField fieldDef={f} value={form[f.key] || ""} onChange={ch(f.key)} />
          </div>
        ))}

        {handoffFields.length > 0 && (
          <div style={{ background: B.navy, border: `1px solid ${B.border}`, borderRadius: 12, padding: 20, marginTop: 8, marginBottom: 8 }}>
            <div style={{ color: B.sky, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🔗 Who comes after you?</div>
            <div style={{ color: "#334155", fontSize: 12, marginBottom: 14 }}>Fill in their name and email — we'll generate an invitation for you to send.</div>
            {handoffFields.map(f => (
              <div key={f.key} style={fg}>
                <label style={ls}>{f.label}</label>
                <FormField fieldDef={f} value={form[f.key] || ""} onChange={ch(f.key)} />
              </div>
            ))}
            {form.nextPerson && form.nextPersonEmail && (
              <InviteButton
                step={{ ...form, stepName: form.stepName || "this step", owner: form.owner || "me" }}
                status={inviteStatus}
                onStatusChange={setInvite}
              />
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            onClick={() => { if (!canSubmit) return; onSubmit(form); }}
            style={{ flex: 1, padding: "12px 24px", background: canSubmit ? `linear-gradient(135deg,${B.copper},${B.gold})` : "#1e293b", border: "none", borderRadius: 10, color: canSubmit ? "#000" : "#475569", fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "Inter,sans-serif", transition: "all 0.2s" }}
          >Add to Process Map</button>
          <button
            onClick={onCancel}
            style={{ padding: "12px 24px", background: "none", border: `1px solid ${B.border}`, borderRadius: 10, color: B.alum2, fontSize: 14, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}
