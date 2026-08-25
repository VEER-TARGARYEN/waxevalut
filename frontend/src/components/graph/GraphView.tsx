/** Page 3 — Graph explorer. A living spatial view of an entity neighbourhood via Cytoscape
 *  (lazy-loaded). Entities large, facts smaller, sources compact; classification colours the
 *  facts. Selecting a node opens a contextual inspector — the graph stays visible, context is
 *  never abandoned. The Cytoscape instance is created once and only its elements are diffed;
 *  it does not re-init when the inspector opens. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type cytoscape from "cytoscape";
import { useGraph } from "@/hooks/queries";
import { useApp } from "@/store/app";
import { Segmented, IconButton } from "@/components/ui/primitives";
import { Fit, ZoomIn, ZoomOut, Search } from "@/components/ui/icons";
import { GraphInspector, type SelectedNode } from "./GraphInspector";
import { SearchBar } from "@/components/recall/SearchBar";
import { CLASS_META } from "@/lib/format";

let cyLib: typeof cytoscape | null = null;
async function loadCy() {
  if (cyLib) return cyLib;
  const [{ default: cy }, { default: fcose }] = await Promise.all([
    import("cytoscape"),
    import("cytoscape-fcose"),
  ]);
  cy.use(fcose as never);
  cyLib = cy;
  return cy;
}

const BRASS = "#e0a860";
// Cytoscape's style typings are notoriously strict about px vs number; an untyped array is
// the conventional, readable way to author a stylesheet.
const stylesheet = () =>
  [
    {
      selector: "node",
      style: {
        label: "data(label)",
        color: "#a4a9b4",
        "font-size": 9,
        "font-family": "Inter, sans-serif",
        "text-valign": "bottom",
        "text-margin-y": 5,
        "text-max-width": "90px",
        "text-wrap": "ellipsis",
        "border-width": 1,
        "transition-property": "opacity, border-color, background-color",
        "transition-duration": "180ms",
      },
    },
    {
      selector: 'node[type="entity"]',
      style: { width: 34, height: 34, "background-color": "#1b2530", "border-color": "#3a4a5a", color: "#eceef2", "font-size": 10 },
    },
    {
      selector: 'node[type="fact"]',
      style: { width: 16, height: 16, "background-color": "data(color)", "border-color": "data(color)", "border-opacity": 0.5, shape: "round-rectangle" },
    },
    {
      selector: 'node[type="source"]',
      style: { width: 11, height: 11, "background-color": "#2a2d33", "border-color": "#3a3f47", shape: "diamond", color: "#6f747f", "font-size": 8 },
    },
    {
      selector: "edge",
      style: {
        width: 1,
        "line-color": "#2a2e35",
        "curve-style": "bezier",
        "target-arrow-shape": "none",
        opacity: 0.7,
        "transition-property": "opacity, line-color",
        "transition-duration": "180ms",
      },
    },
    { selector: 'edge[type="RELATES_TO"], edge[label]', style: { "line-color": "#3a4250", width: 1.4 } },
    { selector: "node:selected", style: { "border-color": BRASS, "border-width": 2.5, color: "#fff" } },
    { selector: ".faded", style: { opacity: 0.18 } },
    { selector: ".hl", style: { "line-color": BRASS, opacity: 1, width: 2 } },
    { selector: ".hlnode", style: { "border-color": BRASS, "border-opacity": 0.7 } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any;

export function GraphView({ entity, embedded = false }: { entity: string; embedded?: boolean }) {
  const agentId = useApp((s) => s.activeAgentId);
  const [depth, setDepth] = useState(2);
  const { data } = useGraph(entity, agentId, depth);
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [selected, setSelected] = useState<SelectedNode | null>(null);
  const [ready, setReady] = useState(false);

  // init once
  useEffect(() => {
    let disposed = false;
    loadCy().then((cy) => {
      if (disposed || !containerRef.current || cyRef.current) return;
      const inst = cy({
        container: containerRef.current,
        style: stylesheet(),
        minZoom: 0.15,
        maxZoom: 4,
        // Google-Maps-like feel: responsive wheel-zoom toward the cursor, free drag-pan.
        wheelSensitivity: 0.4,
        boxSelectionEnabled: false,
        autoungrabify: false,
      });
      cyRef.current = inst;
      setReady(true);

      inst.on("tap", "node", (e) => {
        const n = e.target as cytoscape.NodeSingular;
        highlightNeighborhood(inst, n);
        setSelected({
          id: n.id(),
          label: n.data("label"),
          type: n.data("type"),
          kind: n.data("kind"),
          dataClass: n.data("dataClass"),
          entity: n.data("entityName"),
          connections: n.connectedEdges().length,
        });
      });
      inst.on("tap", (e) => {
        if (e.target === inst) {
          clearHighlight(inst);
          setSelected(null);
        }
      });
      // double-click to zoom toward a point (maps behavior)
      inst.on("dbltap", (e) => {
        const z = Math.min(inst.zoom() * 1.7, 4);
        inst.animate({ zoom: { level: z, position: e.position }, duration: 220 });
      });
    });
    return () => {
      disposed = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, []);

  // diff elements when data changes — never re-init
  useEffect(() => {
    const inst = cyRef.current;
    if (!inst || !data) return;
    const els: cytoscape.ElementDefinition[] = [
      ...data.nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          kind: n.kind,
          dataClass: n.data_class,
          color: n.data_class ? CLASS_META[n.data_class].color : "#6b93c4",
          entityName: n.type === "entity" ? n.label : undefined,
        },
      })),
      ...data.edges
        .filter((e) => data.nodes.some((n) => n.id === e.source) && data.nodes.some((n) => n.id === e.target))
        .map((e) => ({ data: { id: `${e.source}->${e.target}:${e.type}`, source: e.source, target: e.target, type: e.type, label: e.type === "RELATES_TO" ? "" : undefined } })),
    ];
    inst.batch(() => {
      inst.elements().remove();
      inst.add(els);
    });
    // "Making" animation: nodes start scattered and settle into the force layout, then the
    // whole graph fades in as it assembles.
    inst.nodes().style("opacity", 0);
    inst.edges().style("opacity", 0);
    const layout = inst.layout({
      name: "fcose",
      quality: "proof",
      randomize: true, // start scattered so the settle reads as the graph "building"
      animate: true,
      animationDuration: 900,
      animationEasing: "ease-out",
      nodeSeparation: 95,
      idealEdgeLength: 75,
      nodeRepulsion: 6500,
      fit: true,
      padding: 44,
    } as never);
    layout.one("layoutstart", () => {
      inst.nodes().animate({ style: { opacity: 1 } }, { duration: 500, easing: "ease-out" });
      inst.edges().animate({ style: { opacity: 0.7 } }, { duration: 700, easing: "ease-out" });
    });
    layout.run();
    setSelected(null);
  }, [data]);

  const fit = useCallback(() => cyRef.current?.animate({ fit: { eles: cyRef.current.elements(), padding: 40 }, duration: 300 }), []);
  const zoom = useCallback((f: number) => {
    const inst = cyRef.current;
    if (!inst) return;
    inst.animate({ zoom: inst.zoom() * f, center: { eles: inst.elements() }, duration: 160 });
  }, []);

  // keyboard: F = fit, Escape = clear
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f" && document.activeElement?.tagName !== "INPUT") fit();
      if (e.key === "Escape") {
        cyRef.current && clearHighlight(cyRef.current);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fit]);

  return (
    <div className="relative h-full w-full" style={{ background: "radial-gradient(120% 120% at 50% 30%, var(--color-surface-1), var(--color-base))" }}>
      {!embedded && (
        <div className="absolute left-4 top-4 z-20 w-[min(420px,60vw)]">
          <GraphEntitySearch />
        </div>
      )}

      {/* depth control */}
      <div className="absolute right-4 top-4 z-20">
        <Segmented
          size="sm"
          value={depth}
          onChange={setDepth}
          options={[
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
          ]}
        />
      </div>

      <div ref={containerRef} className="h-full w-full" />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-[13px]" style={{ color: "var(--color-ink-4)" }}>
          <span className="inline-block h-5 w-5 animate-spin rounded-full" style={{ border: "2px solid var(--color-line-strong)", borderTopColor: "var(--color-brass)" }} />
        </div>
      )}

      {/* legend */}
      <div className="absolute bottom-10 left-4 z-10 flex items-center gap-3 rounded-[9px] px-3 py-2 text-[10.5px]" style={{ background: "color-mix(in oklab, var(--color-surface-1) 85%, transparent)", border: "1px solid var(--color-line)", color: "var(--color-ink-4)" }}>
        <LegendDot color="#3a4a5a" label="Entity" shape="circle" />
        <LegendDot color={CLASS_META.internal.color} label="Fact" shape="square" />
        <LegendDot color="#3a3f47" label="Source" shape="diamond" />
      </div>

      {/* minimal controls */}
      <div className="absolute bottom-10 right-4 z-10 flex items-center gap-1 rounded-[10px] p-1" style={{ background: "color-mix(in oklab, var(--color-surface-1) 85%, transparent)", border: "1px solid var(--color-line)" }}>
        <IconButton label="Zoom in" onClick={() => zoom(1.25)}><ZoomIn width={16} height={16} /></IconButton>
        <IconButton label="Zoom out" onClick={() => zoom(0.8)}><ZoomOut width={16} height={16} /></IconButton>
        <IconButton label="Fit graph (F)" onClick={fit}><Fit width={16} height={16} /></IconButton>
      </div>

      {data && data.redacted_count > 0 && (
        <div className="absolute bottom-24 right-4 z-10 rounded-[8px] px-2.5 py-1.5 text-[11px]" style={{ background: "var(--color-surface-2)", border: "1px dashed var(--color-line-strong)", color: "var(--color-ink-4)" }}>
          {data.redacted_count} node{data.redacted_count > 1 ? "s" : ""} hidden by clearance
        </div>
      )}

      <GraphInspector node={selected} onClose={() => { cyRef.current && clearHighlight(cyRef.current); setSelected(null); }} />
    </div>
  );
}

function GraphEntitySearch() {
  // jump the graph to another entity in place — stays on /graph, never leaves the canvas
  const [v, setV] = useState("");
  const [, setParams] = useSearchParams();
  const jump = (name: string) => {
    setParams({ entity: name });
    setV("");
  };
  return (
    <div className="rounded-[12px]" style={{ boxShadow: "var(--shadow-panel)" }}>
      <SearchBar value={v} onChange={setV} onSubmit={jump} onPickEntity={jump} compact />
    </div>
  );
}

function LegendDot({ color, label, shape }: { color: string; label: string; shape: "circle" | "square" | "diamond" }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ width: 8, height: 8, background: color, borderRadius: shape === "circle" ? 99 : shape === "square" ? 2 : 0, transform: shape === "diamond" ? "rotate(45deg)" : "none", display: "inline-block" }} />
      {label}
    </span>
  );
}

function highlightNeighborhood(inst: cytoscape.Core, node: cytoscape.NodeSingular) {
  clearHighlight(inst);
  const neighborhood = node.closedNeighborhood();
  inst.elements().difference(neighborhood).addClass("faded");
  node.connectedEdges().addClass("hl");
  node.neighborhood("node").addClass("hlnode");
}
function clearHighlight(inst: cytoscape.Core) {
  inst.elements().removeClass("faded hl hlnode");
}

// unused import guard
void Search;
