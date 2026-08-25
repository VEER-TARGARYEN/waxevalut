/** A rotary dial. Drag around it (or use arrow keys / wheel) to set a value across a 270°
 *  sweep. Canvas-free: an SVG arc track with a themed progress arc and a knob indicator. */
import { useCallback, useEffect, useRef, useState } from "react";

const SWEEP = 270; // degrees of travel
const START = 135; // degrees, measured clockwise from 12 o'clock

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

export function Dial({
  value,
  min,
  max,
  step = 1,
  onChange,
  size = 132,
  label,
  suffix,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  size?: number;
  label?: string;
  suffix?: string;
  disabled?: boolean;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = START + pct * SWEEP;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 14;
  const knob = polar(cx, cy, r, angle);

  const setFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);
      // angle clockwise from 12 o'clock, 0..360
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      // map into the sweep; ignore the dead zone at the bottom
      let rel = deg - START;
      if (rel < 0) rel += 360;
      if (rel > SWEEP) {
        // snap to whichever end is nearer
        rel = rel - SWEEP < (360 - rel) / 1 ? SWEEP : 0;
      }
      const raw = min + (rel / SWEEP) * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(Math.min(max, Math.max(min, snapped)));
    },
    [min, max, step, onChange],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => setFromPointer(e.clientX, e.clientY);
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, setFromPointer]);

  const bump = (d: number) => onChange(Math.min(max, Math.max(min, value + d * step)));

  return (
    <div className="flex flex-col items-center gap-2" style={{ opacity: disabled ? 0.45 : 1 }}>
      <svg
        ref={ref}
        width={size}
        height={size}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDragging(true);
          setFromPointer(e.clientX, e.clientY);
        }}
        onWheel={(e) => {
          if (disabled) return;
          bump(e.deltaY > 0 ? -1 : 1);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") (e.preventDefault(), bump(1));
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") (e.preventDefault(), bump(-1));
        }}
        style={{ cursor: disabled ? "not-allowed" : dragging ? "grabbing" : "grab", touchAction: "none" }}
      >
        {/* track */}
        <path
          d={arcPath(cx, cy, r, START, START + SWEEP)}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* progress */}
        <path
          d={arcPath(cx, cy, r, START, Math.max(START + 0.01, angle))}
          fill="none"
          stroke="var(--color-brass)"
          strokeWidth="8"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 6px var(--color-brass-glow))" }}
        />
        {/* tick marks */}
        {Array.from({ length: 11 }).map((_, i) => {
          const a = START + (i / 10) * SWEEP;
          const p1 = polar(cx, cy, r - 9, a);
          const p2 = polar(cx, cy, r - 13, a);
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--color-line-strong)" strokeWidth="1.5" />;
        })}
        {/* knob */}
        <circle cx={knob.x} cy={knob.y} r="7" fill="var(--color-brass)" stroke="var(--color-brass-bright)" strokeWidth="2" />
        {/* readout */}
        <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontSize: 26, fontWeight: 600, fill: "var(--color-ink)", fontVariantNumeric: "tabular-nums" }}>
          {value}
        </text>
        {suffix && (
          <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: 10, letterSpacing: "0.14em", fill: "var(--color-ink-4)" }}>
            {suffix}
          </text>
        )}
      </svg>
      {label && (
        <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--color-ink-4)" }}>
          {label}
        </span>
      )}
    </div>
  );
}
