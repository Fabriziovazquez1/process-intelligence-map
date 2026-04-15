import * as React from "react";
import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as d3 from "d3";
import { B, BADGE_COLORS } from "./constants";
import { ILocalStep } from "./types";
import { wrapText } from "./utils";

export interface IForceGraphHandle {
  centerOn: (stepId: number, panelWidth: number) => void;
}

interface IForceGraphProps {
  steps: ILocalStep[];
  allSteps: ILocalStep[];
  links: Array<{ source: number; target: number }>;
  branchLinks?: Array<{ source: number; target: number }>;
  selectedNodeId: number | null;
  subSteps: ILocalStep[];
  isSubprocess: boolean;
  onNodeClick: (s: ILocalStep) => void;
  onInsertBetween: (src: ILocalStep) => void;
  onAddBefore: (s: ILocalStep) => void;
  onAddAfter: (s: ILocalStep) => void;
  onSubStepClick: (s: ILocalStep) => void;
  onAddSubprocess: (parentId: number) => void;
}

interface IFGNode extends d3.SimulationNodeDatum {
  id: number;
  label: string;
  owner: string;
  status: string;
  index: number;
}

const ForceGraph = forwardRef<IForceGraphHandle, IForceGraphProps>(
  function ForceGraph({ steps, allSteps, links: linksProp, branchLinks, selectedNodeId, subSteps, isSubprocess, onNodeClick, onInsertBetween, onAddBefore, onAddAfter, onSubStepClick, onAddSubprocess }, ref) {
    const svgRef      = useRef<SVGSVGElement>(null);
    const simRef      = useRef<d3.Simulation<IFGNode, undefined> | null>(null);
    const nodesRef    = useRef<IFGNode[]>([]);
    const zoomRef     = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const svgSelRef   = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
    const gGroupRef   = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

    useImperativeHandle(ref, () => ({
      centerOn(nodeId: number, panelW: number) {
        const n = nodesRef.current.find(x => x.id === nodeId);
        if (!n || n.x === undefined || !svgSelRef.current || !zoomRef.current) return;
        const el = svgSelRef.current.node()!;
        svgSelRef.current.transition().duration(480).call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate((el.clientWidth - panelW) / 2 - n.x!, el.clientHeight / 2 - n.y!)
        );
      },
    }));

    // ── Main graph ────────────────────────────────────────────────────────────
    useEffect(() => {
      if (!svgRef.current || steps.length === 0) return;
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      const W = svgRef.current.clientWidth, H = svgRef.current.clientHeight;
      const R = isSubprocess ? 54 : 64, PR = 14;
      const mId = isSubprocess ? "sarrow-sub" : "sarrow";
      const hasSubprocesses = allSteps
        ? new Set(allSteps.filter(s => s.subprocessParentId).map(s => s.subprocessParentId))
        : new Set<number | null>();

      const defs = svg.append("defs");
      defs.append("marker")
        .attr("id", mId).attr("viewBox", "0 -5 10 10").attr("refX", R + 12).attr("refY", 0)
        .attr("markerWidth", 7).attr("markerHeight", 7).attr("orient", "auto")
        .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", B.copper).attr("opacity", 0.8);

      const pg = defs.append("filter").attr("id", "plusG").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      pg.append("feDropShadow").attr("dx", 0).attr("dy", 0).attr("stdDeviation", 3).attr("flood-color", B.copper).attr("flood-opacity", 0.5);

      const ng = defs.append("filter").attr("id", "nodeG").attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%");
      ng.append("feDropShadow").attr("dx", 0).attr("dy", 0).attr("stdDeviation", 7).attr("flood-color", "#0d1927").attr("flood-opacity", 0.8);

      const nodes: IFGNode[] = steps.map((s, i) => ({
        id: s.id, label: s.stepName, owner: s.owner, status: s.manualOrAutomated, index: i,
      }));

      // ── Separate chain links from branch links ─────────────────────────────
      const allLinks = (linksProp || []).filter(l =>
        nodes.some(n => n.id === l.source) && nodes.some(n => n.id === l.target)
      );
      const branchPairSet = new Set((branchLinks || []).map(l => `${l.source}-${l.target}`));
      const chainLinks  = allLinks.filter(l => !branchPairSet.has(`${l.source}-${l.target}`));
      const activeBranchLinks = allLinks.filter(l =>  branchPairSet.has(`${l.source}-${l.target}`));

      // Branch target ids — these are NOT placed on the main horizontal spine
      const branchTargetSet = new Set(activeBranchLinks.map(l => l.target));
      // source → [branch target ids]
      const branchSourceMap = new Map<number, number[]>();
      activeBranchLinks.forEach(l => {
        if (!branchSourceMap.has(l.source)) branchSourceMap.set(l.source, []);
        branchSourceMap.get(l.source)!.push(l.target);
      });

      // ── Build main spine (chain nodes only, left-to-right) ─────────────────
      const hasInChain  = new Set(chainLinks.map(l => l.target));
      const headNs      = nodes.filter(n => !hasInChain.has(n.id) && !branchTargetSet.has(n.id));
      const hasOutChain = new Set(chainLinks.map(l => l.source));
      const hasIn       = new Set(allLinks.map(l => l.target));
      const hasOut      = new Set(allLinks.map(l => l.source));
      const tailIds     = nodes.filter(n => !hasOut.has(n.id)).map(n => n.id);

      const chainOrder: number[] = [], visited = new Set<number>();
      let cur: number | undefined = headNs[0]?.id;
      while (cur !== undefined && !visited.has(cur)) {
        visited.add(cur); chainOrder.push(cur);
        const ol = chainLinks.find(l => l.source === cur); cur = ol?.target;
      }
      // Any non-branch-target nodes not yet visited go at the end
      nodes.forEach(n => { if (!visited.has(n.id) && !branchTargetSet.has(n.id)) chainOrder.push(n.id); });

      // Pin spine nodes horizontally at vertical midpoint
      const spineCount = Math.max(chainOrder.length, 1);
      const hGap = Math.min(220, (W - 180) / Math.max(spineCount, 1));
      const totalW = (spineCount - 1) * hGap;
      const startX = Math.max(110, (W - totalW) / 2);
      chainOrder.forEach((id, i) => {
        const n = nodes.find(x => x.id === id); if (!n) return;
        n.x = startX + i * hGap; n.y = H / 2; n.fx = n.x; n.fy = n.y;
      });

      // ── Pin branch targets radially around their source node ───────────────
      const BRANCH_R = 185;
      branchSourceMap.forEach((targets, sourceId) => {
        const src = nodes.find(n => n.id === sourceId);
        if (!src || src.x === undefined) return;
        const N = targets.length;
        targets.forEach((targetId, i) => {
          const tgt = nodes.find(n => n.id === targetId);
          if (!tgt) return;
          // Fan below the source: spread from ~27° to ~153° (bottom semicircle)
          const angle = N === 1
            ? Math.PI / 2
            : Math.PI * 0.15 + (i / (N - 1)) * Math.PI * 0.7;
          tgt.x = src.x! + BRANCH_R * Math.cos(angle);
          tgt.y = src.y! + BRANCH_R * Math.sin(angle);
          tgt.fx = tgt.x;
          tgt.fy = tgt.y;
        });
      });

      // Use allLinks for simulation + drawing
      const links = allLinks;

      const g = svg.append("g");
      const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 3]).on("zoom", e => g.attr("transform", e.transform));
      svg.call(zoom);
      zoomRef.current = zoom; svgSelRef.current = svg as d3.Selection<SVGSVGElement, unknown, null, undefined>;
      nodesRef.current = nodes; gGroupRef.current = g;

      const link = g.append("g").selectAll<SVGLineElement, typeof links[0]>("line")
        .data(links).join("line")
        .attr("stroke", d => branchPairSet.has(`${d.source}-${d.target}`) ? B.sky : B.copper)
        .attr("stroke-opacity", d => branchPairSet.has(`${d.source}-${d.target}`) ? 0.55 : 0.4)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", d => branchPairSet.has(`${d.source}-${d.target}`) ? "6 3" : "none")
        .attr("marker-end", `url(#${mId})`);

      // Plus button helper
      type PlusData = { source?: number; target?: number; nodeId?: number };
      const mkPlus = (
        parent: d3.Selection<SVGGElement, unknown, null, undefined>,
        data: PlusData[],
        onClick: (d: PlusData) => void,
        label?: string
      ) => {
        const sel = parent.append("g").selectAll<SVGGElement, PlusData>("g").data(data).join("g")
          .style("cursor", "pointer")
          .on("click", (ev, d) => { ev.stopPropagation(); onClick(d); });
        sel.append("circle").attr("r", PR).attr("fill", B.navy).attr("stroke", B.border).attr("stroke-width", 1.5).attr("filter", "url(#plusG)").attr("opacity", 0.85);
        sel.append("text").text("+").attr("text-anchor", "middle").attr("dy", "0.35em").attr("fill", B.copper)
          .style("font-size", "15px").style("font-weight", "700").style("font-family", "Inter,sans-serif").style("pointer-events", "none");
        if (label) sel.append("text").text(label).attr("text-anchor", "middle").attr("dy", PR + 12).attr("fill", B.alum2)
          .style("font-size", "8px").style("font-family", "Inter,sans-serif").style("pointer-events", "none");
        sel
          .on("mouseenter", function() { d3.select(this).select("circle").transition().duration(130).attr("fill", B.packardMid).attr("stroke", B.copper).attr("opacity", 1).attr("r", PR + 2); })
          .on("mouseleave", function() { d3.select(this).select("circle").transition().duration(130).attr("fill", B.navy).attr("stroke", B.border).attr("opacity", 0.85).attr("r", PR); });
        return sel;
      };

      const midPlus  = mkPlus(g, links,                         d => { const s = steps.find(x => x.id === d.source); if (s) onInsertBetween(s); });
      const headPlus = mkPlus(g, headNs.map(n => ({ nodeId: n.id })), d => { const s = steps.find(x => x.id === d.nodeId); if (s) onAddBefore(s); }, "before");
      const tailPlus = mkPlus(g, tailIds.map(id => ({ nodeId: id })), d => { const s = steps.find(x => x.id === d.nodeId); if (s) onAddAfter(s); }, "after");

      const node = g.append("g").selectAll<SVGGElement, IFGNode>("g")
        .data(nodes).join("g").style("cursor", "pointer")
        .on("click", (_, d) => { const s = steps.find(x => x.id === d.id); if (s) onNodeClick(s); });

      node.call(
        d3.drag<SVGGElement, IFGNode>()
          .on("start", e => { e.sourceEvent.stopPropagation(); })
          .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; simRef.current?.alpha(0.3).restart(); })
          .on("end",   () => { /* keep pinned */ })
      );

      node.append("circle").attr("r", R + 5).attr("fill", "none")
        .attr("stroke", d => isSubprocess ? B.sky : (BADGE_COLORS[d.status]?.bg || B.copper))
        .attr("stroke-width", 1).attr("stroke-opacity", 0.15);
      node.append("circle").attr("r", R).attr("fill", B.packard)
        .attr("stroke", d => isSubprocess ? B.sky : (BADGE_COLORS[d.status]?.bg || B.copper))
        .attr("stroke-width", 2.5).attr("filter", "url(#nodeG)");

      node.each(function(d) {
        const el = d3.select(this);
        const lines = wrapText(d.label, 15), tH = lines.length * 13, sY = -(tH + 16) / 2;
        lines.forEach((ln, i) =>
          el.append("text").text(ln).attr("text-anchor", "middle").attr("dy", sY + i * 13 + 6)
            .attr("fill", B.warmWhite).style("font-size", "11px").style("font-family", "Inter,sans-serif")
            .style("font-weight", "600").style("pointer-events", "none")
        );
        el.append("text").text(d.owner).attr("text-anchor", "middle").attr("dy", sY + tH + 14)
          .attr("fill", B.alum2).style("font-size", "9.5px").style("font-family", "Inter,sans-serif").style("pointer-events", "none");
      });

      node.append("rect").attr("x", -30).attr("y", R - 22).attr("width", 60).attr("height", 18).attr("rx", 9)
        .attr("fill", d => BADGE_COLORS[d.status]?.bg || B.packardMid);
      node.append("text")
        .text(d => d.status === "Semi-Automated" ? "Semi-Auto" : d.status)
        .attr("text-anchor", "middle").attr("dy", R - 9)
        .attr("fill", d => BADGE_COLORS[d.status]?.text || B.warmWhite)
        .style("font-size", "8.5px").style("font-family", "Inter,sans-serif").style("font-weight", "700").style("pointer-events", "none");

      if (!isSubprocess) {
        node.each(function(d) {
          if (hasSubprocesses.has(d.id)) {
            d3.select(this).append("text").text("⤵")
              .attr("text-anchor", "middle").attr("dy", -(R + 8))
              .attr("fill", B.sky).style("font-size", "11px").style("pointer-events", "none");
          }
        });
      }

      node
        .on("mouseenter", function() { d3.select(this).selectAll<SVGCircleElement, IFGNode>("circle").filter((_, i) => i === 1).transition().duration(130).attr("stroke-width", 4); })
        .on("mouseleave", function() { d3.select(this).selectAll<SVGCircleElement, IFGNode>("circle").filter((_, i) => i === 1).transition().duration(130).attr("stroke-width", 2.5); });

      const sim = d3.forceSimulation<IFGNode>(nodes)
        .force("link", d3.forceLink<IFGNode, typeof links[0]>(links).id(d => d.id).distance(hGap * 0.9))
        .force("collide", d3.forceCollide<IFGNode>().radius(R + 20));
      simRef.current = sim;

      const tick = () => {
        link.attr("x1", d => (d.source as unknown as IFGNode).x!).attr("y1", d => (d.source as unknown as IFGNode).y!)
            .attr("x2", d => (d.target as unknown as IFGNode).x!).attr("y2", d => (d.target as unknown as IFGNode).y!);
        midPlus.attr("transform", d => {
          const src = d.source as unknown as IFGNode, tgt = d.target as unknown as IFGNode;
          return `translate(${(src.x! + tgt.x!) / 2},${(src.y! + tgt.y!) / 2})`;
        });
        headPlus.attr("transform", d => { const n = nodes.find(x => x.id === d.nodeId); if (!n) return ""; return `translate(${n.x! - hGap * 0.55},${n.y!})`; });
        tailPlus.attr("transform", d => { const n = nodes.find(x => x.id === d.nodeId); if (!n) return ""; return `translate(${n.x! + hGap * 0.55},${n.y!})`; });
        node.attr("transform", d => `translate(${d.x},${d.y})`);
      };
      sim.on("tick", tick);
      sim.tick(1); tick();
      return () => { sim.stop(); };
    }, [steps, isSubprocess, allSteps, linksProp, branchLinks]);

    // ── Satellite subprocess bubbles ──────────────────────────────────────────
    useEffect(() => {
      const g = gGroupRef.current; if (!g) return;
      g.selectAll(".sat-root").remove();
      if (!selectedNodeId) return;
      const parent = nodesRef.current.find(n => n.id === selectedNodeId);
      if (!parent || parent.x === undefined) return;

      const R_P = 64, R_S = 38, GAP_Y = 180;
      const subs = subSteps || [];
      const items: Array<ILocalStep | { __ghost: true; id: string }> =
        subs.length > 0 ? subs : [{ __ghost: true, id: "ghost-add" }];
      const count = items.length;
      const spread = count === 1 ? 0 : Math.min(count * 100, 400);

      const root = g.append("g").attr("class", "sat-root").attr("opacity", 0);
      root.transition().duration(260).ease(d3.easeCubicOut).attr("opacity", 1);

      items.forEach((item, i) => {
        const ox = count === 1 ? 0 : -spread / 2 + i * (spread / (count - 1));
        const cx = parent.x! + ox;
        const cy = parent.y! + GAP_Y;

        root.append("line")
          .attr("x1", parent.x!).attr("y1", parent.y! + R_P + 2)
          .attr("x2", cx).attr("y2", cy - R_S - 2)
          .attr("stroke", B.sky)
          .attr("stroke-width", (item as { __ghost?: boolean }).__ghost ? 0.8 : 1.2)
          .attr("stroke-dasharray", "4 3")
          .attr("opacity", (item as { __ghost?: boolean }).__ghost ? 0.18 : 0.38);

        const ig = root.append("g").attr("transform", `translate(${cx},${cy})`).style("cursor", "pointer");

        if ((item as { __ghost?: boolean }).__ghost) {
          ig.append("circle").attr("r", R_S)
            .attr("fill", "rgba(116,210,231,0.03)").attr("stroke", B.sky)
            .attr("stroke-width", 1.5).attr("stroke-dasharray", "5 4").attr("opacity", 0.4);
          ig.append("text").text("+").attr("text-anchor", "middle").attr("dy", "0.38em")
            .attr("fill", B.sky).style("font-size", "20px").style("opacity", "0.5").style("pointer-events", "none");
          ig.append("text").text("Add sub-step").attr("text-anchor", "middle").attr("dy", R_S + 14)
            .attr("fill", B.alum2).style("font-size", "8.5px").style("opacity", "0.55").style("pointer-events", "none");
          ig.on("click", ev => { ev.stopPropagation(); onAddSubprocess(selectedNodeId); });
          ig.on("mouseenter", function() { d3.select(this).select("circle").transition().duration(130).attr("opacity", 0.75).attr("stroke-width", 2.5); });
          ig.on("mouseleave", function() { d3.select(this).select("circle").transition().duration(130).attr("opacity", 0.4).attr("stroke-width", 1.5); });
        } else {
          const step = item as ILocalStep;
          const badge = BADGE_COLORS[step.manualOrAutomated] || BADGE_COLORS.Manual;
          ig.append("circle").attr("r", R_S + 5).attr("fill", "none").attr("stroke", B.sky).attr("stroke-width", 1).attr("stroke-opacity", 0.15);
          ig.append("circle").attr("r", R_S).attr("class", "sat-main-circle")
            .attr("fill", B.packard).attr("stroke", B.sky).attr("stroke-width", 2).attr("filter", "url(#nodeG)");
          const lines = wrapText(step.stepName || "", 10), tH = lines.length * 11;
          lines.forEach((ln, li) =>
            ig.append("text").text(ln).attr("text-anchor", "middle").attr("dy", -tH / 2 + li * 11 + 5)
              .attr("fill", B.warmWhite).style("font-size", "9px").style("font-weight", "600").style("pointer-events", "none")
          );
          ig.append("text").text(step.owner || "").attr("text-anchor", "middle").attr("dy", tH / 2 + 14)
            .attr("fill", B.alum2).style("font-size", "8px").style("pointer-events", "none");
          ig.append("rect").attr("x", -22).attr("y", R_S - 14).attr("width", 44).attr("height", 13).attr("rx", 6).attr("fill", badge.bg);
          ig.append("text")
            .text(step.manualOrAutomated === "Semi-Automated" ? "Semi" : step.manualOrAutomated)
            .attr("text-anchor", "middle").attr("dy", R_S - 4)
            .attr("fill", badge.text).style("font-size", "7px").style("font-weight", "700").style("pointer-events", "none");
          ig.on("click", ev => { ev.stopPropagation(); onSubStepClick(step); });
          ig.on("mouseenter", function() { d3.select(this).select(".sat-main-circle").transition().duration(130).attr("stroke-width", 3.5); });
          ig.on("mouseleave", function() { d3.select(this).select(".sat-main-circle").transition().duration(130).attr("stroke-width", 2); });
        }
      });

      return () => { gGroupRef.current?.selectAll(".sat-root").remove(); };
    }, [selectedNodeId, subSteps]);

    return <svg ref={svgRef} style={{ width: "100%", height: "100%", background: "transparent" }} />;
  }
);

export default ForceGraph;
