import * as React from "react";
import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as d3 from "d3";
import { B } from "./constants";
import { IProcessHubItem } from "./types";
import { wrapText } from "./utils";

export interface IHubGraphHandle {
  getScreenPos: (id: number) => { x: number; y: number } | null;
}

interface IHubGraphProps {
  processes: IProcessHubItem[];
  links: Array<{ source: number; target: number }>;
  stepCounts: Record<number, number>;
  onProcessClick: (p: IProcessHubItem, screenX: number, screenY: number) => void;
}

interface IHubNode extends IProcessHubItem, d3.SimulationNodeDatum {
  steps: number;
}

const HubGraph = forwardRef<IHubGraphHandle, IHubGraphProps>(
  function HubGraph({ processes, links, stepCounts, onProcessClick }, ref) {
    const svgRef    = useRef<SVGSVGElement>(null);
    const simRef    = useRef<d3.Simulation<IHubNode, undefined> | null>(null);
    const screenRef = useRef<Record<number, { x: number; y: number }>>({});

    useImperativeHandle(ref, () => ({
      getScreenPos: (id: number) => screenRef.current[id] || null,
    }));

    useEffect(() => {
      if (!svgRef.current || processes.length === 0) return;
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();
      const W = svgRef.current.clientWidth;
      const H = svgRef.current.clientHeight;
      const R = 82;

      const defs = svg.append("defs");
      defs.append("marker")
        .attr("id", "harrow").attr("viewBox", "0 -5 10 10").attr("refX", R + 12).attr("refY", 0)
        .attr("markerWidth", 7).attr("markerHeight", 7).attr("orient", "auto")
        .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", B.copper).attr("opacity", 0.7);

      const glow = defs.append("filter").attr("id", "hubGlow").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
      glow.append("feDropShadow").attr("dx", 0).attr("dy", 0).attr("stdDeviation", 10).attr("flood-color", "#CD7925").attr("flood-opacity", 0.3);

      const glowBlue = defs.append("filter").attr("id", "hubGlowBlue").attr("x", "-40%").attr("y", "-40%").attr("width", "180%").attr("height", "180%");
      glowBlue.append("feDropShadow").attr("dx", 0).attr("dy", 0).attr("stdDeviation", 8).attr("flood-color", "#0857C3").attr("flood-opacity", 0.35);

      const nodes: IHubNode[] = processes.map(p => ({ ...p, steps: stepCounts[p.id] || 0 }));
      const linkData = links.map(l => ({ ...l }));

      // Pin nodes horizontally
      const spacing = W / (nodes.length + 1);
      nodes.forEach((n, i) => {
        n.x = spacing * (i + 1);
        n.y = H / 2;
        n.fx = n.x;
        n.fy = n.y;
      });

      const g = svg.append("g");
      const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 2])
        .on("zoom", e => g.attr("transform", e.transform));
      svg.call(zoom);

      const linkPaths = g.append("g").selectAll<SVGPathElement, typeof linkData[0]>("path")
        .data(linkData).join("path")
        .attr("fill", "none")
        .attr("stroke", B.copper).attr("stroke-opacity", 0.45).attr("stroke-width", 1.8)
        .attr("marker-end", "url(#harrow)");

      const linkLabels = g.append("g").selectAll<SVGTextElement, typeof linkData[0]>("text")
        .data(linkData).join("text")
        .attr("text-anchor", "middle").attr("fill", B.copper).attr("fill-opacity", 0.5)
        .style("font-size", "9px").style("font-family", "Inter,sans-serif")
        .style("font-weight", "500").style("pointer-events", "none")
        .text("feeds into");

      const node = g.append("g").selectAll<SVGGElement, IHubNode>("g")
        .data(nodes).join("g")
        .style("cursor", d => d.active ? "pointer" : "grab")
        .on("click", (event, d) => {
          if (!d.active) return;
          const svgEl = svgRef.current!;
          const rect = svgEl.getBoundingClientRect();
          const t = d3.zoomTransform(svgEl);
          const sx = rect.left + t.applyX(d.x!);
          const sy = rect.top  + t.applyY(d.y!);
          onProcessClick(d, sx, sy);
        });

      node.append("circle").attr("r", R + 14).attr("fill", "none")
        .attr("stroke", d => d.active ? d.accent : "#334155")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", d => d.active ? 0.18 : 0.07)
        .attr("stroke-dasharray", d => d.active ? "none" : "4 4");

      node.append("circle").attr("r", R)
        .attr("fill", B.packard)
        .attr("stroke", d => d.active ? d.accent : "#2a3f57")
        .attr("stroke-width", d => d.active ? 2.5 : 1.5)
        .attr("opacity", d => d.active ? 1 : 0.55)
        .attr("filter", d => d.active ? (d.accent === B.copper ? "url(#hubGlow)" : "url(#hubGlowBlue)") : "none");

      node.append("rect")
        .attr("x", d => -(d.domain.length * 3.8))
        .attr("y", -R + 14).attr("height", 16)
        .attr("width", d => d.domain.length * 7.6)
        .attr("rx", 8)
        .attr("fill", d => d.active ? d.accent : "#2a3f57")
        .attr("opacity", d => d.active ? 0.2 : 0.15);

      node.append("text").text(d => d.domain)
        .attr("text-anchor", "middle").attr("dy", -R + 25)
        .attr("fill", d => d.active ? d.accent : B.alum2)
        .style("font-size", "9px").style("font-family", "Inter,sans-serif")
        .style("font-weight", "600").style("letter-spacing", "0.8px")
        .style("text-transform", "uppercase").style("pointer-events", "none");

      node.each(function(d) {
        const el = d3.select(this);
        const lines = wrapText(d.name, 14);
        const lineH = 15, totalH = lines.length * lineH;
        const startY = -totalH / 2 + 4;
        lines.forEach((ln, i) => {
          el.append("text").text(ln)
            .attr("text-anchor", "middle").attr("dy", startY + i * lineH + 2)
            .attr("fill", d.active ? B.warmWhite : B.alum2)
            .style("font-size", "12px").style("font-family", "Inter,sans-serif")
            .style("font-weight", "700").style("pointer-events", "none");
        });
      });

      node.append("text")
        .text(d => d.active ? (d.steps > 0 ? `${d.steps} steps mapped` : "Start mapping") : "Coming soon")
        .attr("text-anchor", "middle").attr("dy", R - 22)
        .attr("fill", d => d.active ? d.accent : "#334155")
        .style("font-size", "9.5px").style("font-family", "Inter,sans-serif")
        .style("font-weight", "500").style("pointer-events", "none");

      node
        .on("mouseenter", function(_, d) {
          if (!d.active) return;
          d3.select(this).select<SVGCircleElement>("circle:nth-of-type(2)").transition().duration(150).attr("stroke-width", 4);
        })
        .on("mouseleave", function(_, d) {
          if (!d.active) return;
          d3.select(this).select<SVGCircleElement>("circle:nth-of-type(2)").transition().duration(150).attr("stroke-width", 2.5);
        });

      node.call(
        d3.drag<SVGGElement, IHubNode>()
          .on("start", (e) => { e.sourceEvent.stopPropagation(); })
          .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; simRef.current?.alpha(0.3).restart(); })
          .on("end", () => { /* keep pinned */ })
      );

      const updateScreenRef = () => {
        const svgEl = svgRef.current; if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        const t = d3.zoomTransform(svgEl);
        nodes.forEach(n => {
          screenRef.current[n.id] = { x: rect.left + t.applyX(n.x!), y: rect.top + t.applyY(n.y!) };
        });
      };

      const sim = d3.forceSimulation<IHubNode>(nodes)
        .force("link", d3.forceLink(linkData).id((d: d3.SimulationNodeDatum) => (d as IHubNode).id).distance(spacing * 0.8))
        .force("collide", d3.forceCollide<IHubNode>().radius(R + 30));
      simRef.current = sim;

      sim.on("tick", () => {
        updateScreenRef();
        linkPaths.attr("d", d => {
          const src = d.source as unknown as IHubNode;
          const tgt = d.target as unknown as IHubNode;
          const mx = (src.x! + tgt.x!) / 2, my = (src.y! + tgt.y!) / 2 - 30;
          return `M${src.x},${src.y} Q${mx},${my} ${tgt.x},${tgt.y}`;
        });
        linkLabels
          .attr("x", d => ((d.source as unknown as IHubNode).x! + (d.target as unknown as IHubNode).x!) / 2)
          .attr("y", d => ((d.source as unknown as IHubNode).y! + (d.target as unknown as IHubNode).y!) / 2 - 38);
        node.attr("transform", d => `translate(${d.x},${d.y})`);
      });

      sim.tick(1);
      updateScreenRef();
      linkPaths.attr("d", d => {
        const src = d.source as unknown as IHubNode;
        const tgt = d.target as unknown as IHubNode;
        const mx = (src.x! + tgt.x!) / 2, my = (src.y! + tgt.y!) / 2 - 30;
        return `M${src.x},${src.y} Q${mx},${my} ${tgt.x},${tgt.y}`;
      });
      linkLabels
        .attr("x", d => ((d.source as unknown as IHubNode).x! + (d.target as unknown as IHubNode).x!) / 2)
        .attr("y", d => ((d.source as unknown as IHubNode).y! + (d.target as unknown as IHubNode).y!) / 2 - 38);
      node.attr("transform", d => `translate(${d.x},${d.y})`);

      return () => { sim.stop(); };
    }, [processes, links, stepCounts]);

    return <svg ref={svgRef} style={{ width: "100%", height: "100%", background: "transparent" }} />;
  }
);

export default HubGraph;
