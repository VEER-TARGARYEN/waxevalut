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

const BRASS = "#c98a34"; // slightly deeper brass reads better on the light map
// Light "map" theme: colored pins on warm paper, dark labels. Cytoscape's style typings are
// strict about px vs number; an untyped array is the conventional way to author a stylesheet.
const stylesheet = () =>
  [
    {
      selector: "node",
      style: {
        label: "data(label)",
        color: "#3a3630", // dark label, readable on paper
        "font-size": 9,
        "font-weight": 500,
        "font-family": "Inter, sans-serif",
        "text-valign": "bottom",
        "text-margin-y": 5,
        "text-max-width": "96px",
        "text-wrap": "ellipsis",
        "text-background-color": "#f6f3ec",
        "text-background-opacity": 0.72,
        "text-background-padding": 2,
        "text-background-shape": "round-rectangle",
        "border-width": 1.5,
        "transition-property": "opacity, border-color, background-color",
        "transition-duration": "180ms",
      },
    },
    {
      // entities are the anchors — cream pins with a brass ring and a bolder label
      selector: 'node[type="entity"]',
      style: { width: 32, height: 32, "background-color": "#ffffff", "border-color": "#caa15e", "border-width": 2, color: "#2b2620", "font-size": 10.5, "font-weight": 600 },
    },
    {
      selector: 'node[type="fact"]',
      style: { width: 15, height: 15, "background-color": "data(color)", "border-color": "#ffffff", "border-width": 1.5, shape: "round-rectangle" },
    },
    {
      selector: 'node[type="source"]',
      style: { width: 11, height: 11, "background-color": "#efe9db", "border-color": "#b8ad95", shape: "diamond", color: "#8a8170", "font-size": 8 },
    },
    {
      selector: "edge",
      style: {
        width: 1.2,
        "line-color": "#d8cfba",
        "curve-style": "bezier",
        "target-arrow-shape": "none",
        opacity: 0.9,
        "transition-property": "opacity, line-color",
        "transition-duration": "180ms",
      },
    },
    { selector: 'edge[type="RELATES_TO"], edge[label]', style: { "line-color": "#c2b596", width: 1.6 } },
    { selector: "node:selected", style: { "border-color": BRASS, "border-width": 3, color: "#1a1408" } },
    { selector: ".faded", style: { opacity: 0.2 } },
    { selector: ".hl", style: { "line-color": BRASS, opacity: 1, width: 2.2 } },
    { selector: ".hlnode", style: { "border-color": BRASS, "border-width": 2.5 } },
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
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        // a light "map" canvas: warm paper with a faint dot grid
        background: "#f4f1ea",
        backgroundImage:
          "radial-gradient(circle, rgba(60,54,44,0.07) 1px, transparent 1.4px), radial-gradient(120% 90% at 50% 0%, rgba(202,161,94,0.10), transparent 60%)",
        backgroundSize: "22px 22px, 100% 100%",
      }}
    >
      {!embedded && (
        <div className="absolute left-4 top-4 z-20 w-[min(420px,60vw)]">
          <GraphEntitySearch />
        </div>
      )}

      {/* depth control — light map chip */}
      <div className="absolute right-4 top-4 z-20 rounded-[11px] p-1" style={{ background: "rgba(255,255,255,0.86)", border: "1px solid rgba(60,54,44,0.14)", boxShadow: "0 6px 18px -10px rgba(60,54,44,0.4)" }}>
        <MapSegmented value={depth} onChange={setDepth} />
      </div>

      <div ref={containerRef} className="h-full w-full" />

      {!ready && (
        <div className="absolute inset-0 grid place-items-center text-[13px]" style={{ color: "#8a8170" }}>
          <span className="inline-block h-5 w-5 animate-spin rounded-full" style={{ border: "2px solid #d8cfba", borderTopColor: "#c98a34" }} />
        </div>
      )}

      {/* legend — light chip */}
      <div className="absolute bottom-10 left-4 z-10 flex items-center gap-3 rounded-[10px] px-3 py-2 text-[10.5px]" style={{ background: "rgba(255,255,255,0.86)", border: "1px solid rgba(60,54,44,0.14)", color: "#6a6252", boxShadow: "0 6px 18px -10px rgba(60,54,44,0.4)" }}>
        <LegendDot color="#caa15e" label="Entity" shape="circle" />
        <LegendDot color={CLASS_META.internal.color} label="Fact" shape="square" />
        <LegendDot color="#b8ad95" label="Source" shape="diamond" />
      </div>

      {/* controls — light map chip */}
      <div className="absolute bottom-10 right-4 z-10 flex items-center gap-1 rounded-[11px] p-1" style={{ background: "rgba(255,255,255,0.86)", border: "1px solid rgba(60,54,44,0.14)", boxShadow: "0 6px 18px -10px rgba(60,54,44,0.4)" }}>
        <MapButton label="Zoom in" onClick={() => zoom(1.25)}><ZoomIn width={16} height={16} /></MapButton>
        <MapButton label="Zoom out" onClick={() => zoom(0.8)}><ZoomOut width={16} height={16} /></MapButton>
        <MapButton label="Fit graph (F)" onClick={fit}><Fit width={16} height={16} /></MapButton>
      </div>

      {data && data.redacted_count > 0 && (
        <div className="absolute bottom-24 right-4 z-10 rounded-[8px] px-2.5 py-1.5 text-[11px]" style={{ background: "rgba(255,255,255,0.9)", border: "1px dashed rgba(60,54,44,0.28)", color: "#8a8170" }}>
          {data.redacted_count} node{data.redacted_count > 1 ? "s" : ""} hidden by clearance
        </div>
      )}

      <GraphInspector node={selected} onClose={() => { cyRef.current && clearHighlight(cyRef.current); setSelected(null); }} />
    </div>
  );
}

/** Zoom / fit buttons styled for the light map surface. */
function MapButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-[8px] transition-colors active:scale-90"
      style={{ color: "#5a5342" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(60,54,44,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}

/** Depth selector styled for the light map surface. */
function MapSegmented({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((d) => {
        const on = d === value;
        return (
          <button
            key={d}
            onClick={() => onChange(d)}
            className="h-7 w-7 rounded-[7px] text-[12px] font-600 transition-colors active:scale-90"
            style={{ color: on ? "#1a1408" : "#8a8170", background: on ? "#e6c489" : "transparent" }}
          >
            {d}
          </button>
        );
      })}
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
