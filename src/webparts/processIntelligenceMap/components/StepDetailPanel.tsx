import * as React from "react";
import { useState, useEffect } from "react";
import { B, BADGE_COLORS } from "./constants";
import { IFieldDef, ILocalStep } from "./types";
import { initFormData } from "./utils";
import FormField from "./FormField";
import IntegrationHint from "./IntegrationHint";
import InviteButton from "./InviteButton";
import AttachmentsSection from "./AttachmentsSection";

interface IStepDetailPanelProps {
  step: ILocalStep;
  steps: ILocalStep[];
  fieldConfig: IFieldDef[];
  inviteStatus: string | undefined;
  processName: string;
  onClose: () => void;
  onChain: (s: ILocalStep) => void;
  onBranch: (s: ILocalStep) => void;
  onUpdate: (updated: ILocalStep) => void;
  onDelete: (s: ILocalStep) => void;
  onInviteStatusChange: (s: string) => void;
}

export default function StepDetailPanel({
  step, steps, fieldConfig, inviteStatus, processName,
  onClose, onChain, onBranch, onUpdate, onDelete, onInviteStatusChange,
}: IStepDetailPanelProps): JSX.Element {
  const [isEditing,  setIsEditing]  = useState(false);
  const [editForm,   setEditForm]   = useState<Record<string, string>>(() => initFormData(fieldConfig, step as unknown as Record<string, unknown>));
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setIsEditing(false);
    setEditForm(initFormData(fieldConfig, step as unknown as Record<string, unknown>));
    setConfirming(false);
  }, [step.id]);

  const badge      = BADGE_COLORS[step.manualOrAutomated] || BADGE_COLORS.Manual;
  const nextExists = step.nextPerson && steps.find(s => s.owner === step.nextPerson);
  const hasPrev    = steps.some(s => s.nextPerson === step.owner);
  const viewRows   = fieldConfig.filter(f => f.key !== "stepName" && f.key !== "manualOrAutomated");

  const ls: React.CSSProperties = { color: B.alum2, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, display: "block" };
  const fg: React.CSSProperties = { marginBottom: 12 };

  return (
    <div style={{ position: "absolute", top: 0, right: 0, width: 420, height: "100%", background: `linear-gradient(160deg,${B.packard} 0%,${B.packardMid} 100%)`, borderLeft: `1px solid ${B.border}`, padding: 28, overflowY: "auto", zIndex: 20, fontFamily: "Inter,sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <h2 style={{ color: B.warmWhite, fontSize: 18, margin: 0, fontWeight: 700, lineHeight: 1.3, flex: 1, marginRight: 12 }}>
          {isEditing ? "Edit Step" : step.stepName}
        </h2>
        <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
          {confirming ? (
            <>
              <span style={{ color: "#f87171", fontSize: 12, fontWeight: 500, marginRight: 2 }}>
                Delete{hasPrev && step.nextPerson ? " & reconnect" : ""}?
              </span>
              <button onClick={() => onDelete(step)} style={{ padding: "4px 12px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 7, color: "#f87171", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>Yes</button>
              <button onClick={() => setConfirming(false)} style={{ padding: "4px 10px", background: "none", border: `1px solid ${B.border}`, borderRadius: 7, color: B.alum2, fontSize: 12, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>No</button>
            </>
          ) : (
            <>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} title="Edit"
                  style={{ background: "none", border: `1px solid ${B.border}`, color: B.alum2, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button>
              )}
              {!isEditing && (
                <button onClick={() => setConfirming(true)} title="Delete step"
                  style={{ background: "none", border: "1px solid rgba(239,68,68,0.25)", color: "rgba(239,68,68,0.5)", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.6)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)"; e.currentTarget.style.color = "rgba(239,68,68,0.5)"; e.currentTarget.style.background = "none"; }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3.5 3.5l.75 7.5a.5.5 0 00.5.45h4.5a.5.5 0 00.5-.45L10.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              <button onClick={onClose}
                style={{ background: "none", border: `1px solid ${B.border}`, color: B.alum2, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div>
          {fieldConfig.map(f => (
            <div key={f.key} style={fg}>
              <label style={ls}>{f.label}{f.required && " *"}</label>
              <FormField fieldDef={f} value={editForm[f.key] || ""} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} compact />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={() => { onUpdate({ ...step, ...editForm } as ILocalStep); setIsEditing(false); }}
              style={{ flex: 1, padding: "10px 0", background: `linear-gradient(135deg,${B.copper},${B.gold})`, border: "none", borderRadius: 8, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
            >Save Changes</button>
            <button
              onClick={() => { setIsEditing(false); setEditForm(initFormData(fieldConfig, step as unknown as Record<string, unknown>)); }}
              style={{ padding: "10px 16px", background: "none", border: `1px solid ${B.border}`, borderRadius: 8, color: B.alum2, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
            >Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          {/* Chain invite button */}
          {step.nextPerson && !nextExists && (
            <button onClick={() => onChain(step)}
              style={{ width: "100%", padding: "10px 12px", marginBottom: 8, background: "linear-gradient(135deg,#4c1d95,#5b21b6)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
              🔗 Chain: Invite {step.nextPerson} to map their step
            </button>
          )}

          {/* Branch button */}
          <button
            onClick={() => onBranch(step)}
            style={{ width: "100%", padding: "9px 12px", marginBottom: 12, background: "none", border: `1px solid ${B.copper}`, borderRadius: 8, color: B.copper, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = `rgba(205,121,37,0.1)`; }}
            onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
          >
            <span style={{ fontSize: 14 }}>⑂</span> Add Branch from this step
          </button>

          {/* Status badges */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <span style={{ background: badge.bg, color: badge.text, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{step.manualOrAutomated}</span>
            {step.frequency && <span style={{ background: B.navy, color: B.alum2, border: `1px solid ${B.border}`, padding: "4px 12px", borderRadius: 20, fontSize: 12 }}>{step.frequency}</span>}
            {step.timeSpent && <span style={{ background: B.navy, color: B.alum2, border: `1px solid ${B.border}`, padding: "4px 12px", borderRadius: 20, fontSize: 12 }}>⏱ {step.timeSpent}</span>}
            {inviteStatus === "drafted" && <span style={{ background: "rgba(247,169,0,0.12)", color: B.gold, border: `1px solid rgba(247,169,0,0.3)`, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>📋 Email Drafted</span>}
            {inviteStatus === "sent"    && <span style={{ background: "rgba(121,221,5,0.1)",  color: B.neon, border: `1px solid rgba(121,221,5,0.25)`,  padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>✓ Invitation Sent</span>}
          </div>

          {/* Field values */}
          {viewRows.map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: B.alum2, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{f.label}</span>
                {f.hint === "teams+outlook" && <IntegrationHint />}
              </div>
              <div style={{ color: B.warmWhite, fontSize: 14, lineHeight: 1.55 }}>
                {(step as Record<string, unknown>)[f.key] as string || "—"}
              </div>
              {f.key === "nextPersonEmail" && step.nextPersonEmail && (
                <InviteButton
                  step={step as unknown as Record<string, unknown>}
                  status={inviteStatus}
                  onStatusChange={onInviteStatusChange}
                  processName={processName}
                />
              )}
            </div>
          ))}

          {/* Attachments */}
          <AttachmentsSection stepId={step.id} processMapId={step.processMapId} />
        </div>
      )}
    </div>
  );
}
