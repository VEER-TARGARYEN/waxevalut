/** Page 1 — Recall. The primary experience. Search transforms into answer in place; the
 *  agent lens stays visible; results, redaction and token savings emerge below. Query lives
 *  in the URL (?q=) so the context is shareable and survives reload. */
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useRecall } from "@/hooks/queries";
import { useApp } from "@/store/app";
import { SearchBar } from "@/components/recall/SearchBar";
import { FactCard } from "@/components/recall/FactCard";
import { RedactionCard } from "@/components/recall/RedactionCard";
import { TokenSavings } from "@/components/recall/TokenSavings";
import { ExploreGraph } from "@/components/recall/ExploreGraph";
import { Skeleton } from "@/components/ui/primitives";
import { DUR, EASE_OUT, feedContainer } from "@/lib/motion";

export function RecallPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const agentId = useApp((s) => s.activeAgentId);
  const active = query.trim().length > 0;

  const { data, isFetching, isError } = useRecall(agentId, query);

  const setQuery = (q: string) => {
    if (q) setParams({ q }, { replace: false });
    else setParams({}, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-24 md:px-6">
      {/* search — a compact hero when idle (leaving room for Explore below), docks upward
          once a query is active */}
      <motion.div
        layout
        transition={{ duration: DUR.spatial, ease: EASE_OUT }}
        style={{ paddingTop: active ? "28px" : "11vh" }}
      >
        {!active && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.context, ease: EASE_OUT }}
            className="mb-6 text-center"
          >
            <h1 className="text-[27px] font-600 tracking-tight" style={{ letterSpacing: "-0.02em" }}>
              What do you want to know?
            </h1>
            <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-3)" }}>
              Recall authorized organizational memory — bounded, sourced, and current.
            </p>
          </motion.div>
        )}

        <SearchBar value={query} onChange={setQuery} onSubmit={setQuery} compact={active} />

        {!active && <ExampleChips onPick={setQuery} />}
      </motion.div>

      {/* browse entry point — fills the idle home page with everything in the graph */}
      {!active && <ExploreGraph />}

      {/* results */}
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.context, ease: EASE_OUT, delay: 0.05 }}
            className="mt-6 pb-24"
          >
            {isError ? (
              <ErrorState />
            ) : !data && isFetching ? (
              <LoadingState />
            ) : data ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-[12.5px]" style={{ color: "var(--color-ink-3)" }}>
                    {data.facts.length > 0 ? (
                      <>
                        <span className="font-500" style={{ color: "var(--color-ink-2)" }}>
                          {data.facts.length}
                        </span>{" "}
                        {data.facts.length === 1 ? "fact" : "facts"} for{" "}
                        <span style={{ color: "var(--color-brass)" }}>{data.agent.name}</span>
                      </>
                    ) : (
                      "No facts in this lens"
                    )}
                  </div>
                  {isFetching && <MiniSpinner />}
                </div>

                {data.tokens.corpus > 0 && (
                  <div className="mb-4">
                    <TokenSavings tokens={data.tokens} />
                  </div>
                )}

                <motion.div variants={feedContainer} initial="hidden" animate="show" className="flex flex-col gap-2.5">
                  {data.facts.map((f) => (
                    <FactCard key={f.id} fact={f} />
                  ))}
                  {data.redacted_count > 0 && (
                    <RedactionCard count={data.redacted_count} reason={data.redacted_reason} />
                  )}
                  {data.facts.length === 0 && data.redacted_count === 0 && <EmptyResult query={query} />}
                </motion.div>
              </>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExampleChips({ onPick }: { onPick: (q: string) => void }) {
  const examples = ["Acme", "Payments API", "Auth Gateway", "Umbrella Health"];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15, duration: DUR.context }}
      className="mt-5 flex flex-wrap items-center justify-center gap-2"
    >
      <span className="text-[12px]" style={{ color: "var(--color-ink-4)" }}>
        Try
      </span>
      {examples.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="rounded-full px-3 py-1.5 text-[12.5px] transition-colors"
          style={{ color: "var(--color-ink-2)", background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
          onMouseEnter={(ev) => (ev.currentTarget.style.borderColor = "var(--color-brass-dim)")}
          onMouseLeave={(ev) => (ev.currentTarget.style.borderColor = "var(--color-line)")}
        >
          {e}
        </button>
      ))}
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton style={{ height: 44 }} />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} style={{ height: 78, opacity: 1 - i * 0.22 }} />
      ))}
    </div>
  );
}

function MiniSpinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full"
      style={{ border: "2px solid var(--color-line-strong)", borderTopColor: "var(--color-brass)" }}
    />
  );
}

function EmptyResult({ query }: { query: string }) {
  return (
    <div className="rounded-[12px] px-4 py-10 text-center" style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}>
      <div className="text-[14px]" style={{ color: "var(--color-ink-2)" }}>
        Nothing recorded about &ldquo;{query}&rdquo; in this lens.
      </div>
      <div className="mt-1.5 text-[12.5px]" style={{ color: "var(--color-ink-4)" }}>
        Try a different agent, or add an observation.
      </div>
    </div>
  );
}

function ErrorState() {
  return (
    <div
      className="rounded-[12px] px-4 py-4 text-[13px]"
      style={{ background: "color-mix(in oklab, var(--color-danger) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--color-danger) 30%, transparent)", color: "var(--color-danger)" }}
    >
      Can&rsquo;t reach the memory graph right now. Retrying…
    </div>
  );
}
