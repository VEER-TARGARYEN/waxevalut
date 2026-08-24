/** Page 4 — Add observation. Feels like adding memory, not filling a database form: grouped
 *  semantic sections, a 4-way classification control, entity autocomplete. Keeps state on
 *  failure; on success shows a quiet confirmation and the new fact appears in relevant views
 *  (queries are invalidated by the mutation hook). The context underneath stays visible. */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useAutocomplete, useObserve } from "@/hooks/queries";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useApp } from "@/store/app";
import type { DataClass, SourceKind } from "@/lib/api/types";
import { CLASS_META } from "@/lib/format";
import { Button, Segmented } from "@/components/ui/primitives";
import { Close, Check, Doc, Chat, Api as ApiIcon } from "@/components/ui/icons";
import { DUR, EASE_OUT } from "@/lib/motion";

const SOURCE_KINDS: { value: SourceKind; label: string; icon: React.ReactNode }[] = [
  { value: "conversation", label: "Conversation", icon: <Chat width={14} height={14} /> },
  { value: "document", label: "Document", icon: <Doc width={14} height={14} /> },
  { value: "api", label: "API", icon: <ApiIcon width={14} height={14} /> },
];

export function ObserveModal() {
  const open = useApp((s) => s.observeOpen);
  const close = useApp((s) => s.closeObserve);
  const prefill = useApp((s) => s.observePrefillEntity);
  const supersedes = useApp((s) => s.observeSupersedes);

  const [entity, setEntity] = useState("");
  const [statement, setStatement] = useState("");
  const [dataClass, setDataClass] = useState<DataClass>("internal");
  const [sourceKind, setSourceKind] = useState<SourceKind>("conversation");
  const [sourceUri, setSourceUri] = useState("");
  const [done, setDone] = useState(false);

  const isMobile = useIsMobile();
  const observe = useObserve();
  const { data: suggestions } = useAutocomplete(entity);
  const showSuggest = entity.trim().length > 0 && (suggestions?.length ?? 0) > 0 && !suggestions?.some((s) => s.name === entity);

  useEffect(() => {
    if (open) {
      setEntity(prefill ?? "");
      setStatement("");
      setDataClass("internal");
      setSourceKind("conversation");
      setSourceUri("");
      setDone(false);
    }
  }, [open, prefill]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && open && close();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, close]);

  const valid = entity.trim() && statement.trim();

  const submit = async () => {
    if (!valid) return;
    try {
      await observe.mutateAsync({
        entity: entity.trim(),
        statement: statement.trim(),
        data_class: dataClass,
        source_kind: sourceKind,
        source_uri: sourceUri.trim(),
        supersedes_fact_id: supersedes?.factId ?? null,
      });
      setDone(true);
      setTimeout(close, 1100);
    } catch {
      /* keep form state; error surfaces via observe.isError */
    }
  };

  const classOptions = useMemo(
    () =>
      (["public", "internal", "pii", "secret"] as DataClass[]).map((c) => ({
        value: c,
        label: CLASS_META[c].label,
        color: CLASS_META[c].color,
      })),
    [],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center overflow-y-auto px-0 py-0 sm:items-start sm:px-4 sm:py-[8vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.normal }}
          onMouseDown={close}
          style={{ background: "color-mix(in oklab, var(--color-base) 55%, transparent)", backdropFilter: "blur(3px)" }}
        >
          <motion.div
            onMouseDown={(e) => e.stopPropagation()}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: DUR.context, ease: EASE_OUT }}
            className="max-h-[92vh] w-full overflow-hidden rounded-t-[20px] sm:max-h-none sm:max-w-[520px] sm:rounded-[18px]"
            style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}
          >
            {/* grab handle — reads as a sheet on mobile only */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <span style={{ width: 36, height: 4, borderRadius: 99, background: "var(--color-line-strong)" }} />
            </div>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-line)" }}>
              <div>
                <div className="text-[15px] font-600">Add observation</div>
                <div className="text-[12px]" style={{ color: "var(--color-ink-4)" }}>
                  {supersedes ? "Recording a correction to memory" : "Recording a new fact into memory"}
                </div>
              </div>
              <button onClick={close} aria-label="Close" className="text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]">
                <Close width={18} height={18} />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 px-5 py-14">
                  <motion.span
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    className="grid h-12 w-12 place-items-center rounded-full"
                    style={{ color: "var(--color-ok)", background: "color-mix(in oklab, var(--color-ok) 14%, transparent)" }}
                  >
                    <Check width={24} height={24} />
                  </motion.span>
                  <div className="text-[14px]">Committed to memory</div>
                  <div className="text-[12px]" style={{ color: "var(--color-ink-4)" }}>
                    {entity} · now live in recall
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form" exit={{ opacity: 0 }} className="flex max-h-[calc(92vh-72px)] flex-col gap-5 overflow-y-auto px-5 py-5 sm:max-h-none">
                  {supersedes && (
                    <div className="rounded-[10px] px-3 py-2.5 text-[12px]" style={{ background: "var(--brass-wash)", border: "1px solid color-mix(in oklab, var(--color-brass) 22%, transparent)" }}>
                      <div className="mb-0.5 uppercase tracking-wider" style={{ color: "var(--color-brass)", fontSize: 10 }}>
                        Correcting
                      </div>
                      <div className="line-through" style={{ color: "var(--color-ink-3)" }}>
                        {supersedes.statement}
                      </div>
                    </div>
                  )}

                  {/* entity */}
                  <Field label="Entity">
                    <div className="relative">
                      <input
                        value={entity}
                        onChange={(e) => setEntity(e.target.value)}
                        placeholder="Which customer, service, or person?"
                        className="w-full rounded-[10px] px-3 py-2.5 text-[14px] outline-none"
                        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)" }}
                        autoFocus
                      />
                      {showSuggest && (
                        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 overflow-hidden rounded-[10px] p-1" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}>
                          {suggestions!.slice(0, 4).map((s) => (
                            <button
                              key={s.name}
                              onClick={() => setEntity(s.name)}
                              className="flex w-full items-center justify-between rounded-[7px] px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--color-surface-3)]"
                            >
                              {s.name}
                              <span className="text-[10.5px] uppercase" style={{ color: "var(--color-ink-4)" }}>
                                {s.kind}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>

                  {/* statement */}
                  <Field label="Statement">
                    <textarea
                      value={statement}
                      onChange={(e) => setStatement(e.target.value)}
                      placeholder="What did we learn?"
                      rows={3}
                      className="w-full resize-none rounded-[10px] px-3 py-2.5 text-[14px] outline-none"
                      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)" }}
                    />
                  </Field>

                  {/* classification */}
                  <Field label="Classification">
                    <Segmented value={dataClass} onChange={setDataClass} options={classOptions} />
                  </Field>

                  {/* source */}
                  <Field label="Source">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1.5">
                        {SOURCE_KINDS.map((s) => {
                          const on = s.value === sourceKind;
                          return (
                            <button
                              key={s.value}
                              onClick={() => setSourceKind(s.value)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] px-2 py-2 text-[12px] transition-colors"
                              style={{ color: on ? "var(--color-ink)" : "var(--color-ink-3)", background: on ? "var(--color-surface-3)" : "var(--color-surface-2)", border: `1px solid ${on ? "var(--color-line-strong)" : "var(--color-line)"}` }}
                            >
                              {s.icon}
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        value={sourceUri}
                        onChange={(e) => setSourceUri(e.target.value)}
                        placeholder="Reference — e.g. ticket #4599"
                        className="w-full rounded-[10px] px-3 py-2 text-[13px] outline-none"
                        style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)", fontFamily: "var(--font-mono)" }}
                      />
                    </div>
                  </Field>

                  {observe.isError && (
                    <div className="rounded-[9px] px-3 py-2 text-[12.5px]" style={{ color: "var(--color-danger)", background: "color-mix(in oklab, var(--color-danger) 10%, transparent)" }}>
                      Couldn&rsquo;t record the observation. Your input is preserved — try again.
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button variant="outline" onClick={close}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={submit} disabled={!valid || observe.isPending}>
                      {observe.isPending ? "Committing…" : "Commit to memory"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

void DUR;
void EASE_OUT;
