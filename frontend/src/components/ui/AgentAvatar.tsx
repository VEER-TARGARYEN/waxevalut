/** A generative identity emblem for an agent — no initials, no words. Each agent gets a
 *  deterministic little "sigil": an orbital ring of nodes seeded by its id, over a radial
 *  glow in its clearance colour. Unique per agent, always renders, needs no photo host, and
 *  stays on-brand (a memory graph in miniature). */
import { useId, useMemo } from "react";

const CLEARANCE_COLOR = [
  "var(--color-public)",
  "var(--color-internal)",
  "var(--color-pii)",
  "var(--color-secret)",
];

function seeded(str: string, salt: number) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function AgentAvatar({
  id,
  clearance,
  size = 30,
  rounded = 9,
}: {
  id: string;
  clearance: number;
  size?: number;
  rounded?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const color = CLEARANCE_COLOR[clearance] ?? CLEARANCE_COLOR[0];

  const { nodes, links, coreR } = useMemo(() => {
    const count = 3 + Math.floor(seeded(id, 1) * 3); // 3..5 orbiting nodes
    const baseA = seeded(id, 2) * Math.PI * 2;
    const nodes = Array.from({ length: count }).map((_, i) => {
      const a = baseA + (i / count) * Math.PI * 2 + (seeded(id, i * 7 + 3) - 0.5) * 0.7;
      const rad = 8 + seeded(id, i * 11 + 4) * 5.5; // orbit radius
      return { x: 16 + rad * Math.cos(a), y: 16 + rad * Math.sin(a), r: 1.5 + seeded(id, i * 13 + 5) * 1.6 };
    });
    const links = nodes.map((_, i) => [i, (i + 1) % nodes.length] as [number, number]);
    return { nodes, links, coreR: 2.4 + seeded(id, 9) * 1.2 };
  }, [id]);

  return (
    <span
      className="relative inline-block flex-none overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        border: `1px solid color-mix(in oklab, ${color} 42%, transparent)`,
        background: `radial-gradient(120% 120% at 32% 26%, color-mix(in oklab, ${color} 30%, var(--color-surface-3)), var(--color-surface-2))`,
      }}
    >
      <svg viewBox="0 0 32 32" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={`ag-${uid}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.25" />
          </radialGradient>
        </defs>
        {links.map(([a, b], i) => (
          <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={color} strokeWidth="0.6" opacity="0.45" />
        ))}
        {nodes.map((n, i) => (
          <line key={`c${i}`} x1="16" y1="16" x2={n.x} y2={n.y} stroke={color} strokeWidth="0.4" opacity="0.25" />
        ))}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={color} opacity={0.6 + (i % 2) * 0.3} />
        ))}
        <circle cx="16" cy="16" r={coreR} fill={`url(#ag-${uid})`} stroke={color} strokeWidth="0.6" />
      </svg>
    </span>
  );
}
