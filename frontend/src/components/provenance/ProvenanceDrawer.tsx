/** Page 5 — Provenance drawer. The receipt behind a piece of information. Right-side slide-
 *  over, never a route. Fact → Source → Session, then a collapsed "How this was retrieved"
 *  block that reveals the parameterised Cypher — the query is the citation. */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useProvenance } from "@/hooks/queries";
import { useApp } from "@/store/app";
import { CLASS_META, absoluteDate } from "@/lib/format";
import { Close, ChevronDown, Copy, Check, Doc, Chat, Api as ApiIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/primitives";
import { drawerVariants, fade, DUR } from "@/lib/motion";

export function ProvenanceDrawer() {
  const target = useApp((s) => s.provenance);
  const close = useApp((s) => s.closeProvenance);
  const { data, isLoading } = useProvenance(target?.factId ?? null);
  const [showCypher, setShowCypher] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && target && close();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [target, close]);

  useEffect(() => {
    if (target) setShowCypher(false);
  }, [target]);

  const copy = () => {
    if (!data) return;
    navigator.clipboard?.writeText(data.retrieval_cypher);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sourceIcon = (k: string | null) => {
    const p = { width: 15, height: 15 };
    if (k === "document") return <Doc {...p} />;
    if (k === "api") return <ApiIcon {...p} />;
    return <Chat {...p} />;
  };

  return (
    <AnimatePresence>
      {target && (
        <>
          <motion.div
            variants={fade}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={close}
            className="fixed inset-0 z-[80]"
            style={{ background: "color-mix(in oklab, var(--color-base) 40%, transparent)" }}
          />
          <motion.aside
            variants={drawerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="fixed right-0 top-0 z-[81] flex h-full w-[min(420px,92vw)] flex-col"
            style={{ background: "var(--color-surface-1)", borderLeft: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}
            role="dialog"
            aria-label="Provenance"
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-line)" }}>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
                  Provenance
                </div>
                <div className="text-[14px] font-500">Where this came from</div>
              </div>
              <button onClick={close} aria-label="Close" className="text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]">
                <Close width={18} height={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {isLoading || !data ? (
                <div className="flex flex-col gap-4">
                  <Skeleton style={{ height: 90 }} />
                  <Skeleton style={{ height: 70 }} />
                  <Skeleton style={{ height: 70 }} />
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* fact */}
                  <Section label="Fact">
                    <p className="text-[14.5px] leading-snug" style={{ color: "var(--color-ink)" }}>
                      {data.fact.statement}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide" style={{ color: CLASS_META[data.fact.data_class].color }}>
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: CLASS_META[data.fact.data_class].color }} />
                        {CLASS_META[data.fact.data_class].label}
                      </span>
                      <span className="text-[11.5px]" style={{ color: "var(--color-ink-4)" }}>
                        {absoluteDate(data.fact.observed_at)}
                      </span>
                      {data.fact.entity && (
                        <span className="ml-auto text-[11.5px]" style={{ color: "var(--color-ink-3)" }}>
                          {data.fact.entity}
                        </span>
                      )}
                    </div>
                  </Section>

                  {/* source */}
                  <Section label="Source">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-[9px]" style={{ color: "var(--color-ink-2)", background: "var(--color-surface-3)" }}>
                        {sourceIcon(data.source.kind)}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13px]" style={{ color: "var(--color-ink)", fontFamily: "var(--font-mono)" }}>
                          {data.source.uri}
                        </div>
                        <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--color-ink-4)" }}>
                          {data.source.kind} · ingested {absoluteDate(data.source.ingested_at)}
                        </div>
                      </div>
                    </div>
                  </Section>

                  {/* session */}
                  <Section label="Session">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span style={{ color: "var(--color-ink-3)" }}>Recorded by</span>
                      <span style={{ color: "var(--color-ink)" }}>{data.session.agent ?? "—"}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[12.5px]">
                      <span style={{ color: "var(--color-ink-3)" }}>Session</span>
                      <span style={{ color: "var(--color-ink-2)", fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                        {data.session.id}
                      </span>
                    </div>
                  </Section>

                  {/* how retrieved — collapsed */}
                  <div className="overflow-hidden rounded-[11px]" style={{ border: "1px solid var(--color-line)" }}>
                    <button
                      onClick={() => setShowCypher((v) => !v)}
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-[12.5px] transition-colors"
                      style={{ background: "var(--color-surface-2)", color: "var(--color-ink-2)" }}
                    >
                      How this was retrieved
                      <ChevronDown width={15} height={15} style={{ transform: showCypher ? "rotate(180deg)" : "none", transition: "transform var(--dur-normal) var(--ease-out)", color: "var(--color-ink-4)" }} />
                    </button>
                    <AnimatePresence initial={false}>
                      {showCypher && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: DUR.normal }}>
                          <div className="relative">
                            <pre
                              className="max-h-[220px] overflow-auto px-3.5 py-3 text-[11px] leading-relaxed"
                              style={{ color: "var(--color-ink-2)", fontFamily: "var(--font-mono)", background: "var(--color-base)" }}
                            >
                              {data.retrieval_cypher}
                            </pre>
                            <button
                              onClick={copy}
                              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-[7px] px-2 py-1 text-[11px] transition-colors"
                              style={{ color: copied ? "var(--color-ok)" : "var(--color-ink-3)", background: "var(--color-surface-2)", border: "1px solid var(--color-line)" }}
                            >
                              {copied ? <Check width={12} height={12} /> : <Copy width={12} height={12} />}
                              {copied ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 text-[10.5px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
        {label}
      </div>
      <div className="rounded-[12px] px-3.5 py-3" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)" }}>
        {children}
      </div>
    </section>
  );
}
