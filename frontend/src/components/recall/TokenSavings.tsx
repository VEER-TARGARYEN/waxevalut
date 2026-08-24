/** Token savings as an insight, not a KPI card. Inline, quiet, with an animated number.
 *  Reproduces CognoDB's "connected neighbourhood, not corpus dump" thesis as a measurement. */
import type { TokenStats } from "@/lib/api/types";
import { AnimatedNumber } from "@/components/ui/primitives";
import { ArrowRight } from "@/components/ui/icons";

export function TokenSavings({ tokens }: { tokens: TokenStats }) {
  return (
    <div
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[11px] px-3.5 py-2.5 text-[12.5px]"
      style={{ background: "var(--color-surface-1)", border: "1px solid var(--color-line)" }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--color-ink-4)" }}>Full corpus</span>
        <span className="tnum font-500" style={{ color: "var(--color-ink-3)" }}>
          <AnimatedNumber value={tokens.corpus} /> tok
        </span>
      </div>
      <ArrowRight width={14} height={14} style={{ color: "var(--color-ink-4)" }} />
      <div className="flex items-center gap-2">
        <span style={{ color: "var(--color-ink-4)" }}>Graph packet</span>
        <span className="tnum font-600" style={{ color: "var(--color-ink)" }}>
          <AnimatedNumber value={tokens.packet} /> tok
        </span>
      </div>
      <div
        className="ml-auto inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[12px] font-600"
        style={{ color: "var(--color-brass)", background: "var(--brass-wash)" }}
      >
        <AnimatedNumber value={tokens.reduction_pct} />% smaller
      </div>
      <div className="basis-full text-[10.5px]" style={{ color: "var(--color-ink-4)" }}>
        {tokens.note ?? "token counts are estimates"}
      </div>
    </div>
  );
}
