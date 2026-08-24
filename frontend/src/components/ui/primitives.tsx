/** Small styled primitives shared across the app. Composed, not templated. */
import clsx from "clsx";
import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DataClass } from "@/lib/api/types";
import { CLASS_META, formatNumber } from "@/lib/format";

/* ── keyboard hint ── */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="inline-flex h-5 min-w-5 items-center justify-center rounded px-1.5 text-[11px] font-medium"
      style={{
        fontFamily: "var(--font-mono)",
        background: "var(--color-surface-3)",
        color: "var(--color-ink-3)",
        border: "1px solid var(--color-line)",
      }}
    >
      {children}
    </kbd>
  );
}

/* ── classification dot + chip ── */
export function ClassDot({ cls, size = 7 }: { cls: DataClass; size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 99,
        background: CLASS_META[cls].color,
        boxShadow: `0 0 8px ${CLASS_META[cls].color}55`,
        display: "inline-block",
        flex: "none",
      }}
    />
  );
}

export function ClassChip({ cls }: { cls: DataClass }) {
  const m = CLASS_META[cls];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider"
      style={{ color: m.color, background: `color-mix(in oklab, ${m.color} 12%, transparent)` }}
    >
      <ClassDot cls={cls} size={6} />
      {m.label}
    </span>
  );
}

/* ── skeleton ── */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={clsx("animate-pulse rounded", className)}
      style={{ background: "var(--color-surface-2)", ...style }}
    />
  );
}

/* ── icon button ── */
export function IconButton({
  children,
  label,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={clsx(
        "inline-flex h-8 w-8 items-center justify-center rounded-[8px] transition-[background,transform] duration-150 active:scale-90",
        className,
      )}
      style={{
        color: active ? "var(--color-brass)" : "var(--color-ink-3)",
        background: active ? "var(--brass-wash)" : "transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-3)")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = active ? "var(--brass-wash)" : "transparent")
      }
    >
      {children}
    </button>
  );
}

/* ── segmented control ── */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: ReactNode; color?: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className="relative inline-flex rounded-[10px] p-0.5"
      style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line)" }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={clsx(
              "relative z-10 rounded-[8px] font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
            )}
            style={{ color: on ? "var(--color-ink)" : "var(--color-ink-3)" }}
          >
            {on && (
              <motion.span
                layoutId="segmented-active"
                className="absolute inset-0 -z-10 rounded-[8px]"
                style={{
                  background: "var(--color-surface-3)",
                  border: `1px solid ${o.color ? o.color + "66" : "var(--color-line-strong)"}`,
                }}
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── animated integer (token counters) — rAF tween into React state so the DOM text
      actually updates and reads correctly; honours reduced-motion. ── */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = value;
    if (reduce || from === to) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }
    const start = performance.now();
    const dur = 620;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={clsx("tnum", className)}>{formatNumber(Math.round(display))}</span>;
}

/* ── generic pill button ── */
export function Button({
  children,
  onClick,
  variant = "ghost",
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "outline";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: "linear-gradient(180deg, var(--color-brass-bright), var(--color-brass))",
      color: "#1a1408",
      fontWeight: 600,
    },
    outline: { background: "transparent", color: "var(--color-ink)", border: "1px solid var(--color-line-strong)" },
    ghost: { background: "var(--color-surface-2)", color: "var(--color-ink-2)", border: "1px solid var(--color-line)" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[9px] px-3.5 py-2 text-[13px] transition-[transform,opacity,background,box-shadow] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "hover:brightness-105",
        className,
      )}
      style={styles[variant]}
    >
      {children}
    </button>
  );
}
