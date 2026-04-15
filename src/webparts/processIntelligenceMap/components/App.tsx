import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { IAppProps } from "./IAppProps";
import { B, PROCESS_VISUAL_CONFIG, PROCESS_LINK_NAMES } from "./constants";
import { IFieldDef, ILocalStep, IProcessHubItem, IProcessLink } from "./types";
import { loadFieldConfig, saveFieldConfig } from "./utils";
import { SharePointService, IProcessStep } from "../services/SharePointService";
import { IFormCtx } from "./ProcessMap";
import ProcessHub, { IProcessHubHandle } from "./ProcessHub";
import ProcessMap from "./ProcessMap";
import ZoomOverlay from "./ZoomOverlay";

// ─── Adapter: IProcessStep (service) → ILocalStep (UI) ───────────────────────
function toLocal(s: IProcessStep): ILocalStep {
  return s as unknown as ILocalStep;
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App({ sp, context }: IAppProps): JSX.Element {
  // Initialise SP service once
  SharePointService.init(sp, context.pageContext.web.serverRelativeUrl);

  // ── View state ──────────────────────────────────────────────────────────────
  const [view,          setView]         = useState<"hub" | "map">("hub");
  const [activeProcess, setActiveProcess]= useState<IProcessHubItem | null>(null);
  const [zooming,       setZooming]      = useState(false);
  const hubRef = useRef<IProcessHubHandle>(null);

  // ── Process map list (from SP) ──────────────────────────────────────────────
  const [processMaps, setProcessMaps] = useState<IProcessHubItem[]>([]);
  const [hubLinks,    setHubLinks]    = useState<Array<{ source: number; target: number }>>([]);
  const [mapsLoading, setMapsLoading] = useState(true);

  // ── Steps for the active process (from SP) ──────────────────────────────────
  const [steps,        setSteps]       = useState<ILocalStep[]>([]);
  const [processLinks, setProcessLinks]= useState<IProcessLink[]>([]);
  const [stepsLoading, setStepsLoading]= useState(false);
  const [saving,       setSaving]      = useState(false);
  const [stepsVersion, setStepsVersion]= useState(0); // bump to force re-fetch

  // ── Field config (localStorage) ─────────────────────────────────────────────
  const [fieldConfig, setFieldConfig] = useState<IFieldDef[]>(() => loadFieldConfig());

  // ── Per-step invite status (local only — not persisted to SP) ───────────────
  const [inviteStatuses, setInviteStatuses] = useState<Map<number, string>>(new Map());

  // ── Load process maps on mount ──────────────────────────────────────────────
  useEffect(() => {
    setMapsLoading(true);
    SharePointService.getProcessMaps()
      .then(maps => {
        const hubs: IProcessHubItem[] = maps.map(pm => {
          const vis = PROCESS_VISUAL_CONFIG[pm.name] || { domain: "Operations", accent: B.copper };
          return { id: pm.id, name: pm.name, domain: vis.domain, accent: vis.accent, active: pm.isActive };
        });
        setProcessMaps(hubs);

        // Build hub-level links by matching process names
        const links: Array<{ source: number; target: number }> = [];
        PROCESS_LINK_NAMES.forEach(ln => {
          const src = hubs.find(h => h.name === ln.source);
          const tgt = hubs.find(h => h.name === ln.target);
          if (src && tgt) links.push({ source: src.id, target: tgt.id });
        });
        setHubLinks(links);
      })
      .catch(err => console.error("Failed to load process maps:", err))
      .finally(() => setMapsLoading(false));
  }, []);

  // ── Load steps + links whenever we enter a map ───────────────────────────────
  useEffect(() => {
    if (!activeProcess) return;
    setStepsLoading(true);
    setSteps([]);
    setProcessLinks([]);
    Promise.all([
      SharePointService.getSteps(activeProcess.id),
      SharePointService.getLinks(activeProcess.id),
    ])
      .then(([loaded, links]) => {
        setSteps(loaded.map(toLocal));
        setProcessLinks(links);
      })
      .catch(err => console.error("Failed to load steps/links:", err))
      .finally(() => setStepsLoading(false));
  }, [activeProcess?.id, stepsVersion]);

  // ── Step counts displayed on hub bubbles ────────────────────────────────────
  const stepCounts: Record<number, number> = {};
  if (activeProcess) {
    stepCounts[activeProcess.id] = steps.filter(s => !s.subprocessParentId).length;
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleProcessClick = (process: IProcessHubItem) => {
    setActiveProcess(process);
    setStepsVersion(v => v + 1); // always re-fetch from SP when entering a map
    setView("map");
    setZooming(true);
    setTimeout(() => setZooming(false), 400);
  };

  const handleBackToHub = () => {
    setView("hub");
    setZooming(true);
    setTimeout(() => setZooming(false), 400);
  };

  // ── Add step ────────────────────────────────────────────────────────────────
  const handleAddStep = async (data: Record<string, string>, ctx: IFormCtx) => {
    if (!activeProcess) return;
    setSaving(true);

    const newStepBase = {
      processMapId:        activeProcess.id,
      subprocessParentId:  ctx.subprocessParentId ?? null,
      stepName:            data.stepName            || "",
      owner:               data.owner               || "",
      ownerEmail:          data.ownerEmail           || "",
      manualOrAutomated:   (data.manualOrAutomated as "Manual" | "Semi-Automated" | "Automated") || "Manual",
      sortOrder:           steps.filter(s => !s.subprocessParentId).length,
      description:         data.description          || "",
      dataCollected:       data.dataCollected         || "",
      dataSource:          data.dataSource            || "",
      transformation:      data.transformation        || "",
      output:              data.output                || "",
      nextPerson:          data.nextPerson            || "",
      nextPersonEmail:     data.nextPersonEmail       || "",
      frequency:           data.frequency             || "Daily",
      timeSpent:           data.timeSpent             || "",
      systemsTouched:      data.systemsTouched        || "",
      painPoints:          data.painPoints            || "",
    };

    // Inherit/override nextPerson for insert modes
    if (ctx.mode === "after" && ctx.ref) {
      newStepBase.nextPerson      = data.nextPerson      || ctx.ref.nextPerson      || "";
      newStepBase.nextPersonEmail = data.nextPersonEmail || ctx.ref.nextPersonEmail || "";
    }
    if (ctx.mode === "before" && ctx.ref) {
      newStepBase.nextPerson      = ctx.ref.owner;
      newStepBase.nextPersonEmail = ctx.ref.ownerEmail;
    }

    try {
      const created  = await SharePointService.addStep(newStepBase);
      const newLocal = toLocal(created);

      // After insert: update predecessor to point to new step
      if (ctx.mode === "after" && ctx.ref) {
        await SharePointService.updateStep(ctx.ref.id, {
          nextPerson:      newStepBase.owner,
          nextPersonEmail: newStepBase.ownerEmail,
        });
        setSteps(prev => prev.map(s =>
          s.id === ctx.ref!.id
            ? { ...s, nextPerson: newStepBase.owner, nextPersonEmail: newStepBase.ownerEmail }
            : s
        ));
      }

      // Before insert: update any predecessor that pointed at the "before" step
      if (ctx.mode === "before" && ctx.ref) {
        const preds = steps.filter(s => s.nextPerson === ctx.ref!.owner);
        for (const pred of preds) {
          await SharePointService.updateStep(pred.id, {
            nextPerson:      newStepBase.owner,
            nextPersonEmail: newStepBase.ownerEmail,
          });
        }
        setSteps(prev => prev.map(s =>
          s.nextPerson === ctx.ref!.owner
            ? { ...s, nextPerson: newStepBase.owner, nextPersonEmail: newStepBase.ownerEmail }
            : s
        ));
      }

      setSteps(prev => [...prev, newLocal]);

      // Branch mode: create a ProcessLinks entry from source → new step
      if (ctx.mode === "branch" && ctx.branchFromId !== null && newLocal.id) {
        const newLink = await SharePointService.addLink(ctx.branchFromId, newLocal.id, activeProcess.id);
        setProcessLinks(prev => [...prev, newLink]);
      }
    } catch (err: unknown) {
      console.error("Failed to add step:", err);
      alert("Could not save step. Check the console for details.");
    } finally {
      setSaving(false);
    }
  };

  // ── Update step ─────────────────────────────────────────────────────────────
  const handleUpdateStep = async (updated: ILocalStep) => {
    setSteps(prev => prev.map(s => s.id === updated.id ? updated : s)); // optimistic
    try {
      await SharePointService.updateStep(updated.id, {
        stepName:          updated.stepName,
        owner:             updated.owner,
        ownerEmail:        updated.ownerEmail,
        manualOrAutomated: updated.manualOrAutomated,
        description:       updated.description,
        dataCollected:     updated.dataCollected,
        dataSource:        updated.dataSource,
        transformation:    updated.transformation,
        output:            updated.output,
        nextPerson:        updated.nextPerson,
        nextPersonEmail:   updated.nextPersonEmail,
        frequency:         updated.frequency,
        timeSpent:         updated.timeSpent,
        systemsTouched:    updated.systemsTouched,
        painPoints:        updated.painPoints,
      });
    } catch (err) {
      console.error("Failed to update step:", err);
    }
  };

  // ── Delete step ─────────────────────────────────────────────────────────────
  const handleDeleteStep = async (step: ILocalStep) => {
    // Optimistic: remove step and its links
    setSteps(prev => {
      const u = prev.filter(s => s.id !== step.id);
      const predIdx = u.findIndex(s => s.nextPerson === step.owner);
      if (predIdx !== -1) {
        u[predIdx] = { ...u[predIdx], nextPerson: step.nextPerson || "", nextPersonEmail: step.nextPersonEmail || "" };
      }
      return u;
    });
    setProcessLinks(prev => prev.filter(l => l.sourceStepId !== step.id && l.targetStepId !== step.id));
    try {
      const pred = steps.find(s => s.nextPerson === step.owner && s.id !== step.id);
      if (pred) {
        await SharePointService.updateStep(pred.id, {
          nextPerson:      step.nextPerson      || "",
          nextPersonEmail: step.nextPersonEmail || "",
        });
      }
      await Promise.all([
        SharePointService.deleteStep(step.id),
        activeProcess ? SharePointService.deleteLinksForStep(step.id, activeProcess.id) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Failed to delete step:", err);
    }
  };

  // ── Field config ────────────────────────────────────────────────────────────
  const handleFieldConfigChange = (cfg: IFieldDef[]) => {
    setFieldConfig(cfg);
    saveFieldConfig(cfg);
  };

  // ── Invite status ───────────────────────────────────────────────────────────
  const handleInviteStatusChange = (stepId: number, status: string) => {
    setInviteStatuses(prev => new Map(prev).set(stepId, status));
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (mapsLoading) {
    return (
      <div style={{ width: "100%", height: "100vh", background: B.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: B.copper, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Process Intelligence Map</div>
          <div style={{ color: B.alum2, fontSize: 13 }}>Loading process maps…</div>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>

      {/* Hub view — always mounted so D3 preserves node positions for back-nav */}
      <div style={{
        position: "absolute", inset: 0,
        visibility:    view === "hub" ? "visible" : "hidden",
        pointerEvents: view === "hub" ? "auto"    : "none",
      }}>
        <ProcessHub
          ref={hubRef}
          processes={processMaps}
          links={hubLinks}
          stepCounts={stepCounts}
          onProcessClick={handleProcessClick}
        />
      </div>

      {/* Map view */}
      <div style={{
        position: "absolute", inset: 0,
        visibility:    view === "map" ? "visible" : "hidden",
        pointerEvents: view === "map" ? "auto"    : "none",
      }}>
        {activeProcess && (
          stepsLoading ? (
            <div style={{ width: "100%", height: "100vh", background: B.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif" }}>
              <div style={{ color: B.alum2, fontSize: 13 }}>Loading {activeProcess.name}…</div>
            </div>
          ) : (
            <ProcessMap
              process={activeProcess}
              steps={steps}
              processLinks={processLinks}
              fieldConfig={fieldConfig}
              inviteStatuses={inviteStatuses}
              saving={saving}
              onBackToHub={handleBackToHub}
              onAddStep={handleAddStep}
              onUpdateStep={handleUpdateStep}
              onDeleteStep={handleDeleteStep}
              onFieldConfigChange={handleFieldConfigChange}
              onInviteStatusChange={handleInviteStatusChange}
            />
          )
        )}
      </div>

      {/* Crossfade transition overlay */}
      {zooming && <ZoomOverlay onComplete={() => {}} />}
    </div>
  );
}
