/** Tiny connection indicator. Animates only on state transitions, never idly. Click for a
 *  small diagnostic popover. */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useHealth } from "@/hooks/queries";
import { API_MODE } from "@/lib/api";
import { DUR, EASE_OUT } from "@/lib/motion";

const MAP = {
  connected: { color: "var(--color-ok)", label: "Connected" },
  degraded: { color: "var(--color-warn)", label: "Reconnecting" },
  offline: { color: "var(--color-danger)", label: "Offline" },
} as const;

export function ConnectionStatus() {
  const { data } = useHealth();
  const status = data?.status ?? "degraded";
  const meta = MAP[status];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11.5px] transition-colors"
        style={{ color: "var(--color-ink-3)" }}
        aria-label={`Connection: ${meta.label}`}
      >
        <motion.span
          key={status}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: DUR.normal, ease: EASE_OUT }}
          style={{ width: 7, height: 7, borderRadius: 99, background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
        />
        {status === "connected" && data?.latency_ms != null ? (
          <span className="tnum">{Math.round(data.latency_ms)}ms</span>
        ) : (
          meta.label
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DUR.normal, ease: EASE_OUT }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] rounded-[12px] p-3 text-[12px]"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: 99, background: meta.color }} />
              <span className="font-500">{meta.label}</span>
            </div>
            <Row k="Latency" v={data?.latency_ms != null ? `${Math.round(data.latency_ms)} ms` : "—"} />
            <Row k="Data source" v={API_MODE === "mock" ? "Mock layer" : "CognoDB (live)"} />
            <Row k="Store" v="Graph memory" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span style={{ color: "var(--color-ink-3)" }}>{k}</span>
      <span className="tnum">{v}</span>
    </div>
  );
}
