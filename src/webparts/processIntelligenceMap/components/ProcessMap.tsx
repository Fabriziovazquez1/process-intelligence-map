import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { B } from "./constants";
import { IFieldDef, ILocalStep, IProcessHubItem, IProcessLink } from "./types";
import { exportCSV } from "./utils";
import VersigentLogo from "./VersigentLogo";
import CablesBackground from "./CablesBackground";
import ForceGraph, { IForceGraphHandle } from "./ForceGraph";
import StepDetailPanel from "./StepDetailPanel";
import IntakeForm from "./IntakeForm";
import AdminGate from "./AdminGate";
import AdminPanel from "./AdminPanel";

interface IFormCtx {
  mode: "new" | "chain" | "after" | "before" | "branch";
  ref: ILocalStep | null;
  subprocessParentId: number | null;
  branchFromId: number | null;
}

interface IProcessMapProps {
  process: IProcessHubItem;
  steps: ILocalStep[];
  processLinks: IProcessLink[];
  fieldConfig: IFieldDef[];
  inviteStatuses: Map<number, string>;
  saving: boolean;
  onBackToHub: () => void;
  onAddStep: (data: Record<string, string>, ctx: IFormCtx) => void;
  onUpdateStep: (updated: ILocalStep) => void;
  onDeleteStep: (step: ILocalStep) => void;
  onFieldConfigChange: (cfg: IFieldDef[]) => void;
  onInviteStatusChange: (stepId: number, status: string) => void;
}

export type { IFormCtx };

export default function ProcessMap({
  process, steps, processLinks, fieldConfig, inviteStatuses, saving,
  onBackToHub, onAddStep, onUpdateStep, onDeleteStep,
  onFieldConfigChange, onInviteStatusChange,
}: IProcessMapProps): JSX.Element {
  const [selectedStep, setSelectedStep] = useState<ILocalStep | null>(null);
  const [showForm,     setShowForm]     = useState(false);
  const [formCtx,      setFormCtx]      = useState<IFormCtx>({ mode: "new", ref: null, subprocessParentId: null, branchFromId: null });
  const [adminGate,    setAdminGate]    = useState(false);
  const [adminPanel,   setAdminPanel]   = useState(false);
  const graphRef = useRef<IForceGraphHandle>(null);

  const handleNodeClick = useCallback((step: ILocalStep) => {
    setSelectedStep(step);
    setTimeout(() => graphRef.current?.centerOn(step.id, 420), 50);
  }, []);

  const openForm = (mode: IFormCtx["mode"], ref: ILocalStep | null, subprocessParentId: number | null = null, branchFromId: number | null = null) => {
    setFormCtx({ mode, ref, subprocessParentId, branchFromId });
    setShowForm(true);
    setSelectedStep(null);
  };

  const handleInsertBetween = useCallback((src: ILocalStep) => openForm("after",  src), []);
  const handleAddBefore     = useCallback((step: ILocalStep) => openForm("before", step), []);
  const handleAddAfter      = useCallback((step: ILocalStep) => openForm("after",  step), []);
  const handleAddSubprocess = useCallback((parentId: number) => openForm("new", null, parentId), []);
  const handleBranch        = useCallback((step: ILocalStep) => openForm("branch", step, null, step.id), []);

  const handleSubmitForm = (data: Record<string, string>) => {
    onAddStep(data, formCtx);
    setShowForm(false);
    setFormCtx({ mode: "new", ref: null, subprocessParentId: null, branchFromId: null });
  };

  // ── Merge nextPerson-based links + explicit ProcessLinks for graph display ──
  const seenLinks = new Set<string>();
  const displayLinks: Array<{ source: number; target: number }> = [];
  const visibleForLinks = steps.filter(s => !s.subprocessParentId);
  visibleForLinks.forEach(s => {
    if (s.nextPerson) {
      const t = visibleForLinks.find(x => x.owner === s.nextPerson);
      if (t) { const k = `${s.id}-${t.id}`; if (!seenLinks.has(k)) { seenLinks.add(k); displayLinks.push({ source: s.id, target: t.id }); } }
    }
  });
  processLinks.forEach(l => {
    const k = `${l.sourceStepId}-${l.targetStepId}`;
    if (!seenLinks.has(k)) { seenLinks.add(k); displayLinks.push({ source: l.sourceStepId, target: l.targetStepId }); }
  });

  const handleUpdateStep = (updated: ILocalStep) => {
    onUpdateStep(updated);
    setSelectedStep(updated);
  };

  const visibleSteps = steps.filter(s => !s.subprocessParentId);
  const mc = visibleSteps.filter(s => s.manualOrAutomated === "Manual").length;
  const sc = visibleSteps.filter(s => s.manualOrAutomated === "Semi-Automated").length;
  const ac = visibleSteps.filter(s => s.manualOrAutomated === "Automated").length;

  return (
    <div style={{ width: "100%", height: "100vh", background: `linear-gradient(180deg,${B.navy} 0%,#0f1f30 50%,${B.navy} 100%)`, position: "relative", overflow: "hidden", fontFamily: "Inter,sans-serif" }}>
      <CablesBackground />

      {/* Header */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "18px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(180deg,rgba(10,21,32,0.97) 0%,transparent 100%)` }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <VersigentLogo height={18} />
            <span style={{ color: B.border, fontSize: 13 }}>·</span>
            <button onClick={onBackToHub} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: B.copper, fontSize: 12, fontWeight: 600, fontFamily: "Inter,sans-serif", letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 4 }}>
              Supply Chain Process Intelligence Hub
            </button>
            <span style={{ color: B.alum2, fontSize: 12, opacity: 0.4 }}>›</span>
            <span style={{ color: B.alum2, fontSize: 12, fontWeight: 500 }}>{process.name}</span>
          </div>
          <h1 style={{ color: B.warmWhite, fontSize: 20, margin: 0, fontWeight: 700, letterSpacing: -0.3 }}>Process Intelligence Map</h1>
          <p style={{ color: B.alum2, fontSize: 12, margin: "3px 0 0 0" }}>
            {process.name} · {visibleSteps.length} steps mapped
            {saving && <span style={{ color: B.copper, marginLeft: 10 }}>⏳ Saving…</span>}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, marginRight: 12 }}>
            {[{ l: "Manual", c: mc, co: "#9b1c1c" }, { l: "Semi", c: sc, co: B.gold }, { l: "Auto", c: ac, co: B.neon }].map(b => (
              <div key={b.l} style={{ display: "flex", alignItems: "center", gap: 5, background: `rgba(22,40,63,0.8)`, border: `1px solid ${B.borderFaint}`, borderRadius: 7, padding: "5px 11px" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: b.co }} />
                <span style={{ color: B.alum2, fontSize: 11, fontWeight: 500 }}>{b.c} {b.l}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => exportCSV(steps as unknown as Record<string, unknown>[], process.name)}
            style={{ padding: "9px 14px", background: "none", border: `1px solid ${B.border}`, borderRadius: 9, color: B.alum2, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" }}
          >↓ CSV</button>
          <button
            onClick={() => openForm("new", null)}
            style={{ padding: "9px 18px", background: `linear-gradient(135deg,${B.copper},${B.gold})`, border: "none", borderRadius: 9, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif", display: "flex", alignItems: "center", gap: 6 }}
          ><span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Add Step</button>
        </div>
      </div>

      {/* Force graph */}
      <ForceGraph
        ref={graphRef}
        steps={visibleSteps}
        allSteps={steps}
        links={displayLinks}
        branchLinks={processLinks.map(l => ({ source: l.sourceStepId, target: l.targetStepId }))}
        selectedNodeId={selectedStep?.id ?? null}
        subSteps={selectedStep ? steps.filter(s => s.subprocessParentId === selectedStep.id) : []}
        isSubprocess={false}
        onNodeClick={handleNodeClick}
        onInsertBetween={handleInsertBetween}
        onAddBefore={handleAddBefore}
        onAddAfter={handleAddAfter}
        onSubStepClick={handleNodeClick}
        onAddSubprocess={handleAddSubprocess}
      />

      {/* Step detail panel */}
      {selectedStep && (
        <StepDetailPanel
          step={selectedStep}
          steps={visibleSteps}
          fieldConfig={fieldConfig}
          inviteStatus={inviteStatuses.get(selectedStep.id)}
          processName={process.name}
          onClose={() => setSelectedStep(null)}
          onChain={s => openForm("chain", s)}
          onBranch={handleBranch}
          onUpdate={handleUpdateStep}
          onDelete={step => { onDeleteStep(step); setSelectedStep(null); }}
          onInviteStatusChange={s => onInviteStatusChange(selectedStep.id, s)}
        />
      )}

      {/* Intake form modal */}
      {showForm && (
        <IntakeForm
          fieldConfig={fieldConfig}
          chainedFrom={formCtx.ref}
          insertMode={formCtx.mode}
          onSubmit={handleSubmitForm}
          onCancel={() => { setShowForm(false); setFormCtx({ mode: "new", ref: null, subprocessParentId: null, branchFromId: null }); }}
        />
      )}

      {/* Admin gate / panel */}
      {adminGate && !adminPanel && (
        <AdminGate onSuccess={() => { setAdminGate(false); setAdminPanel(true); }} onClose={() => setAdminGate(false)} />
      )}
      {adminPanel && (
        <AdminPanel
          fieldConfig={fieldConfig}
          onSave={cfg => { onFieldConfigChange(cfg); setAdminPanel(false); }}
          onClose={() => setAdminPanel(false)}
        />
      )}

      {/* Footer hints */}
      <div style={{ position: "absolute", bottom: 18, left: 28, right: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#1e3a5f", fontSize: 12 }}>Click nodes to inspect · Click + to insert steps · Drag to rearrange · Scroll to zoom</span>
        <span style={{ color: "#0f2030", fontSize: 11, fontFamily: "Inter,monospace" }}>Coming soon: Outlook integration · Leadership dashboard · Branching flows</span>
      </div>

      {/* Hidden admin trigger */}
      <div
        onClick={() => { if (!adminPanel) setAdminGate(true); }}
        style={{ position: "absolute", bottom: 6, left: 10, fontSize: 11, color: B.copper, opacity: 0.05, userSelect: "none", cursor: "default", fontFamily: "Inter,monospace", transition: "opacity 0.4s" }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.15")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "0.05")}
      >◈</div>
    </div>
  );
}
