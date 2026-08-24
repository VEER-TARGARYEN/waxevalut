/** Source chip — reads as metadata, behaves as an affordance. Opens the provenance drawer,
 *  never navigates away. */
import { useApp } from "@/store/app";
import { ArrowRight, Doc, Chat, Api } from "@/components/ui/icons";
import type { Source } from "@/lib/api/types";

const glyph = (kind: string | null) => {
  const p = { width: 13, height: 13 };
  if (kind === "document") return <Doc {...p} />;
  if (kind === "api") return <Api {...p} />;
  return <Chat {...p} />;
};

export function SourceChip({ factId, source }: { factId: string; source: Source }) {
  const openProvenance = useApp((s) => s.openProvenance);
  return (
    <button
      onClick={() => openProvenance(factId)}
      className="group inline-flex items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-[11.5px] transition-colors"
      style={{ color: "var(--color-ink-3)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-surface-3)";
        e.currentTarget.style.color = "var(--color-ink-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--color-ink-3)";
      }}
    >
      <span style={{ color: "var(--color-ink-4)" }}>{glyph(source.kind)}</span>
      <span>from:</span>
      <span style={{ color: "var(--color-ink-2)", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        {source.uri}
      </span>
      <ArrowRight
        width={12}
        height={12}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: "var(--color-brass)" }}
      />
    </button>
  );
}
