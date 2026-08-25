/** A universal search + shortcut dock pinned to the bottom edge. At rest only a ~25% sliver
 *  peeks above the edge; as the pointer nears the bottom (or on focus) it rises fully. It is
 *  present on every page, so search and the core shortcuts are always a flick away — and it
 *  fills what was dead space at the bottom of the viewport.
 *
 *  The reveal is a CSS transition (compositor-driven, smooth everywhere), not JS animation. */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAutocomplete, useEntityBrowse } from "@/hooks/queries";
import { useApp } from "@/store/app";
import { KindGlyph, Search, Plus, GraphIcon } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/primitives";

export function BottomDock() {
  const [focused, setFocused] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const nav = useNavigate();
  const openObserve = useApp((s) => s.openObserve);

  const { data: filtered } = useAutocomplete(q);
  const { data: browse } = useEntityBrowse();
  const suggestions = q.trim() ? (filtered ?? []) : (browse ?? []).slice(0, 6);

  // Reveal is pure CSS: hovering the bottom hot-zone (or focusing the input) slides the dock
  // up. No global mousemove listener — cheaper, and works regardless of JS event quirks.

  // "/" focuses the dock search unless another input is focused
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const go = (name: string) => {
    nav(`/entity/${encodeURIComponent(name)}`);
    setQ("");
    setFocused(false);
    inputRef.current?.blur();
  };
  const recall = () => {
    if (!q.trim()) return;
    nav(`/?q=${encodeURIComponent(q.trim())}`);
    setQ("");
    setFocused(false);
    inputRef.current?.blur();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") (e.preventDefault(), setHi((v) => Math.min(v + 1, suggestions.length - 1)));
    else if (e.key === "ArrowDown") (e.preventDefault(), setHi((v) => Math.max(v - 1, -1)));
    else if (e.key === "Enter") {
      e.preventDefault();
      if (hi >= 0 && suggestions[hi]) go(suggestions[hi].name);
      else recall();
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="group pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center">
      {/* invisible hover sensor spanning the bottom edge — brings the dock up on approach */}
      <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-28" aria-hidden />

      <div
        className="pointer-events-auto mb-3 w-[min(680px,94vw)] translate-y-[84%] px-3 transition-transform duration-[340ms] [transition-timing-function:var(--ease-out)] focus-within:translate-y-0 group-hover:translate-y-0"
      >
        {/* suggestions rise above the bar while typing/focused */}
        {focused && suggestions.length > 0 && (
          <div
            className="mb-2 overflow-hidden rounded-[14px] p-1.5"
            style={{ background: "color-mix(in oklab, var(--color-surface-1) 92%, transparent)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)", backdropFilter: "blur(14px)" }}
          >
            <div className="px-2.5 py-1 text-[10px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
              {q.trim() ? "Matches" : "Jump to"}
            </div>
            {suggestions.map((s, idx) => (
              <button
                key={s.name}
                onMouseEnter={() => setHi(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(s.name)}
                className="flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2 text-left transition-colors"
                style={{ background: idx === hi ? "var(--color-surface-3)" : "transparent" }}
              >
                <span className="grid h-6 w-6 place-items-center rounded-[6px]" style={{ color: "var(--color-ink-2)", background: "var(--color-surface-2)" }}>
                  <KindGlyph kind={s.kind} width={13} height={13} />
                </span>
                <span className="flex-1 text-[13px]">{s.name}</span>
                <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-ink-4)" }}>{s.kind}</span>
              </button>
            ))}
          </div>
        )}

        {/* the bar */}
        <div
          className="flex items-center gap-2 rounded-[16px] px-2 py-2"
          style={{ background: "color-mix(in oklab, var(--color-surface-1) 88%, transparent)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex flex-1 items-center gap-2.5 pl-2">
            <Search
              width={17}
              height={17}
              className="flex-none text-[var(--color-ink-3)] transition-colors group-hover:text-[var(--color-brass)] group-focus-within:text-[var(--color-brass)]"
            />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => (setQ(e.target.value), setHi(-1))}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              onKeyDown={onKey}
              placeholder="Search memory, or jump to an entity…"
              className="h-8 flex-1 bg-transparent text-[14px] outline-none"
              aria-label="Universal search"
            />
            {!focused && <Kbd>/</Kbd>}
          </div>

          <div className="hidden items-center gap-1 sm:flex">
            <DockButton onClick={recall} label="Recall">
              <Search width={14} height={14} /> Recall
            </DockButton>
            <DockButton onClick={() => nav("/graph")} label="Graph explorer">
              <GraphIcon width={14} height={14} /> Graph
            </DockButton>
            <DockButton onClick={() => openObserve()} label="Add observation" brass>
              <Plus width={14} height={14} /> Observe
            </DockButton>
          </div>
        </div>

        {/* handle sliver hint — fades out once the dock is revealed */}
        <div className="mt-1 flex justify-center">
          <span className="opacity-100 transition-opacity duration-200 group-hover:opacity-0 group-focus-within:opacity-0" style={{ width: 40, height: 4, borderRadius: 99, background: "var(--color-line-strong)" }} />
        </div>
      </div>
    </div>
  );
}

function DockButton({ children, onClick, label, brass }: { children: React.ReactNode; onClick: () => void; label: string; brass?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[12.5px] font-500 transition-colors active:scale-95"
      style={
        brass
          ? { color: "var(--color-brass)", background: "var(--brass-wash)", border: "1px solid color-mix(in oklab, var(--color-brass) 26%, transparent)" }
          : { color: "var(--color-ink-2)", background: "var(--color-surface-2)", border: "1px solid var(--color-line)" }
      }
    >
      {children}
    </button>
  );
}
