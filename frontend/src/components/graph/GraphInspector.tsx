/** Contextual node inspector. Appears only when a node is selected — the graph stays fully
 *  visible beside it, preserving context. Contains identity, properties, and context-aware
 *  actions. */
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import type { DataClass, GraphNodeType } from "@/lib/api/types";
import { CLASS_META } from "@/lib/format";
import { useApp } from "@/store/app";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { KindGlyph, Close, ArrowRight } from "@/components/ui/icons";
import { DUR, EASE_OUT } from "@/lib/motion";

export interface SelectedNode {
  id: string;
  label: string;
  type: GraphNodeType;
  kind?: string;
  dataClass?: DataClass;
  entity?: string;
  connections: number;
}

const TYPE_LABEL: Record<GraphNodeType, string> = { entity: "Entity", fact: "Fact", source: "Source" };

export function GraphInspector({ node, onClose }: { node: SelectedNode | null; onClose: () => void }) {
  const openProvenance = useApp((s) => s.openProvenance);
  const isMobile = useIsMobile();

  // On desktop: a floating card top-right, graph stays visible beside it.
  // On mobile: a bottom sheet, graph stays visible above it. Context preserved either way.
  const motionProps = isMobile
    ? {
        initial: { y: "100%", opacity: 0.6 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "100%", opacity: 0.6 },
      }
    : { initial: { x: 40, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 40, opacity: 0 } };

  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          {...motionProps}
          transition={{ duration: DUR.context, ease: EASE_OUT }}
          className="absolute z-30 overflow-hidden rounded-[14px] max-sm:inset-x-0 max-sm:bottom-0 max-sm:rounded-b-none sm:right-3 sm:top-3 sm:w-[286px]"
          style={{ background: "color-mix(in oklab, var(--color-surface-1) 96%, transparent)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex justify-center pt-2 sm:hidden">
            <span style={{ width: 34, height: 4, borderRadius: 99, background: "var(--color-line-strong)" }} />
          </div>
          <div className="flex items-start gap-3 p-3.5" style={{ borderBottom: "1px solid var(--color-line)" }}>
            <span
              className="grid h-9 w-9 flex-none place-items-center rounded-[9px]"
              style={{
                color: node.dataClass ? CLASS_META[node.dataClass].color : "var(--color-brass)",
                background: node.dataClass ? `color-mix(in oklab, ${CLASS_META[node.dataClass].color} 14%, transparent)` : "var(--brass-wash)",
              }}
            >
              {node.type === "entity" ? <KindGlyph kind={node.kind} width={18} height={18} /> : node.type === "fact" ? <span style={{ width: 10, height: 10, borderRadius: 3, background: CLASS_META[node.dataClass ?? "internal"].color }} /> : <span style={{ width: 9, height: 9, background: "var(--color-ink-3)", transform: "rotate(45deg)" }} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
                {TYPE_LABEL[node.type]}
              </div>
              <div className="text-[13.5px] leading-tight" style={{ color: "var(--color-ink)" }}>
                {node.label}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close inspector" className="text-[var(--color-ink-4)] transition-colors hover:text-[var(--color-ink-2)]">
              <Close width={16} height={16} />
            </button>
          </div>

          <div className="flex flex-col gap-2 p-3.5 text-[12px]">
            <Prop k="Connections" v={String(node.connections)} />
            {node.kind && <Prop k="Kind" v={node.kind} />}
            {node.dataClass && (
              <Prop
                k="Classification"
                v={
                  <span className="inline-flex items-center gap-1.5" style={{ color: CLASS_META[node.dataClass].color }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: CLASS_META[node.dataClass].color }} />
                    {CLASS_META[node.dataClass].label}
                  </span>
                }
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5 p-3 pt-0">
            {node.type === "entity" && node.entity && (
              <Link
                to={`/entity/${encodeURIComponent(node.entity)}`}
                className="flex items-center justify-between rounded-[9px] px-3 py-2 text-[12.5px] font-500 transition-colors"
                style={{ color: "var(--color-brass)", background: "var(--brass-wash)", border: "1px solid color-mix(in oklab, var(--color-brass) 24%, transparent)" }}
              >
                Open entity <ArrowRight width={14} height={14} />
              </Link>
            )}
            {node.type === "fact" && (
              <button
                onClick={() => openProvenance(node.id.replace(/^f_/, ""))}
                className="flex items-center justify-between rounded-[9px] px-3 py-2 text-[12.5px] font-500 transition-colors"
                style={{ color: "var(--color-ink-2)", background: "var(--color-surface-2)", border: "1px solid var(--color-line)" }}
              >
                View provenance <ArrowRight width={14} height={14} />
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Prop({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--color-ink-4)" }}>{k}</span>
      <span style={{ color: "var(--color-ink-2)" }}>{v}</span>
    </div>
  );
}
