import * as React from "react";
import { B } from "./constants";
import { buildInviteMailto } from "./utils";

interface IInviteButtonProps {
  step: Record<string, unknown>;
  status: string | undefined;
  onStatusChange: (s: string) => void;
  processName?: string;
}

function CheckAnim(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ display: "block" }}>
      <circle cx="9" cy="9" r="8" stroke={B.neon} strokeWidth="1.5" />
      <polyline points="5,9.5 8,12.5 13,6.5" stroke={B.neon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InviteButton({ step, status, onStatusChange, processName }: IInviteButtonProps): JSX.Element | null {
  const href = buildInviteMailto(step, processName || "Source-to-Pay");
  if (!href) return null;

  if (status === "sent") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(121,221,5,0.07)", border: "1px solid rgba(121,221,5,0.25)", borderRadius: 8 }}>
          <CheckAnim />
          <span style={{ fontSize: 12, color: B.neon, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
            Invitation sent to {step.nextPerson as string}
          </span>
        </div>
        <a href={href} onClick={() => onStatusChange("drafted")} style={{ fontSize: 11, color: B.alum2, textDecoration: "underline", cursor: "pointer", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap" }}>
          Resend
        </a>
      </div>
    );
  }

  if (status === "drafted") {
    return (
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
        <div style={{ background: "rgba(247,169,0,0.07)", border: "1px solid rgba(247,169,0,0.25)", borderRadius: 8, padding: "9px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: B.gold, fontWeight: 500, fontFamily: "Inter,sans-serif" }}>📋 Draft opened — confirm once sent</span>
          <a href={href} style={{ fontSize: 11, color: B.alum2, textDecoration: "underline", cursor: "pointer", fontFamily: "Inter,sans-serif", marginLeft: 10, flexShrink: 0 }}>Reopen</a>
        </div>
        <button
          onClick={() => onStatusChange("sent")}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 0", background: "rgba(121,221,5,0.08)", border: "1px solid rgba(121,221,5,0.3)", borderRadius: 8, color: B.neon, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(121,221,5,0.15)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(121,221,5,0.08)")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke={B.neon} strokeWidth="1.5" />
            <polyline points="4.5,8.5 7,11 11.5,5.5" stroke={B.neon} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Mark as Sent
        </button>
      </div>
    );
  }

  return (
    <a
      href={href}
      onClick={() => onStatusChange("drafted")}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 8, padding: "8px 14px", background: `linear-gradient(135deg,${B.electric},#0a6fd8)`, borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 600, fontFamily: "Inter,sans-serif", textDecoration: "none", letterSpacing: 0.2 }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
    >
      ✉ Send Invitation to {step.nextPerson as string}
    </a>
  );
}
