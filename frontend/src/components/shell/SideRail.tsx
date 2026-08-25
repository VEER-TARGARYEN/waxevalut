/** A slim vertical shortcut rail pinned to the left edge, filling what was empty margin on
 *  wide screens. Icon shortcuts for the core moves (Recall, Graph, Observe, Command palette)
 *  with active-route highlighting and tooltips. Hidden below lg where the margin disappears. */
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/store/app";
import { Search, GraphIcon, Plus } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/primitives";
import type { ReactNode } from "react";

function RailButton({
  children,
  label,
  onClick,
  active,
  brass,
  hint,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  brass?: boolean;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group relative grid h-11 w-11 place-items-center rounded-[12px] transition-colors active:scale-90"
      style={{
        color: brass ? "var(--color-brass)" : active ? "var(--color-ink)" : "var(--color-ink-3)",
        background: active ? "var(--color-surface-2)" : brass ? "var(--brass-wash)" : "transparent",
        border: `1px solid ${active ? "var(--color-line)" : brass ? "color-mix(in oklab, var(--color-brass) 22%, transparent)" : "transparent"}`,
      }}
      onMouseEnter={(e) => { if (!active && !brass) e.currentTarget.style.background = "var(--color-surface-1)"; }}
      onMouseLeave={(e) => { if (!active && !brass) e.currentTarget.style.background = "transparent"; }}
    >
      {active && (
        <span className="absolute -left-[7px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full" style={{ background: "var(--color-brass)", boxShadow: "0 0 10px var(--color-brass-glow)" }} />
      )}
      {children}
      {/* tooltip */}
      <span
        className="pointer-events-none absolute left-[calc(100%+10px)] z-50 hidden items-center gap-2 whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[12px] group-hover:flex"
        style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line-strong)", color: "var(--color-ink-2)", boxShadow: "var(--shadow-pop)" }}
      >
        {label}
        {hint && <Kbd>{hint}</Kbd>}
      </span>
    </button>
  );
}

export function SideRail() {
  const nav = useNavigate();
  const loc = useLocation();
  const openObserve = useApp((s) => s.openObserve);
  const setPalette = useApp((s) => s.setPalette);

  const onHome = loc.pathname === "/";
  const onGraph = loc.pathname.startsWith("/graph");

  return (
    <nav
      aria-label="Shortcuts"
      className="fixed left-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1.5 rounded-[16px] p-1.5 lg:flex"
      style={{ background: "color-mix(in oklab, var(--color-surface-1) 70%, transparent)", border: "1px solid var(--color-line)", backdropFilter: "blur(10px)" }}
    >
      <RailButton label="Recall" hint="/" active={onHome} onClick={() => nav("/")}>
        <Search width={19} height={19} />
      </RailButton>
      <RailButton label="Graph explorer" active={onGraph} onClick={() => nav("/graph")}>
        <GraphIcon width={19} height={19} />
      </RailButton>
      <RailButton label="Command palette" hint="⌘K" onClick={() => setPalette(true)}>
        <PaletteGlyph />
      </RailButton>
      <div className="my-0.5 h-px w-6" style={{ background: "var(--color-line)" }} />
      <RailButton label="Add observation" brass onClick={() => openObserve()}>
        <Plus width={19} height={19} />
      </RailButton>
    </nav>
  );
}

function PaletteGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
      <path d="M8 10l2 2-2 2M12.5 14h3.5" />
    </svg>
  );
}
