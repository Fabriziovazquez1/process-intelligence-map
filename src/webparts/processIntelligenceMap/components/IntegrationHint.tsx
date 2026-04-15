import * as React from "react";
import { B } from "./constants";

export default function IntegrationHint(): JSX.Element {
  return (
    <span
      title="Ideally this field would link into Microsoft Teams & Outlook — coming soon"
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "rgba(8,87,195,0.1)", border: "1px solid rgba(8,87,195,0.25)",
        borderRadius: 4, padding: "1px 7px", cursor: "default", marginLeft: 7,
      }}
    >
      <span style={{ fontSize: 9, color: B.sky, fontFamily: "Inter,sans-serif", fontWeight: 500, letterSpacing: 0.3 }}>
        ⚡ Teams · Outlook
      </span>
    </span>
  );
}
