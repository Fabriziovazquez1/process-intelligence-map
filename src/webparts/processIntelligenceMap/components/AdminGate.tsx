import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { B } from "./constants";
import { ADMIN_PASSWORD } from "./constants";

interface IAdminGateProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function AdminGate({ onSuccess, onClose }: IAdminGateProps): JSX.Element {
  const [pw, setPw]   = useState("");
  const [err, setErr] = useState(false);
  const inp = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inp.current?.focus(), 50); }, []);

  const attempt = () => {
    if (pw === ADMIN_PASSWORD) { onSuccess(); }
    else { setErr(true); setPw(""); setTimeout(() => setErr(false), 700); }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(10,21,32,0.94)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, fontFamily: "Inter,sans-serif" }}>
      <div style={{ background: `linear-gradient(160deg,${B.packard},${B.packardMid})`, border: `1px solid ${B.border}`, borderRadius: 16, padding: 36, width: 360 }}>
        <div style={{ color: B.copper, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Admin Access</div>
        <h2 style={{ color: B.warmWhite, fontSize: 18, fontWeight: 700, margin: "0 0 8px 0" }}>Field Configuration</h2>
        <p style={{ color: B.alum2, fontSize: 13, margin: "0 0 24px 0", lineHeight: 1.5 }}>Enter the admin password to manage fields for this process.</p>

        <input
          ref={inp}
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && attempt()}
          placeholder="Password"
          style={{
            width: "100%", padding: "10px 14px", background: B.navy,
            border: `1px solid ${err ? "#9b1c1c" : B.border}`, borderRadius: 8,
            color: B.warmWhite, fontSize: 14, fontFamily: "Inter,sans-serif", outline: "none",
            boxSizing: "border-box", marginBottom: err ? 4 : 16, transition: "border-color 0.2s",
          }}
        />
        {err && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>Incorrect password.</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={attempt}
            style={{ flex: 1, padding: "10px 0", background: `linear-gradient(135deg,${B.copper},${B.gold})`, border: "none", borderRadius: 8, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >Unlock</button>
          <button
            onClick={onClose}
            style={{ padding: "10px 16px", background: "none", border: `1px solid ${B.border}`, borderRadius: 8, color: B.alum2, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}
