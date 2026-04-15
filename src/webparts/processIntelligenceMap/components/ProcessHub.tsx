import * as React from "react";
import { useRef, useImperativeHandle, forwardRef } from "react";
import { B } from "./constants";
import { IProcessHubItem } from "./types";
import VersigentLogo from "./VersigentLogo";
import CablesBackground from "./CablesBackground";
import HubGraph, { IHubGraphHandle } from "./HubGraph";

export interface IProcessHubHandle {
  getScreenPos: (id: number) => { x: number; y: number } | null;
}

interface IProcessHubProps {
  processes: IProcessHubItem[];
  links: Array<{ source: number; target: number }>;
  stepCounts: Record<number, number>;
  onProcessClick: (p: IProcessHubItem, screenX: number, screenY: number) => void;
}

const ProcessHub = forwardRef<IProcessHubHandle, IProcessHubProps>(
  function ProcessHub({ processes, links, stepCounts, onProcessClick }, ref) {
    const graphRef = useRef<IHubGraphHandle>(null);

    useImperativeHandle(ref, () => ({
      getScreenPos: (id: number) => graphRef.current?.getScreenPos(id) || null,
    }));

    return (
      <div style={{ width: "100%", height: "100vh", background: `linear-gradient(160deg,${B.navy} 0%,#0f1f30 60%,${B.navy} 100%)`, position: "relative", overflow: "hidden", fontFamily: "Inter,sans-serif" }}>
        <CablesBackground />

        {/* Header */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, padding: "22px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", background: `linear-gradient(180deg,rgba(10,21,32,0.95) 0%,transparent 100%)` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <VersigentLogo height={26} />
            <div style={{ width: 1, height: 32, background: B.border }} />
            <div>
              <h1 style={{ color: B.warmWhite, fontSize: 20, margin: 0, fontWeight: 700, letterSpacing: -0.3 }}>Supply Chain Process Intelligence Hub</h1>
              <p style={{ color: B.alum2, fontSize: 12, margin: "3px 0 0 0", fontWeight: 400 }}>Versigent Operations · {processes.length} processes</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: `rgba(205,121,37,0.08)`, border: `1px solid ${B.border}`, borderRadius: 8, padding: "6px 14px" }}>
              <span style={{ color: B.copper, fontSize: 12, fontWeight: 600 }}>Source-to-Pay</span>
              <span style={{ color: B.alum2, fontSize: 12 }}> is live</span>
            </div>
          </div>
        </div>

        <HubGraph
          ref={graphRef}
          processes={processes}
          links={links}
          stepCounts={stepCounts}
          onProcessClick={onProcessClick}
        />

        {/* Footer */}
        <div style={{ position: "absolute", bottom: 20, left: 32, right: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#1e3a5f", fontSize: 12 }}>Click a process to explore · Drag bubbles to rearrange</span>
          <span style={{ color: "#0f2030", fontSize: 11, fontFamily: "Inter,monospace" }}>Coming soon: Order-to-Cash</span>
        </div>
      </div>
    );
  }
);

export default ProcessHub;
