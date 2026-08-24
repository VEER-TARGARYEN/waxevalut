/** The primary search. Merges into the surface rather than looking like a form field.
 *  Debounced autocomplete, keyboard nav, ⌘K focus. On submit it does not navigate — the
 *  page transforms in place (handled by the parent via onSubmit). */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAutocomplete } from "@/hooks/queries";
import { KindGlyph, Search } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/primitives";
import { DUR, EASE_OUT } from "@/lib/motion";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  compact = false,
  onPickEntity,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  compact?: boolean;
  /** If provided, choosing a suggestion calls this instead of navigating to the entity page
   *  — lets the graph explorer jump in place without leaving the graph context. */
  onPickEntity?: (name: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const [debounced, setDebounced] = useState(value);
  const [hi, setHi] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();

  useEffect(() => setDraft(value), [value]);

  // 150ms debounce for autocomplete
  useEffect(() => {
    const t = setTimeout(() => setDebounced(draft), 150);
    return () => clearTimeout(t);
  }, [draft]);

  const { data: suggestions } = useAutocomplete(debounced);
  const showMenu = focused && draft.trim().length > 0 && (suggestions?.length ?? 0) > 0;

  useEffect(() => {
    const focus = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focus);
    return () => window.removeEventListener("keydown", focus);
  }, []);

  useEffect(() => {
    if (!focused) return;
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setFocused(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [focused]);

  const submit = (q: string) => {
    if (!q.trim()) return;
    onChange(q);
    onSubmit(q);
    setFocused(false);
    inputRef.current?.blur();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const list = suggestions ?? [];
    if (e.key === "ArrowDown") (e.preventDefault(), setHi((v) => Math.min(v + 1, list.length - 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setHi((v) => Math.max(v - 1, -1)));
    else if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && list[hi]) { const n = list[hi].name; onPickEntity ? onPickEntity(n) : nav(`/entity/${encodeURIComponent(n)}`); }
      else submit(draft);
    } else if (e.key === "Escape") (setFocused(false), inputRef.current?.blur());
  };

  return (
    <div ref={ref} className="relative w-full">
      <motion.div
        animate={{ scale: focused && !compact ? 1.005 : 1 }}
        transition={{ duration: DUR.normal, ease: EASE_OUT }}
        className="relative flex items-center gap-3 rounded-[14px] transition-colors"
        style={{
          background: focused ? "var(--color-surface-2)" : "var(--color-surface-1)",
          border: `1px solid ${focused ? "color-mix(in oklab, var(--color-brass) 40%, var(--color-line-strong))" : "var(--color-line)"}`,
          boxShadow: focused ? "0 0 0 4px var(--color-brass-glow)" : "var(--shadow-panel)",
          padding: compact ? "10px 14px" : "16px 18px",
        }}
      >
        <Search
          width={compact ? 18 : 20}
          height={compact ? 18 : 20}
          style={{ color: focused ? "var(--color-brass)" : "var(--color-ink-3)", flex: "none" }}
        />
        <input
          ref={inputRef}
          value={draft}
          onFocus={() => setFocused(true)}
          onChange={(e) => (setDraft(e.target.value), setHi(-1))}
          onKeyDown={onKey}
          placeholder="Ask about a customer, service, or project…"
          className="flex-1 bg-transparent outline-none"
          style={{ fontSize: compact ? 15 : 18, color: "var(--color-ink)" }}
          aria-label="Search organizational memory"
        />
        {!focused && !compact && <Kbd>/</Kbd>}
      </motion.div>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DUR.normal, ease: EASE_OUT }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[13px] p-1.5"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}
          >
            {(suggestions ?? []).map((s, idx) => (
              <button
                key={s.name}
                onMouseEnter={() => setHi(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (onPickEntity ? onPickEntity(s.name) : nav(`/entity/${encodeURIComponent(s.name)}`))}
                className="flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left"
                style={{ background: idx === hi ? "var(--color-surface-3)" : "transparent" }}
              >
                <span className="grid h-7 w-7 place-items-center rounded-[7px]" style={{ color: "var(--color-ink-2)", background: "var(--color-surface-2)" }}>
                  <KindGlyph kind={s.kind} width={15} height={15} />
                </span>
                <span className="flex-1 text-[13.5px]">{s.name}</span>
                <span className="text-[10.5px] uppercase tracking-wide" style={{ color: "var(--color-ink-4)" }}>
                  {s.kind}
                </span>
              </button>
            ))}
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => submit(draft)}
              className="mt-1 flex w-full items-center gap-2 rounded-[9px] px-2.5 py-2 text-left text-[12.5px]"
              style={{ color: "var(--color-ink-3)", borderTop: "1px solid var(--color-line)" }}
            >
              <Search width={14} height={14} /> Recall everything about &ldquo;{draft}&rdquo;
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
