/**
 * The agent switcher — WaxeValut's most important persistent control. Designed as an
 * identity control, not a select box: switching agents changes the lens through which the
 * whole graph is seen. It never reloads the app; it flips the active agent and every server
 * query re-runs under the new clearance while prior data stays visible until the new arrives.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAgents } from "@/hooks/queries";
import type { Agent } from "@/lib/api/types";
import { useApp } from "@/store/app";
import { DUR, EASE_OUT } from "@/lib/motion";
import { ChevronDown, Check } from "@/components/ui/icons";
import { AgentAvatar } from "@/components/ui/AgentAvatar";

const CLEARANCE_LABEL = ["Public only", "Internal", "PII clearance", "Secret clearance"];
const CLEARANCE_COLOR = [
  "var(--color-public)",
  "var(--color-internal)",
  "var(--color-pii)",
  "var(--color-secret)",
];

function Ident({ agent, size = 30 }: { agent: Agent; size?: number }) {
  // a generated sigil, seeded by the agent id and tinted by clearance — never initials
  return <AgentAvatar id={agent.id} clearance={agent.clearance} size={size} rounded={8} />;
}

export function AgentSwitcher() {
  const { data: agents } = useAgents();
  const { activeAgentId, setActiveAgent } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = agents?.find((a) => a.id === activeAgentId) ?? agents?.[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!active) return <div style={{ width: 210, height: 44 }} />;

  const color = CLEARANCE_COLOR[active.clearance];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex items-center gap-2.5 rounded-[11px] py-1.5 pl-1.5 pr-2.5 transition-colors"
        style={{
          background: open ? "var(--color-surface-3)" : "var(--color-surface-1)",
          border: "1px solid var(--color-line)",
        }}
      >
        <Ident agent={active} />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[13px] font-500">{active.name}</span>
          <span className="text-[11px]" style={{ color }}>
            {active.role} · {CLEARANCE_LABEL[active.clearance]}
          </span>
        </span>
        <ChevronDown
          width={15}
          height={15}
          style={{
            color: "var(--color-ink-3)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform var(--dur-normal) var(--ease-out)",
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: DUR.normal, ease: EASE_OUT }}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-[280px] overflow-hidden rounded-[13px] p-1.5"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}
          >
            <div className="px-2.5 py-1.5 text-[10.5px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
              Investigate as
            </div>
            {[...(agents ?? [])].map((a) => {
              const on = a.id === active.id;
              const c = CLEARANCE_COLOR[a.clearance];
              return (
                <button
                  key={a.id}
                  role="option"
                  aria-selected={on}
                  onClick={() => {
                    setActiveAgent(a.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-[9px] px-2 py-2 text-left transition-colors"
                  style={{ background: on ? "var(--brass-wash)" : "transparent" }}
                  onMouseEnter={(e) => !on && (e.currentTarget.style.background = "var(--color-surface-2)")}
                  onMouseLeave={(e) => !on && (e.currentTarget.style.background = "transparent")}
                >
                  <Ident agent={a} size={32} />
                  <span className="flex flex-1 flex-col leading-tight">
                    <span className="text-[13px] font-500">{a.name}</span>
                    <span className="text-[11px]" style={{ color: c }}>
                      {a.role} · {CLEARANCE_LABEL[a.clearance]}
                    </span>
                  </span>
                  {on && <Check width={15} height={15} style={{ color: "var(--color-brass)" }} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
