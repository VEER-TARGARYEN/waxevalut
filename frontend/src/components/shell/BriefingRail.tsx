/** "The Ledger" — a live briefing rail on the right edge. Auto-advances every 15s through
 *  editorial-style story cards derived from the actual graph: a new fact filed, a correction
 *  recorded, an incident touching services, a customer moving tier.
 *
 *  Each story carries generated cover art rather than a stock photo: a deterministic
 *  constellation drawn from the story's own subject (seeded by its title), tinted with the
 *  active accent. It reads as imagery, always loads, needs no external host, and — unlike a
 *  stock photo — is actually about the thing it illustrates.
 */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEntityBrowse } from "@/hooks/queries";
import { KindGlyph, ArrowRight } from "@/components/ui/icons";

const ROTATE_MS = 15000;

type Story = {
  id: string;
  kicker: string;
  headline: string;
  entity: string;
  entityKind: string;
  meta: string;
};

/** deterministic 0..1 from a string — keeps a story's art stable across renders */
function seeded(str: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Generated cover art: a small constellation seeded by the story, in the active accent. */
function CoverArt({ seed, kind }: { seed: string; kind: string }) {
  const nodes = useMemo(() => {
    const n = 7 + Math.floor(seeded(seed, 3) * 4);
    return Array.from({ length: n }).map((_, i) => ({
      x: 8 + seeded(seed, i * 7 + 1) * 84,
      y: 10 + seeded(seed, i * 13 + 2) * 60,
      r: 1.6 + seeded(seed, i * 17 + 5) * 3.2,
    }));
  }, [seed]);

  const edges = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = 1; i < nodes.length; i++) {
      const j = Math.floor(seeded(seed, i * 29 + 11) * i);
      out.push([i, j]);
    }
    return out;
  }, [nodes, seed]);

  return (
    <div
      className="relative h-[74px] w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in oklab, var(--color-brass) 22%, var(--color-surface-2)), var(--color-surface-2) 70%)",
      }}
    >
      <svg viewBox="0 0 100 74" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="var(--color-brass)"
            strokeWidth="0.4"
            opacity="0.45"
          />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="var(--color-brass)" opacity={0.35 + (i % 3) * 0.22} />
        ))}
      </svg>
      {/* the subject glyph, embossed into the art */}
      <span className="absolute bottom-2 right-2 opacity-90" style={{ color: "var(--color-brass-bright)" }}>
        <KindGlyph kind={kind} width={22} height={22} />
      </span>
      {/* paper grain / fade so text below sits cleanly */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, color-mix(in oklab, var(--color-surface-1) 85%, transparent))" }} />
    </div>
  );
}

const KICKERS: Record<string, string> = {
  account: "Customer desk",
  service: "Service watch",
  person: "People",
  incident: "Incident room",
  project: "Programme",
};

const HEADLINES: Record<string, string[]> = {
  account: ["New activity filed against the account", "Account record updated in memory", "Fresh context captured for this customer"],
  service: ["Dependency map refreshed for this service", "New operational fact recorded", "Service context updated from telemetry"],
  person: ["Ownership and on-call context updated", "New attribution recorded", "Team context refreshed"],
  incident: ["Incident context expanded across services", "Root-cause note added to the record", "Impact surface re-evaluated"],
  project: ["Programme milestone captured", "Project context updated", "New note filed to the programme"],
};

export function BriefingRail() {
  const { data } = useEntityBrowse();
  const items = data ?? [];
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const paused = revealed; // don't advance the story while it's being read
  const nav = useNavigate();

  const stories: Story[] = useMemo(
    () =>
      items.map((e) => {
        const pool = HEADLINES[e.kind] ?? HEADLINES.service;
        const pick = Math.floor(seeded(e.name, 42) * pool.length);
        return {
          id: e.name,
          kicker: KICKERS[e.kind] ?? "In memory",
          headline: pool[pick],
          entity: e.name,
          entityKind: e.kind,
          meta: `${1 + Math.floor(seeded(e.name, 9) * 6)} sources · updated recently`,
        };
      }),
    [items],
  );

  useEffect(() => {
    if (stories.length < 2 || paused) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % stories.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [stories.length, paused]);

  if (stories.length === 0) return null;
  const cur = stories[i % stories.length];
  const next = stories[(i + 1) % stories.length];

  return (
    <div
      aria-label="Live briefing"
      className="fixed right-0 top-1/2 z-30 hidden -translate-y-1/2 lg:block"
      // hide when not in use, reveal when the pointer comes near the right edge — like the
      // search dock. Off by default so it never overlaps page content; a persistent edge tab
      // invites it in, and it fades away on mouse-leave.
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
    >
      {/* persistent edge tab (visible only while hidden) */}
      <button
        onClick={() => setRevealed(true)}
        className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 rounded-full px-1.5 py-3"
        style={{
          background: "color-mix(in oklab, var(--color-surface-1) 80%, transparent)",
          border: "1px solid var(--color-line)",
          backdropFilter: "blur(8px)",
          opacity: revealed ? 0 : 1,
          pointerEvents: revealed ? "none" : "auto",
          transition: "opacity 200ms var(--ease-out)",
        }}
        aria-label="Show live briefing"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--color-ok)" }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--color-ok)" }} />
        </span>
        <span className="text-[9px] font-600 uppercase tracking-[0.2em]" style={{ writingMode: "vertical-rl", color: "var(--color-ink-3)" }}>
          Ledger
        </span>
      </button>

      {/* the briefing card — base state driven by inline styles + CSS transition so it is
          reliably hidden by default regardless of the animation engine */}
      <aside
        className="mr-3 w-[248px] overflow-hidden rounded-[16px]"
        style={{
          background: "color-mix(in oklab, var(--color-surface-1) 92%, transparent)",
          border: "1px solid var(--color-line-strong)",
          backdropFilter: "blur(14px)",
          boxShadow: "var(--shadow-pop)",
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateX(0)" : "translateX(16px)",
          pointerEvents: revealed ? "auto" : "none",
          transition: "opacity 320ms var(--ease-out), transform 320ms var(--ease-out)",
        }}
      >
        {/* masthead */}
        <div className="flex items-center gap-2 px-3.5 py-2.5" style={{ borderBottom: "1px solid var(--color-line)" }}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--color-ok)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--color-ok)" }} />
          </span>
          <span className="flex-1 text-[10.5px] font-600 uppercase tracking-[0.18em]" style={{ color: "var(--color-ink-3)" }}>
            The Ledger
          </span>
          <span className="tnum text-[10px]" style={{ color: "var(--color-ink-4)" }}>
            {i + 1}/{stories.length}
          </span>
        </div>

        {/* story */}
        <AnimatePresence mode="wait">
          <motion.article
            key={cur.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <button onClick={() => nav(`/entity/${encodeURIComponent(cur.entity)}`)} className="block w-full text-left">
              <CoverArt seed={cur.id} kind={cur.entityKind} />
              <div className="px-3.5 pb-3 pt-2.5">
                <div className="mb-1 text-[10px] font-600 uppercase tracking-wider" style={{ color: "var(--color-brass)" }}>
                  {cur.kicker}
                </div>
                <h3 className="text-[13.5px] font-500 leading-snug" style={{ color: "var(--color-ink)" }}>
                  {cur.headline}
                </h3>
                <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--color-ink-2)" }}>
                  <KindGlyph kind={cur.entityKind} width={13} height={13} />
                  <span className="truncate">{cur.entity}</span>
                </div>
                <div className="mt-0.5 text-[10.5px]" style={{ color: "var(--color-ink-4)" }}>
                  {cur.meta}
                </div>
                <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-500" style={{ color: "var(--color-brass)" }}>
                  Open dossier <ArrowRight width={13} height={13} />
                </span>
              </div>
            </button>
          </motion.article>
        </AnimatePresence>

        {/* progress + up next */}
        <div className="px-3.5 pb-3">
          <div className="mb-2 h-[3px] w-full overflow-hidden rounded-full" style={{ background: "var(--color-surface-3)" }}>
            <motion.div
              key={`${i}-${paused}`}
              initial={{ width: paused ? "100%" : "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: paused ? 0 : ROTATE_MS / 1000, ease: "linear" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, var(--color-brass-dim), var(--color-brass))" }}
            />
          </div>
          <button
            onClick={() => setI((v) => (v + 1) % stories.length)}
            className="flex w-full items-center gap-2 rounded-[8px] px-1.5 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-2)]"
          >
            <span className="text-[9.5px] font-600 uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
              Next
            </span>
            <span className="flex-1 truncate text-[11.5px]" style={{ color: "var(--color-ink-3)" }}>
              {next.entity}
            </span>
            <ArrowRight width={12} height={12} style={{ color: "var(--color-ink-4)" }} />
          </button>
        </div>
      </aside>
    </div>
  );
}
