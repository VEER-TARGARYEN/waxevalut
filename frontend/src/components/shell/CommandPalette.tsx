/** ⌘K command palette — fast entity jump + core actions. Familiar interaction model
 *  (search + arrow keys), used as the app's spatial teleporter between contexts. */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAutocomplete } from "@/hooks/queries";
import { useApp } from "@/store/app";
import { DUR, EASE_OUT } from "@/lib/motion";
import { KindGlyph, Search, Plus, GraphIcon } from "@/components/ui/icons";

export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen);
  const setOpen = useApp((s) => s.setPalette);
  const openObserve = useApp((s) => s.openObserve);
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const nav = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: suggestions } = useAutocomplete(q);

  // global ⌘K / Ctrl-K
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === "Escape" && open) {
        // global Escape close, independent of where focus sits
        setOpen(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [setOpen, open]);

  useEffect(() => {
    if (open) {
      setQ("");
      setI(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const actions = useMemo(
    () => [
      { id: "act:observe", label: "Add observation", kind: "action" as const, icon: <Plus width={16} height={16} />, run: () => openObserve() },
      { id: "act:graph", label: "Open graph explorer", kind: "action" as const, icon: <GraphIcon width={16} height={16} />, run: () => nav("/graph") },
    ],
    [nav, openObserve],
  );

  const entityItems = (suggestions ?? []).map((s) => ({
    id: `ent:${s.name}`,
    label: s.name,
    kind: "entity" as const,
    sub: s.kind,
    run: () => nav(`/entity/${encodeURIComponent(s.name)}`),
  }));
  const actionItems = q.trim()
    ? actions.filter((a) => a.label.toLowerCase().includes(q.toLowerCase()))
    : actions;
  const items = [...entityItems, ...actionItems];

  const close = () => setOpen(false);
  const choose = (idx: number) => {
    items[idx]?.run();
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") (e.preventDefault(), setI((v) => Math.min(v + 1, items.length - 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setI((v) => Math.max(v - 1, 0)));
    else if (e.key === "Enter") (e.preventDefault(), choose(i));
    else if (e.key === "Escape") close();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.micro }}
          onMouseDown={close}
          style={{ background: "color-mix(in oklab, var(--color-base) 55%, transparent)", backdropFilter: "blur(3px)" }}
        >
          <motion.div
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: DUR.context, ease: EASE_OUT }}
            className="w-full max-w-[560px] overflow-hidden rounded-[16px]"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}
          >
            <div className="flex items-center gap-3 px-4" style={{ borderBottom: "1px solid var(--color-line)" }}>
              <Search width={18} height={18} style={{ color: "var(--color-ink-3)" }} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => (setQ(e.target.value), setI(0))}
                onKeyDown={onKey}
                placeholder="Jump to an entity, or run a command…"
                className="h-13 flex-1 bg-transparent py-4 text-[15px] outline-none placeholder:text-[var(--color-ink-4)]"
              />
            </div>
            <div className="max-h-[46vh] overflow-y-auto p-1.5">
              {items.length === 0 && (
                <div className="px-3 py-8 text-center text-[13px]" style={{ color: "var(--color-ink-4)" }}>
                  {q ? "No matches" : "Type to search organizational memory"}
                </div>
              )}
              {entityItems.length > 0 && (
                <div className="px-2.5 pb-1 pt-2 text-[10.5px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
                  Entities
                </div>
              )}
              {items.map((it, idx) => (
                <button
                  key={it.id}
                  onMouseEnter={() => setI(idx)}
                  onClick={() => choose(idx)}
                  className="flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left"
                  style={{ background: idx === i ? "var(--color-surface-3)" : "transparent" }}
                >
                  <span
                    className="grid h-7 w-7 place-items-center rounded-[7px]"
                    style={{ color: "var(--color-ink-2)", background: "var(--color-surface-2)" }}
                  >
                    {it.kind === "entity" ? <KindGlyph kind={(it as { sub?: string }).sub} width={15} height={15} /> : (it as { icon: React.ReactNode }).icon}
                  </span>
                  <span className="flex flex-1 flex-col leading-tight">
                    <span className="text-[13.5px]">{it.label}</span>
                    {it.kind === "entity" && (
                      <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-ink-4)" }}>
                        {(it as { sub?: string }).sub}
                      </span>
                    )}
                  </span>
                  {idx === i && <span className="text-[11px]" style={{ color: "var(--color-ink-4)" }}>↵</span>}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
