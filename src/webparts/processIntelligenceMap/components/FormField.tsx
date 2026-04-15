import * as React from "react";
import { IFieldDef } from "./types";
import { B } from "./constants";

interface IFormFieldProps {
  fieldDef: IFieldDef;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  compact?: boolean;
}

export default function FormField({ fieldDef, value, onChange, compact }: IFormFieldProps): JSX.Element {
  const ist: React.CSSProperties = {
    width: "100%",
    padding: compact ? "8px 11px" : "10px 14px",
    background: B.navy,
    border: `1px solid ${B.border}`,
    borderRadius: compact ? 6 : 8,
    color: B.warmWhite,
    fontSize: compact ? 13 : 14,
    fontFamily: "Inter,sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  if (fieldDef.type === "select-status") {
    return (
      <select style={{ ...ist, cursor: "pointer" }} value={value} onChange={onChange}>
        <option value="Manual">Manual</option>
        <option value="Semi-Automated">Semi-Automated</option>
        <option value="Automated">Automated</option>
      </select>
    );
  }
  if (fieldDef.type === "select-freq") {
    return (
      <select style={{ ...ist, cursor: "pointer" }} value={value} onChange={onChange}>
        <option>Daily</option>
        <option>Weekly</option>
        <option>Monthly</option>
        <option>Quarterly</option>
        <option>Ad-hoc</option>
      </select>
    );
  }
  if (fieldDef.type === "textarea") {
    return (
      <textarea
        style={{ ...ist, minHeight: compact ? 56 : 70, resize: "vertical" }}
        value={value}
        onChange={onChange}
      />
    );
  }
  return <input style={ist} value={value} onChange={onChange} />;
}
