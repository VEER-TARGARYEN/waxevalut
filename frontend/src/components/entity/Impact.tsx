/** Blast radius. Discrete hop buttons (a precise binary choice, not a slider). Results
 *  expand progressively as depth increases, grouped by hop distance. */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useImpact } from "@/hooks/queries";
import { useApp } from "@/store/app";
import { Segmented, Skeleton } from "@/components/ui/primitives";
import { KindGlyph, ArrowRight } from "@/components/ui/icons";

export function Impact({ name, depth, setDepth }: { name: string; depth: number; setDepth: (d: number) => void }) {
  const agentId = useApp((s) => s.activeAgentId);
  const { data, isFetching } = useImpact(name, agentId, depth);

  const shown = (data?.reached ?? []).filter((r) => r.hops <= depth);
  const byHop = [1, 2, 3]
    .filter((h) => h <= depth)
    .map((h) => ({ hop: h, items: shown.filter((r) => r.hops === h) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-[13px]" style={{ color: "var(--color-ink-3)" }}>
          If <span style={{ color: "var(--color-ink)" }}>{name}</span> is affected, what connects to it?
        </div>
        <Segmented
          size="sm"
          value={depth}
          onChange={setDepth}
          options={[
            { value: 1, label: "1 hop" },
            { value: 2, label: "2 hops" },
            { value: 3, label: "3 hops" },
          ]}
        />
      </div>

      <div
        className="flex items-center gap-3 rounded-[11px] px-4 py-3"
        style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
      >
        <span className="tnum text-[22px] font-600" style={{ color: "var(--color-brass)" }}>
          {shown.length}
        </span>
        <span className="text-[13px]" style={{ color: "var(--color-ink-3)" }}>
          {shown.length === 1 ? "entity" : "entities"} within {depth} hop{depth > 1 ? "s" : ""}
        </span>
        {isFetching && <span className="ml-auto inline-block h-3 w-3 animate-spin rounded-full" style={{ border: "2px solid var(--color-line-strong)", borderTopColor: "var(--color-brass)" }} />}
      </div>

      {!data ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} style={{ height: 52 }} />
          ))}
        </div>
      ) : (
        byHop.map(({ hop, items }) => (
          <div key={hop} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
              <span className="rounded px-1.5 py-0.5" style={{ background: "var(--color-surface-3)" }}>
                {hop} hop{hop > 1 ? "s" : ""}
              </span>
              <span>·</span>
              <span>{items.length}</span>
            </div>
            {items.map((r, idx) => (
              <motion.div
                key={r.entity}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.24 }}
              >
                <Link
                  to={`/entity/${encodeURIComponent(r.entity)}`}
                  className="group flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 transition-colors"
                  style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-line-strong)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-line)")}
                >
                  <span className="grid h-7 w-7 flex-none place-items-center rounded-[7px]" style={{ color: "var(--color-ink-2)", background: "var(--color-surface-2)" }}>
                    <KindGlyph width={14} height={14} />
                  </span>
                  <span className="flex flex-1 flex-col leading-tight">
                    <span className="text-[13.5px]">{r.entity}</span>
                    {r.what_we_know[0] && (
                      <span className="truncate text-[11.5px]" style={{ color: "var(--color-ink-4)", maxWidth: "46ch" }}>
                        {r.what_we_know[0]}
                      </span>
                    )}
                  </span>
                  <ArrowRight width={15} height={15} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--color-brass)" }} />
                </Link>
              </motion.div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
