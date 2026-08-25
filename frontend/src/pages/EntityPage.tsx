/** Page 2 — Entity dossier. The entity stays the mental center; Facts / Timeline / Impact /
 *  Graph are contextual sections attached to the header, not separate pages. Tab + as_of live
 *  in the URL so context is preserved and shareable. */
import { useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEntity } from "@/hooks/queries";
import { useApp } from "@/store/app";
import { FactCard } from "@/components/recall/FactCard";
import { RedactionCard } from "@/components/recall/RedactionCard";
import { Timeline, type TimeMark } from "@/components/entity/Timeline";
import { CorrectionTrail } from "@/components/entity/CorrectionTrail";
import { Impact } from "@/components/entity/Impact";
import { GraphView } from "@/components/graph/GraphView";
import { Skeleton } from "@/components/ui/primitives";
import { KindGlyph, Plus } from "@/components/ui/icons";
import { feedContainer, DUR, EASE_OUT } from "@/lib/motion";

type Tab = "facts" | "timeline" | "impact" | "graph";
const TABS: { id: Tab; label: string }[] = [
  { id: "facts", label: "Facts" },
  { id: "timeline", label: "Timeline" },
  { id: "impact", label: "Impact" },
  { id: "graph", label: "Graph" },
];

export function EntityPage() {
  const { name = "" } = useParams();
  const decoded = decodeURIComponent(name);
  const [params, setParams] = useSearchParams();
  const agentId = useApp((s) => s.activeAgentId);
  const openObserve = useApp((s) => s.openObserve);

  const tab = (params.get("tab") as Tab) || "facts";
  const asOf = params.get("as_of");
  const [depth, setDepth] = useState(2);

  const { data, isFetching, isError } = useEntity(decoded, agentId, asOf);

  const setTab = (t: Tab) => {
    const p = new URLSearchParams(params);
    p.set("tab", t);
    setParams(p, { replace: true });
  };
  const setAsOf = (iso: string | null) => {
    const p = new URLSearchParams(params);
    if (iso) p.set("as_of", iso);
    else p.delete("as_of");
    setParams(p, { replace: true });
  };

  const kind = data?.entity.kind;
  const factCount = data?.facts.length ?? 0;

  // fact-density marks for the timeline: every visible fact + both ends of each correction
  const timeMarks = useMemo<TimeMark[]>(() => {
    if (!data) return [];
    const ms: TimeMark[] = data.facts.map((f) => ({ t: new Date(f.observed_at).getTime(), kind: "fact" as const }));
    for (const c of data.corrections) {
      ms.push({ t: new Date(c.new.observed_at).getTime(), kind: "correction" as const });
      ms.push({ t: new Date(c.old.observed_at).getTime(), kind: "fact" as const });
    }
    return ms.filter((m) => !Number.isNaN(m.t));
  }, [data]);

  const header = useMemo(
    () => (
      <div className="flex items-center gap-4">
        <span
          className="grid h-12 w-12 flex-none place-items-center rounded-[12px]"
          style={{ color: "var(--color-brass)", background: "var(--brass-wash)", border: "1px solid color-mix(in oklab, var(--color-brass) 24%, transparent)" }}
        >
          <KindGlyph kind={kind} width={22} height={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-600 tracking-tight" style={{ letterSpacing: "-0.02em" }}>
            {decoded}
          </h1>
          <div className="mt-0.5 flex items-center gap-2.5 text-[12px]" style={{ color: "var(--color-ink-4)" }}>
            <span className="uppercase tracking-wider">{kind ?? "—"}</span>
            {data && (
              <>
                <span>·</span>
                <span>{factCount} visible {factCount === 1 ? "fact" : "facts"}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => openObserve({ entity: decoded })}
          className="inline-flex items-center gap-1.5 rounded-[9px] px-3 py-2 text-[12.5px] font-500 transition-colors"
          style={{ color: "var(--color-brass)", background: "var(--brass-wash)", border: "1px solid color-mix(in oklab, var(--color-brass) 26%, transparent)" }}
        >
          <Plus width={14} height={14} /> Observe
        </button>
      </div>
    ),
    [decoded, kind, data, factCount, openObserve],
  );

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-6 md:px-6">
      {header}

      {/* segmented nav attached to the entity */}
      <div className="sticky top-14 z-20 -mx-4 mt-5 px-4 py-2 backdrop-blur-md md:-mx-6 md:px-6" style={{ background: "color-mix(in oklab, var(--color-base) 80%, transparent)" }}>
        <nav className="flex items-center gap-1" role="tablist">
          {TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.id)}
                className="relative rounded-[9px] px-3.5 py-1.5 text-[13px] font-500 transition-colors"
                style={{ color: on ? "var(--color-ink)" : "var(--color-ink-3)" }}
              >
                {on && (
                  <motion.span layoutId="entity-tab" className="absolute inset-0 -z-10 rounded-[9px]" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)" }} transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                )}
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-4">
        {isError ? (
          <div className="rounded-[12px] px-4 py-4 text-[13px]" style={{ color: "var(--color-danger)", background: "color-mix(in oklab, var(--color-danger) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-danger) 28%, transparent)" }}>
            Can&rsquo;t reach the memory graph. Retrying…
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DUR.normal, ease: EASE_OUT }}
            >
              {tab === "facts" && (
                <FactsSection data={data} loading={!data && isFetching} />
              )}
              {tab === "timeline" && (
                <div className="flex flex-col gap-5">
                  <Timeline asOf={asOf} onChange={setAsOf} loading={isFetching} marks={timeMarks} />
                  {data && data.corrections.length > 0 && (
                    <section>
                      <SectionLabel>Corrections</SectionLabel>
                      <CorrectionTrail corrections={data.corrections} />
                    </section>
                  )}
                  <section>
                    <SectionLabel>
                      {asOf ? "Believed at this point in time" : "Current facts"}
                    </SectionLabel>
                    <FactsSection data={data} loading={!data && isFetching} hideEntity />
                  </section>
                </div>
              )}
              {tab === "impact" && <Impact name={decoded} depth={depth} setDepth={setDepth} />}
              {tab === "graph" && (
                <div className="h-[62vh] overflow-hidden rounded-[14px]" style={{ border: "1px solid var(--color-line)" }}>
                  <GraphView entity={decoded} embedded />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {data && data.relations.length > 0 && tab === "facts" && (
        <section className="mt-8">
          <SectionLabel>Related</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {data.relations.map((r) => (
              <Link
                key={r.target}
                to={`/entity/${encodeURIComponent(r.target)}`}
                className="group inline-flex items-center gap-2 rounded-[9px] px-3 py-2 text-[12.5px] transition-colors"
                style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-brass-dim)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-line)")}
              >
                <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-ink-4)" }}>
                  {r.type.replace(/_/g, " ")}
                </span>
                <span style={{ color: "var(--color-ink)" }}>{r.target}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FactsSection({ data, loading, hideEntity }: { data: ReturnType<typeof useEntity>["data"]; loading: boolean; hideEntity?: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} style={{ height: 76 }} />
        ))}
      </div>
    );
  }
  if (!data) return null;
  if (data.facts.length === 0 && data.redacted_count === 0) {
    return (
      <div className="rounded-[12px] px-4 py-8 text-center text-[13px]" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)", color: "var(--color-ink-4)" }}>
        No facts visible in this lens.
      </div>
    );
  }
  return (
    <motion.div variants={feedContainer} initial="hidden" animate="show" className="flex flex-col gap-2.5">
      {data.facts.map((f) => (
        <FactCard key={f.id} fact={f} showEntity={!hideEntity} />
      ))}
      {data.redacted_count > 0 && <RedactionCard count={data.redacted_count} reason="requires higher clearance" />}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-[11px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
      {children}
    </div>
  );
}
