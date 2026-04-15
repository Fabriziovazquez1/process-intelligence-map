import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { B } from "./constants";
import { ILocalLink } from "./types";
import { SharePointService, IAttachment } from "../services/SharePointService";

interface IAttachmentsSectionProps {
  stepId: number;
  processMapId: number;
}

export default function AttachmentsSection({ stepId, processMapId }: IAttachmentsSectionProps): JSX.Element {
  const [spFiles, setSpFiles]       = useState<IAttachment[]>([]);
  const [links, setLinks]           = useState<ILocalLink[]>([]);
  const [urlInput, setUrlInput]     = useState("");
  const [urlName, setUrlName]       = useState("");
  const [uploading, setUploading]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load SP file attachments on mount
  useEffect(() => {
    if (!stepId) return;
    SharePointService.getAttachments(stepId)
      .then(items => setSpFiles(items))
      .catch(() => { /* library may not exist yet — silent fail */ });
  }, [stepId]);

  const addLink = () => {
    if (!urlInput.trim()) return;
    const link: ILocalLink = {
      id: `link-${Date.now()}`,
      name: urlName.trim() || urlInput.trim(),
      url: urlInput.trim(),
      type: "link",
    };
    setLinks(prev => [...prev, link]);
    setUrlInput("");
    setUrlName("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const att = await SharePointService.uploadAttachment(stepId, processMapId, file);
      setSpFiles(prev => [...prev, att]);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("File upload failed. The ProcessStepAttachments library may not be set up yet.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteSpFile = async (att: IAttachment) => {
    try {
      await SharePointService.deleteAttachment(att.id);
      setSpFiles(prev => prev.filter(a => a.id !== att.id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const ist: React.CSSProperties = {
    padding: "7px 10px", background: B.navy, border: `1px solid ${B.border}`,
    borderRadius: 7, color: B.warmWhite, fontSize: 12, fontFamily: "Inter,sans-serif", outline: "none",
  };

  const totalCount = spFiles.length + links.length;

  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${B.border}` }}>
      <div style={{ color: B.alum2, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
        Attachments{totalCount > 0 ? ` (${totalCount})` : ""}
      </div>

      {/* SP file attachments */}
      {spFiles.map(att => (
        <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: B.navy, borderRadius: 7, marginBottom: 6, border: `1px solid ${B.border}` }}>
          <span style={{ fontSize: 13 }}>📎</span>
          <a href={att.fileUrl} target="_blank" rel="noreferrer"
            style={{ flex: 1, color: B.sky, fontSize: 12, cursor: "pointer", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            title={att.fileName}
          >{att.fileName}</a>
          <button onClick={() => deleteSpFile(att)}
            style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", cursor: "pointer", fontSize: 13, padding: "0 2px" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(239,68,68,0.5)")}
          >✕</button>
        </div>
      ))}

      {/* Local URL links (session-only) */}
      {links.map(link => (
        <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: B.navy, borderRadius: 7, marginBottom: 6, border: `1px solid ${B.border}` }}>
          <span style={{ fontSize: 13 }}>🔗</span>
          <a href={link.url} target="_blank" rel="noreferrer"
            style={{ flex: 1, color: B.sky, fontSize: 12, cursor: "pointer", textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >{link.name}</a>
          <span style={{ color: B.alum2, fontSize: 10, flexShrink: 0 }}>session</span>
          <button onClick={() => setLinks(prev => prev.filter(l => l.id !== link.id))}
            style={{ background: "none", border: "none", color: "rgba(239,68,68,0.5)", cursor: "pointer", fontSize: 13, padding: "0 2px" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(239,68,68,0.5)")}
          >✕</button>
        </div>
      ))}

      {/* Add link */}
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          placeholder="Paste link (SharePoint, Drive…)"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addLink(); }}
          style={{ ...ist, flex: 2 }}
        />
        <input
          placeholder="Label"
          value={urlName}
          onChange={e => setUrlName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addLink(); }}
          style={{ ...ist, flex: 1 }}
        />
        <button onClick={addLink}
          style={{ padding: "7px 12px", background: `linear-gradient(135deg,${B.copper},${B.gold})`, border: "none", borderRadius: 7, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif", flexShrink: 0 }}
        >Add</button>
      </div>

      {/* Upload file */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ width: "100%", padding: "8px", background: "none", border: `1px dashed ${B.border}`, borderRadius: 7, color: uploading ? B.alum2 : B.alum2, fontSize: 12, cursor: uploading ? "wait" : "pointer", fontFamily: "Inter,sans-serif", textAlign: "center" }}
      >
        {uploading ? "⏳ Uploading…" : "📎 Upload file"}
      </button>
    </div>
  );
}
