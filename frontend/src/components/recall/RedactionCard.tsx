/** Redaction is a core product concept, never an error. It says: these facts exist, they
 *  are outside this lens. Switching to a higher-clearance agent dissolves it into real
 *  facts — the defining moment of the demo. */
import { motion } from "framer-motion";
import { useAgents } from "@/hooks/queries";
import { useApp } from "@/store/app";
import { Lock, ArrowRight } from "@/components/ui/icons";
import { feedItem } from "@/lib/motion";

export function RedactionCard({ count, reason }: { count: number; reason: string | null }) {
  const { data: agents } = useAgents();
  const activeId = useApp((s) => s.activeAgentId);
  const setAgent = useApp((s) => s.setActiveAgent);
  const active = agents?.find((a) => a.id === activeId);

  // suggest the lowest-clearance agent that can see more
  const upgrade = agents
    ?.filter((a) => a.clearance > (active?.clearance ?? 0))
    .sort((a, b) => a.clearance - b.clearance)[0];

  return (
    <motion.div
      variants={feedItem}
      layout
      className="flex items-center gap-3.5 rounded-[12px] px-4 py-3.5"
      style={{
        background: "repeating-linear-gradient(135deg, var(--color-surface-1), var(--color-surface-1) 10px, var(--color-surface-2) 10px, var(--color-surface-2) 20px)",
        border: "1px dashed var(--color-line-strong)",
      }}
    >
      <span
        className="grid h-8 w-8 flex-none place-items-center rounded-[8px]"
        style={{ color: "var(--color-ink-3)", background: "var(--color-surface-3)" }}
      >
        <Lock width={15} height={15} />
      </span>
      <div className="flex-1 leading-tight">
        <div className="text-[13.5px]" style={{ color: "var(--color-ink-2)" }}>
          <span className="tnum font-600" style={{ color: "var(--color-ink)" }}>
            {count}
          </span>{" "}
          {count === 1 ? "fact is" : "facts are"} outside this agent&rsquo;s clearance
        </div>
        <div className="text-[11.5px]" style={{ color: "var(--color-ink-4)" }}>
          {reason ?? "requires higher clearance"}
        </div>
      </div>
      {upgrade && (
        <button
          onClick={() => setAgent(upgrade.id)}
          className="inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[12px] font-500 transition-colors"
          style={{ color: "var(--color-brass)", background: "var(--brass-wash)", border: "1px solid color-mix(in oklab, var(--color-brass) 26%, transparent)" }}
        >
          View as {upgrade.name}
          <ArrowRight width={13} height={13} />
        </button>
      )}
    </motion.div>
  );
}
