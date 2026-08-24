/** The signature interaction: a time lens across organizational memory. Not an HTML range
 *  input — a custom track with month ticks and a draggable brass head. Dragging updates the
 *  displayed date at 60fps (local state), while the data request is debounced and stale
 *  requests are cancelled by TanStack Query. A "Return to now" control appears only when the
 *  lens has left the present. */
import { motion, useMotionValue } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Return } from "@/components/ui/icons";
import { shortDate, absoluteDate } from "@/lib/format";

const START = new Date("2026-01-01T00:00:00Z").getTime();
const END = new Date("2026-09-01T00:00:00Z").getTime();
const SPAN = END - START;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

export function Timeline({
  asOf,
  onChange,
  loading,
}: {
  asOf: string | null; // null = now
  onChange: (iso: string | null) => void;
  loading?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [dragging, setDragging] = useState(false);
  // local display date during drag (immediate), decoupled from the debounced request
  const [displayT, setDisplayT] = useState<number>(asOf ? new Date(asOf).getTime() : END);
  const debounceRef = useRef<number>();

  const isNow = asOf === null;

  // keep head positioned when asOf changes externally (e.g. reset)
  useEffect(() => {
    if (dragging) return;
    setDisplayT(asOf ? new Date(asOf).getTime() : END);
  }, [asOf, dragging]);

  const pct = useMemo(() => Math.min(1, Math.max(0, (displayT - START) / SPAN)), [displayT]);

  const commit = useCallback(
    (t: number) => {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        // if at/after END, treat as "now" (null) so default recall semantics apply
        onChange(t >= END - 86400000 ? null : new Date(t).toISOString());
      }, 220);
    },
    [onChange],
  );

  const setFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const t = START + p * SPAN;
      setDisplayT(t);
      commit(t);
    },
    [commit],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  };
  const onPointerUp = () => setDragging(false);

  // keyboard: arrows move by a week
  const onKey = (e: React.KeyboardEvent) => {
    const week = 7 * 86400000;
    if (e.key === "ArrowLeft") (e.preventDefault(), setDisplayT((t) => Math.max(START, t - week)), commit(Math.max(START, displayT - week)));
    if (e.key === "ArrowRight") (e.preventDefault(), setDisplayT((t) => Math.min(END, t + week)), commit(Math.min(END, displayT + week)));
  };

  return (
    <div className="panel px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12.5px]" style={{ color: "var(--color-ink-3)" }}>
          <Clock width={15} height={15} />
          What we believed as of
          <span className="ml-1 font-500" style={{ color: isNow ? "var(--color-ok)" : "var(--color-brass)" }}>
            {isNow ? "now" : absoluteDate(new Date(displayT).toISOString())}
          </span>
          {loading && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full" style={{ border: "2px solid var(--color-line-strong)", borderTopColor: "var(--color-brass)" }} />
          )}
        </div>
        {!isNow && (
          <button
            onClick={() => {
              setDisplayT(END);
              onChange(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] transition-colors"
            style={{ color: "var(--color-ok)", background: "color-mix(in oklab, var(--color-ok) 12%, transparent)" }}
          >
            <Return width={13} height={13} /> Return to now
          </button>
        )}
      </div>

      {/* track */}
      <div className="relative select-none pt-1" style={{ touchAction: "none" }}>
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative h-10 cursor-pointer"
        >
          {/* base line */}
          <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: "var(--color-surface-3)" }} />
          {/* filled portion */}
          <div
            className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full"
            style={{ width: `${pct * 100}%`, background: isNow ? "var(--color-line-strong)" : "linear-gradient(90deg, var(--color-brass-dim), var(--color-brass))" }}
          />
          {/* month ticks */}
          {MONTHS.map((mo, i) => {
            const p = i / (MONTHS.length - 1);
            return (
              <div key={mo} className="absolute top-0 flex flex-col items-center" style={{ left: `${p * 100}%`, transform: "translateX(-50%)" }}>
                <div className="h-2 w-[1px]" style={{ background: "var(--color-line-strong)" }} />
                <span className="mt-4 text-[10px]" style={{ color: "var(--color-ink-4)" }}>
                  {mo}
                </span>
              </div>
            );
          })}
          {/* head */}
          <motion.div
            role="slider"
            tabIndex={0}
            aria-label="Time lens"
            aria-valuetext={isNow ? "now" : absoluteDate(new Date(displayT).toISOString())}
            onKeyDown={onKey}
            style={{ x, left: `${pct * 100}%` }}
            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ scale: dragging ? 1.15 : 1 }}
              transition={{ duration: 0.12 }}
              className="grid place-items-center rounded-full"
              style={{
                width: 20,
                height: 20,
                background: isNow ? "var(--color-surface-3)" : "var(--color-brass)",
                border: `2px solid ${isNow ? "var(--color-line-strong)" : "var(--color-brass-bright)"}`,
                boxShadow: dragging ? "0 0 0 6px var(--color-brass-glow)" : "0 2px 8px rgba(0,0,0,.5)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 99, background: isNow ? "var(--color-ink-4)" : "#1a1408" }} />
            </motion.div>
            {/* floating date bubble while dragging */}
            {dragging && (
              <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[6px] px-2 py-1 text-[11px] font-500"
                style={{ background: "var(--color-brass)", color: "#1a1408" }}
              >
                {shortDate(new Date(displayT).toISOString())}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
