/** Landing-page "Explore" section. Turns the empty home page into a way into the graph:
 *  the whole entity set, grouped by kind, as quick-jump cards — plus a one-line summary of
 *  what the memory graph holds. Gives the home page purpose and plenty of options without
 *  making the user type first. */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useEntityBrowse } from "@/hooks/queries";
import type { EntityKind } from "@/lib/api/types";
import { KindGlyph, ArrowRight } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/primitives";
import { DUR, EASE_OUT } from "@/lib/motion";

const GROUP_ORDER: { kind: EntityKind; label: string }[] = [
  { kind: "account", label: "Accounts" },
  { kind: "service", label: "Services" },
  { kind: "person", label: "People" },
  { kind: "incident", label: "Incidents" },
  { kind: "project", label: "Projects" },
];

export function ExploreGraph() {
  const { data, isLoading } = useEntityBrowse();

  const groups = GROUP_ORDER.map((g) => ({
    ...g,
    items: (data ?? []).filter((e) => e.kind === g.kind),
  })).filter((g) => g.items.length > 0);

  // any entity whose kind isn't in GROUP_ORDER
  const known = new Set(GROUP_ORDER.map((g) => g.kind));
  const other = (data ?? []).filter((e) => !known.has(e.kind));
  if (other.length) groups.push({ kind: "other", label: "Other", items: other });

  const total = data?.length ?? 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: DUR.context, ease: EASE_OUT }}
      className="mt-10"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[13px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-3)" }}>
          Explore the graph
        </h2>
        {total > 0 && (
          <span className="text-[12px]" style={{ color: "var(--color-ink-4)" }}>
            <span className="tnum" style={{ color: "var(--color-ink-2)" }}>{total}</span> entities ·{" "}
            <span className="tnum" style={{ color: "var(--color-ink-2)" }}>{groups.length}</span> types
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 52 }} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g, gi) => (
            <div key={g.kind}>
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
                <KindGlyph kind={g.kind} width={13} height={13} />
                {g.label}
                <span className="tnum">· {g.items.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((e, i) => (
                  <motion.div
                    key={e.name}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: gi * 0.04 + i * 0.02, duration: DUR.normal, ease: EASE_OUT }}
                  >
                    <Link
                      to={`/entity/${encodeURIComponent(e.name)}`}
                      className="evidence group flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
                      style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
                    >
                      <span
                        className="grid h-7 w-7 flex-none place-items-center rounded-[7px]"
                        style={{ color: "var(--color-ink-2)", background: "var(--color-surface-2)" }}
                      >
                        <KindGlyph kind={e.kind} width={14} height={14} />
                      </span>
                      <span className="flex-1 truncate text-[13.5px]">{e.name}</span>
                      <ArrowRight
                        width={14}
                        height={14}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ color: "var(--color-brass)" }}
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
