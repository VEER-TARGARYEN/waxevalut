/** A wax-seal medallion avatar — on-brand for WaxeValut. A brass-gradient seal with a
 *  crimped edge, an embossed inner ring, and the entity's kind glyph pressed into the
 *  centre. Distinctive and tactile where a flat icon-in-a-square read as generic. */
import { useId } from "react";
import { KindGlyph } from "./icons";

export function SealAvatar({ kind, size = 48 }: { kind?: string; size?: number }) {
  const id = useId().replace(/:/g, "");

  return (
    <div className="relative grid flex-none place-items-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0" width={size} height={size} viewBox="0 0 48 48" aria-hidden>
        <defs>
          <radialGradient id={`seal-${id}`} cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#f6d9a6" />
            <stop offset="52%" stopColor="#e0a860" />
            <stop offset="100%" stopColor="#a9762f" />
          </radialGradient>
        </defs>
        {/* crimped seal edge */}
        <g>
          {Array.from({ length: 20 }).map((_, i) => {
            const a = (i / 20) * Math.PI * 2;
            return <circle key={i} cx={24 + 21.5 * Math.cos(a)} cy={24 + 21.5 * Math.sin(a)} r={2} fill="#c68f45" />;
          })}
        </g>
        <circle cx="24" cy="24" r="21" fill={`url(#seal-${id})`} />
        {/* emboss highlight + shadow rings */}
        <circle cx="24" cy="24" r="21" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.22" />
        <circle cx="24" cy="24" r="17.5" fill="none" stroke="#7a5222" strokeWidth="1" strokeOpacity="0.55" strokeDasharray="1.5 3" />
        <circle cx="24" cy="24" r="21" fill="none" stroke="#8a5c26" strokeWidth="1" strokeOpacity="0.5" />
      </svg>
      {/* embossed kind glyph */}
      <span className="relative" style={{ color: "#5a3a16", filter: "drop-shadow(0 1px 0 rgba(255,255,255,0.28))" }}>
        <KindGlyph kind={kind} width={size * 0.44} height={size * 0.44} strokeWidth={1.8} />
      </span>
    </div>
  );
}
