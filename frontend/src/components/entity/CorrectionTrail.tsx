/** When a value has been corrected, show the retreat: old statement struck through and
 *  dimmed, the correction date, then the new statement entering. Preserves scroll. */
import { motion } from "framer-motion";
import type { Correction } from "@/lib/api/types";
import { shortDate } from "@/lib/format";
import { ArrowRight } from "@/components/ui/icons";

export function CorrectionTrail({ corrections }: { corrections: Correction[] }) {
  if (corrections.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {corrections.map((c) => (
        <motion.div
          key={c.new.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="rounded-[12px] px-4 py-3.5"
          style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
        >
          <div className="mb-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--color-brass)" }} />
            Corrected {shortDate(c.new.observed_at)}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13.5px] line-through" style={{ color: "var(--color-ink-4)" }}>
              {c.old.statement}
            </span>
            <div className="flex items-start gap-2">
              <ArrowRight width={14} height={14} style={{ color: "var(--color-brass)", marginTop: 3, flex: "none" }} />
              <span className="text-[14.5px]" style={{ color: "var(--color-ink)" }}>
                {c.new.statement}
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
