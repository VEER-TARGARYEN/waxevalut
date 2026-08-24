/** A fact reads as a piece of evidence: the statement dominates, metadata recedes, the
 *  source is quietly clickable. Typography-led, not a heavy dashboard card. Reused verbatim
 *  on Recall and Entity so the mental model stays constant. */
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Fact } from "@/lib/api/types";
import { CLASS_META, relativeTime } from "@/lib/format";
import { ClassDot } from "@/components/ui/primitives";
import { SourceChip } from "./SourceChip";
import { feedItem } from "@/lib/motion";

export function FactCard({ fact, showEntity = true }: { fact: Fact; showEntity?: boolean }) {
  const m = CLASS_META[fact.data_class];
  return (
    <motion.article
      variants={feedItem}
      layout
      className="evidence group relative rounded-[12px] px-4 py-3.5"
      style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
    >
      {/* left classification hairline */}
      <span
        aria-hidden
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
        style={{ background: m.color, opacity: 0.55 }}
      />
      <p className="pl-2 text-[15px] leading-snug" style={{ color: "var(--color-ink)" }}>
        {fact.statement}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider" style={{ color: m.color }}>
          <ClassDot cls={fact.data_class} size={6} /> {m.label}
        </span>
        <span className="text-[11.5px]" style={{ color: "var(--color-ink-4)" }}>
          observed {relativeTime(fact.observed_at)}
        </span>
        <SourceChip factId={fact.id} source={fact.source} />
        {showEntity && fact.entity && (
          <Link
            to={`/entity/${encodeURIComponent(fact.entity)}`}
            className="ml-auto text-[11.5px] transition-colors"
            style={{ color: "var(--color-ink-3)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-brass)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-ink-3)")}
          >
            {fact.entity}
          </Link>
        )}
      </div>
    </motion.article>
  );
}
