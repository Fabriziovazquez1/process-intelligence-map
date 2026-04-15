import * as React from "react";
import { useState } from "react";
import { B } from "./constants";
import { IFieldDef } from "./types";
import { saveFieldConfig } from "./utils";

interface IAdminPanelProps {
  fieldConfig: IFieldDef[];
  onSave: (cfg: IFieldDef[]) => void;
  onClose: () => void;
}

export default function AdminPanel({ fieldConfig, onSave, onClose }: IAdminPanelProps): JSX.Element {
  const [fields,   setFields]   = useState<IFieldDef[]>(() => fieldConfig.map(f => ({ ...f })));
  const [addLabel, setAddLabel] = useState("");
  const [addType,  setAddType]  = useState<IFieldDef["type"]>("input");
  const [addReq,   setAddReq]   = useState(false);
  const [showAdd,  setShowAdd]  = useState(false);

  const move = (i: number, dir: number) => {
    const a = [...fields];
    if (i + dir < 0 || i + dir >= a.length) return;
    [a[i], a[i + dir]] = [a[i + dir], a[i]];
    setFields(a);
  };
  const del  = (i: number) => setFields(p => p.filter((_, idx) => idx !== i));
  const upd  = (i: number, k: keyof IFieldDef, v: unknown) => setFields(p => p.map((f, idx) => idx === i ? { ...f, [k]: v } : f));
  const addField = () => {
    if (!addLabel.trim()) return;
    setFields(p => [...p, { key: `custom_${Date.now()}`, label: addLabel.trim(), type: addType, required: addReq, builtIn: false }]);
    setAddLabel(""); setAddType("input"); setAddReq(false); setShowAdd(false);
  };

  const ist: React.CSSProperties = { padding: "6px 10px", background: B.navy, border: `1px solid ${B.border}`, borderRadius: 6, color: B.warmWhite, fontSize: 13, fontFamily: "Inter,sans-serif", outline: "none" };

  const Pill = ({ on, onClick, dis }: { on: boolean; onClick?: () => void; dis?: boolean }) => (
    <button
      onClick={dis ? undefined : onClick}
      style={{ padding: "3px 10px", borderRadius: 12, border: `1px solid ${on ? B.copper : B.border}`, background: on ? `rgba(205,121,37,0.12)` : "transparent", color: on ? B.copper : B.alum2, fontSize: 11, fontWeight: 600, cursor: dis ? "not-allowed" : "pointer", fontFamily: "Inter,sans-serif", opacity: dis ? 0.4 : 1, transition: "all 0.15s" }}
    >{on ? "Required" : "Optional"}</button>
  );

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(10,21,32,0.9)", display: "flex", zIndex: 50, fontFamily: "Inter,sans-serif" }}>
      <div style={{ background: `linear-gradient(160deg,${B.navy},${B.packard})`, borderRight: `1px solid ${B.border}`, width: 580, height: "100%", overflowY: "auto", padding: "28px 32px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <div style={{ color: B.copper, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>⚙ Admin · Field Config</div>
            <h2 style={{ color: B.warmWhite, fontSize: 20, fontWeight: 700, margin: 0 }}>Customize Fields</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${B.border}`, color: B.alum2, width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <p style={{ color: "#334155", fontSize: 12, marginBottom: 24, lineHeight: 1.5 }}>Use ↑↓ to reorder. Fields marked ⊝ are required and cannot be removed.</p>

        <div style={{ display: "grid", gridTemplateColumns: "28px 28px 1fr 120px 90px 32px", gap: 6, padding: "0 0 8px", borderBottom: `1px solid ${B.borderFaint}`, marginBottom: 4 }}>
          {["", "", "Label", "Type", "Required", ""].map((h, i) => (
            <div key={i} style={{ color: B.alum2, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, textAlign: i >= 4 ? "center" : "left" }}>{h}</div>
          ))}
        </div>

        {fields.map((f, i) => (
          <div key={f.key} style={{ display: "grid", gridTemplateColumns: "28px 28px 1fr 120px 90px 32px", gap: 6, alignItems: "center", padding: "7px 0", borderBottom: `1px solid rgba(205,121,37,0.05)` }}>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", color: i === 0 ? "#1e293b" : B.alum2, cursor: i === 0 ? "default" : "pointer", fontSize: 14, padding: 0, display: "flex", justifyContent: "center" }}>↑</button>
            <button onClick={() => move(i,  1)} disabled={i === fields.length - 1} style={{ background: "none", border: "none", color: i === fields.length - 1 ? "#1e293b" : B.alum2, cursor: i === fields.length - 1 ? "default" : "pointer", fontSize: 14, padding: 0, display: "flex", justifyContent: "center" }}>↓</button>
            <input
              value={f.label}
              onChange={e => upd(i, "label", e.target.value)}
              style={{ ...ist, width: "100%", background: "transparent", border: "none", borderBottom: `1px solid ${B.borderFaint}`, borderRadius: 0, padding: "2px 0" }}
            />
            <select value={f.type} onChange={e => upd(i, "type", e.target.value as IFieldDef["type"])} style={{ ...ist, cursor: "pointer", width: "100%" }}>
              <option value="input">Short text</option>
              <option value="textarea">Long text</option>
              <option value="number">Number</option>
              {f.type === "select-status" && <option value="select-status">Status select</option>}
              {f.type === "select-freq"   && <option value="select-freq">Freq. select</option>}
            </select>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {f.undeletable
                ? <span style={{ color: "#1e3a5f", fontSize: 11, fontFamily: "Inter,monospace" }}>always</span>
                : <Pill on={!!f.required} onClick={() => upd(i, "required", !f.required)} />}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {f.undeletable
                ? <span style={{ color: "#1e293b", fontSize: 16 }}>⊝</span>
                : <button onClick={() => del(i)} style={{ background: "none", border: "none", color: B.alum2, cursor: "pointer", fontSize: 16, padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                    onMouseLeave={e => (e.currentTarget.style.color = B.alum2)}>✕</button>}
            </div>
          </div>
        ))}

        {showAdd ? (
          <div style={{ background: B.navy, border: `1px solid ${B.border}`, borderRadius: 10, padding: 16, marginTop: 16 }}>
            <div style={{ color: B.sky, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>New field</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 10, marginBottom: 10 }}>
              <input value={addLabel} onChange={e => setAddLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && addField()} placeholder="Field label…" style={{ ...ist, width: "100%" }} autoFocus />
              <select value={addType} onChange={e => setAddType(e.target.value as IFieldDef["type"])} style={{ ...ist, cursor: "pointer", width: "100%" }}>
                <option value="input">Short text</option>
                <option value="textarea">Long text</option>
                <option value="number">Number</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Pill on={addReq} onClick={() => setAddReq(p => !p)} />
              <span style={{ color: "#334155", fontSize: 12 }}>Click to toggle</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={addField} style={{ padding: "7px 18px", background: `linear-gradient(135deg,${B.copper},${B.gold})`, border: "none", borderRadius: 7, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>Add</button>
              <button onClick={() => { setShowAdd(false); setAddLabel(""); }} style={{ padding: "7px 14px", background: "none", border: `1px solid ${B.border}`, borderRadius: 7, color: B.alum2, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            style={{ marginTop: 14, width: "100%", padding: "9px 0", background: `rgba(205,121,37,0.04)`, border: `1px dashed ${B.border}`, borderRadius: 8, color: B.alum2, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = B.copper; e.currentTarget.style.color = B.copper; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = B.border; e.currentTarget.style.color = B.alum2; }}
          >＋ Add field</button>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
          <button
            onClick={() => { saveFieldConfig(fields); onSave(fields); }}
            style={{ flex: 1, padding: "12px 0", background: `linear-gradient(135deg,${B.copper},${B.gold})`, border: "none", borderRadius: 10, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >Save &amp; Apply</button>
          <button onClick={onClose} style={{ padding: "12px 16px", background: "none", border: `1px solid ${B.border}`, borderRadius: 10, color: B.alum2, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>Discard</button>
        </div>
      </div>
      <div style={{ flex: 1, height: "100%" }} onClick={onClose} />
    </div>
  );
}
