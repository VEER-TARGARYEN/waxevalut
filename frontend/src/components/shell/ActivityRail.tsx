/** A living right-edge rail — "Live in the graph". A slim vertical strip (mirroring the left
 *  shortcut rail) that auto-advances through the graph's entities every 15s with a filling
 *  progress bar, and expands on hover into a flyout showing the current spotlight and what's
 *  up next. Driven by the real entity list, so it stays truthful against any backend. Shown
 *  only on xl+ where the right margin is free. */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEntityBrowse } from "@/hooks/queries";
import { KindGlyph, ArrowRight } from "@/components/ui/icons";

const ROTATE_MS = 15000;

const KIND_TAG: Record<string, string> = {
  account: "Customer account",
  service: "Service",
  person: "Team member",
  incident: "Active incident",
  project: "Project",
};

export function ActivityRail() {
  const { data } = useEntityBrowse();
  const items = data ?? [];
  const [i, setI] = useState(0);
  const nav = useNavigate();

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % items.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;
  const cur = items[i % items.length];
  const upNext = [items[(i + 1) % items.length], items[(i + 2) % items.length]].filter(Boolean);

  return (
    <div className="group fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 xl:block" aria-label="Live activity">
      {/* collapsed strip */}
      <div
        className="flex w-14 flex-col items-center gap-3 rounded-[16px] px-1.5 py-3"
        style={{ background: "color-mix(in oklab, var(--color-surface-1) 70%, transparent)", border: "1px solid var(--color-line)", backdropFilter: "blur(10px)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--color-ok)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--color-ok)" }} />
          </span>
        </div>
        <div className="text-[9px] font-600 uppercase tracking-[0.2em]" style={{ color: "var(--color-ink-4)", writingMode: "vertical-rl" }}>
          Live
        </div>

        {/* current spotlight glyph, changes each rotation */}
        <div className="relative grid h-9 w-9 place-items-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={cur.name}
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="grid h-9 w-9 place-items-center rounded-[10px]"
              style={{ color: "var(--color-brass)", background: "var(--brass-wash)", border: "1px solid color-mix(in oklab, var(--color-brass) 22%, transparent)" }}
            >
              <KindGlyph kind={cur.kind} width={17} height={17} />
            </motion.span>
          </AnimatePresence>
        </div>

        {/* vertical 15s progress — restarts each rotation via key */}
        <div className="relative h-16 w-[3px] overflow-hidden rounded-full" style={{ background: "var(--color-surface-3)" }}>
          <motion.div
            key={i}
            initial={{ height: "0%" }}
            animate={{ height: "100%" }}
            transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
            className="absolute bottom-0 left-0 right-0 rounded-full"
            style={{ background: "linear-gradient(180deg, var(--color-brass), var(--color-brass-dim))" }}
          />
        </div>
      </div>

      {/* hover flyout */}
      <div
        className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 w-[268px] -translate-y-1/2 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
      >
        <div className="overflow-hidden rounded-[14px]" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}>
          <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ borderBottom: "1px solid var(--color-line)" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--color-ok)" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--color-ok)" }} />
            </span>
            <span className="text-[11px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-3)" }}>
              Live in the graph
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.button
              key={cur.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              onClick={() => nav(`/entity/${encodeURIComponent(cur.name)}`)}
              className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
            >
              <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px]" style={{ color: "var(--color-brass)", background: "var(--brass-wash)" }}>
                <KindGlyph kind={cur.kind} width={18} height={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-500" style={{ color: "var(--color-ink)" }}>
                  {cur.name}
                </span>
                <span className="block text-[11px]" style={{ color: "var(--color-ink-4)" }}>
                  {KIND_TAG[cur.kind] ?? "In memory"}
                </span>
              </span>
              <ArrowRight width={15} height={15} style={{ color: "var(--color-brass)" }} />
            </motion.button>
          </AnimatePresence>

          <div className="px-3.5 pb-3">
            <div className="mb-1.5 text-[10px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
              Up next
            </div>
            <div className="flex flex-col gap-1">
              {upNext.map((e) => (
                <button
                  key={e.name}
                  onClick={() => nav(`/entity/${encodeURIComponent(e.name)}`)}
                  className="flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-[6px]" style={{ color: "var(--color-ink-3)", background: "var(--color-surface-2)" }}>
                    <KindGlyph kind={e.kind} width={13} height={13} />
                  </span>
                  <span className="flex-1 truncate text-[12.5px]" style={{ color: "var(--color-ink-2)" }}>
                    {e.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
