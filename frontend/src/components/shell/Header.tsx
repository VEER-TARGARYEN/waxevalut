/** The near-invisible header: wordmark + contextual breadcrumb (left), agent switcher
 *  (center), connection + add-observation (right). */
import { Link, useLocation, useParams } from "react-router-dom";
import { Wordmark } from "./Logo";
import { AgentSwitcher } from "./AgentSwitcher";
import { ConnectionStatus } from "./ConnectionStatus";
import { useApp } from "@/store/app";
import { Plus } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/primitives";

function Breadcrumb() {
  const { name } = useParams();
  const loc = useLocation();
  const decoded = name ? decodeURIComponent(name) : null;
  const onGraph = loc.pathname.startsWith("/graph");

  if (!decoded && !onGraph) return null;
  return (
    <nav className="flex items-center gap-2 text-[13px]" style={{ color: "var(--color-ink-3)" }}>
      <span style={{ color: "var(--color-ink-4)" }}>/</span>
      {onGraph ? (
        <span style={{ color: "var(--color-ink-2)" }}>Graph</span>
      ) : (
        <Link to={`/entity/${encodeURIComponent(decoded!)}`} className="brass-underline" style={{ color: "var(--color-ink)" }}>
          {decoded}
        </Link>
      )}
    </nav>
  );
}

export function Header() {
  const openObserve = useApp((s) => s.openObserve);
  const setPalette = useApp((s) => s.setPalette);

  return (
    <header
      className="sticky top-0 z-40 flex h-14 items-center gap-4 px-4 backdrop-blur-xl md:px-6"
      style={{
        background: "color-mix(in oklab, var(--color-base) 78%, transparent)",
        borderBottom: "1px solid var(--color-line)",
      }}
    >
      <Link to="/" className="flex items-center gap-3">
        <Wordmark />
      </Link>
      <Breadcrumb />

      <div className="mx-auto hidden md:block">
        <AgentSwitcher />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <button
          onClick={() => setPalette(true)}
          className="hidden items-center gap-2 rounded-[9px] px-2.5 py-1.5 text-[12px] transition-colors sm:flex"
          style={{ color: "var(--color-ink-3)", background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
          aria-label="Open command palette"
        >
          Search <Kbd>⌘K</Kbd>
        </button>
        <button
          onClick={() => openObserve()}
          className="inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[12.5px] font-500 transition-colors"
          style={{ color: "var(--color-brass)", background: "var(--brass-wash)", border: "1px solid color-mix(in oklab, var(--color-brass) 30%, transparent)" }}
        >
          <Plus width={15} height={15} />
          <span className="hidden sm:inline">Observation</span>
        </button>
        <ConnectionStatus />
      </div>
    </header>
  );
}
