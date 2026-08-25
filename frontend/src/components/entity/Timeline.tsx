/** The signature interaction, rebuilt as a Google-Maps-style time lens over organizational
 *  memory. You navigate a *visible date window*:
 *    - wheel over the track  → zoom the window toward the cursor (like map zoom-to-cursor)
 *    - drag the track        → pan the window
 *    - drag / click the head → scrub the "as of" date (what we believed at that moment)
 *    - +/−/fit buttons       → zoom controls
 *  Tick labels get finer as you zoom in (months → weeks → days), and a fact-density band
 *  shows where activity clusters in time, so the timeline reads like a map of the record.
 *
 *  The as-of change is debounced; stale requests are cancelled upstream by TanStack Query. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, Return, ZoomIn, ZoomOut, Fit } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/primitives";
import { absoluteDate, shortDate } from "@/lib/format";

const DAY = 86400000;
const START = new Date("2026-01-01T00:00:00Z").getTime();
const END = new Date("2026-09-01T00:00:00Z").getTime();
const FULL_SPAN = END - START;
const MIN_SPAN = 5 * DAY; // deepest zoom
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface TimeMark {
  t: number; // timestamp
  kind: "fact" | "correction";
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Adaptive ticks for the visible window — coarser when zoomed out, finer when zoomed in. */
function ticksFor(a: number, b: number): { t: number; label: string; major: boolean }[] {
  const days = (b - a) / DAY;
  const out: { t: number; label: string; major: boolean }[] = [];
  if (days > 150) {
    const d = new Date(START);
    d.setUTCDate(1);
    while (d.getTime() <= b) {
      const t = d.getTime();
      if (t >= a) out.push({ t, label: MONTHS[d.getUTCMonth()], major: true });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
  } else {
    const step = days > 60 ? 14 : days > 21 ? 7 : days > 9 ? 2 : 1; // days
    const first = Math.ceil((a - START) / (step * DAY));
    for (let i = first; ; i++) {
      const t = START + i * step * DAY;
      if (t > b) break;
      if (t < a) continue;
      const d = new Date(t);
      out.push({ t, label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`, major: d.getUTCDate() <= step });
    }
  }
  return out;
}

export function Timeline({
  asOf,
  onChange,
  loading,
  marks = [],
}: {
  asOf: string | null; // null = now
  onChange: (iso: string | null) => void;
  loading?: boolean;
  marks?: TimeMark[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1);
  const [view, setView] = useState<[number, number]>([START, END]);
  const [displayT, setDisplayT] = useState<number>(asOf ? new Date(asOf).getTime() : END);
  const [drag, setDrag] = useState<null | "head" | "pan">(null);
  const panRef = useRef<{ x: number; view: [number, number] } | null>(null);
  const debounceRef = useRef<number>();

  const isNow = asOf === null;
  const [a, b] = view;
  const span = b - a;

  // keep the head synced to external as-of changes (reset, return-to-now) unless dragging it
  useEffect(() => {
    if (drag === "head") return;
    setDisplayT(asOf ? new Date(asOf).getTime() : END);
  }, [asOf, drag]);

  // measure track width responsively
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || 1));
    ro.observe(el);
    setWidth(el.clientWidth || 1);
    return () => ro.disconnect();
  }, []);

  const dateToX = useCallback((t: number) => ((t - a) / span) * width, [a, span, width]);
  const xToDate = useCallback((x: number) => a + (x / width) * span, [a, span, width]);

  const commit = useCallback(
    (t: number) => {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        onChange(t >= END - DAY ? null : new Date(t).toISOString());
      }, 200);
    },
    [onChange],
  );

  // ── zoom (wheel + buttons), always toward a focal date ──
  const zoomAround = useCallback(
    (focalT: number, factor: number) => {
      setView(([vs, ve]) => {
        const s = ve - vs;
        const ns = clamp(s * factor, MIN_SPAN, FULL_SPAN);
        const f = clamp((focalT - vs) / s, 0, 1); // keep focal point fixed
        let start = focalT - f * ns;
        let end = start + ns;
        if (start < START) (start = START), (end = START + ns);
        if (end > END) (end = END), (start = END - ns);
        return [start, end];
      });
    },
    [],
  );

  // native wheel listener so we can preventDefault (stop the page scrolling while zooming)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      const focal = a + (x / (rect.width || 1)) * span;
      zoomAround(focal, e.deltaY > 0 ? 1.2 : 1 / 1.2);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [a, span, zoomAround]);

  // ── pointer: head scrub vs track pan ──
  const clientToX = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return clamp(clientX - rect.left, 0, rect.width);
  };

  const onHeadDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag("head");
  };
  const onTrackDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    panRef.current = { x: e.clientX, view: [a, b] };
    setDrag("pan");
  };
  const onMove = (e: React.PointerEvent) => {
    if (drag === "head") {
      const t = xToDate(clientToX(e.clientX));
      setDisplayT(t);
      commit(t);
    } else if (drag === "pan" && panRef.current) {
      const dx = e.clientX - panRef.current.x;
      const dt = (dx / (width || 1)) * span;
      let [vs, ve] = panRef.current.view;
      vs -= dt;
      ve -= dt;
      if (vs < START) (vs = START), (ve = START + span);
      if (ve > END) (ve = END), (vs = END - span);
      setView([vs, ve]);
    }
  };
  const onUp = (e: React.PointerEvent) => {
    if (drag === "pan" && panRef.current && Math.abs(e.clientX - panRef.current.x) < 4) {
      // a click, not a drag → jump the head to the clicked date
      const t = xToDate(clientToX(e.clientX));
      setDisplayT(t);
      commit(t);
    }
    panRef.current = null;
    setDrag(null);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const week = 7 * DAY;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const t = Math.max(START, displayT - week);
      setDisplayT(t);
      commit(t);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const t = Math.min(END, displayT + week);
      setDisplayT(t);
      commit(t);
    }
  };

  const ticks = useMemo(() => ticksFor(a, b), [a, b]);
  const headX = clamp(dateToX(isNow ? END : displayT), 0, width);
  const headOffLeft = dateToX(displayT) < 0;
  const headOffRight = dateToX(displayT) > width;
  const zoomedIn = span < FULL_SPAN - DAY;

  return (
    <div className="panel px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[12.5px]" style={{ color: "var(--color-ink-3)" }}>
          <Clock width={15} height={15} />
          <span className="whitespace-nowrap">What we believed as of</span>
          <span className="ml-1 truncate font-500" style={{ color: isNow ? "var(--color-ok)" : "var(--color-brass)" }}>
            {isNow ? "now" : absoluteDate(new Date(displayT).toISOString())}
          </span>
          {loading && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full" style={{ border: "2px solid var(--color-line-strong)", borderTopColor: "var(--color-brass)" }} />
          )}
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Zoom in" onClick={() => zoomAround((a + b) / 2, 1 / 1.5)}>
            <ZoomIn width={16} height={16} />
          </IconButton>
          <IconButton label="Zoom out" onClick={() => zoomAround((a + b) / 2, 1.5)}>
            <ZoomOut width={16} height={16} />
          </IconButton>
          <IconButton label="Fit full range" onClick={() => setView([START, END])}>
            <Fit width={16} height={16} />
          </IconButton>
          {!isNow && (
            <button
              onClick={() => {
                setDisplayT(END);
                onChange(null);
              }}
              className="ml-1 inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[12px] transition-colors"
              style={{ color: "var(--color-ok)", background: "color-mix(in oklab, var(--color-ok) 12%, transparent)" }}
            >
              <Return width={13} height={13} /> Now
            </button>
          )}
        </div>
      </div>

      {/* track */}
      <div
        ref={trackRef}
        onPointerDown={onTrackDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        className="relative h-14 select-none"
        style={{ touchAction: "none", cursor: drag === "pan" ? "grabbing" : "grab" }}
      >
        {/* base line */}
        <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full" style={{ background: "var(--color-surface-3)" }} />
        {/* filled up to head */}
        <div
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
          style={{ left: 0, width: headX, background: isNow ? "var(--color-line-strong)" : "linear-gradient(90deg, var(--color-brass-dim), var(--color-brass))" }}
        />

        {/* fact-density band */}
        {marks.map((m, i) => {
          const x = dateToX(m.t);
          if (x < -2 || x > width + 2) return null;
          const isCorr = m.kind === "correction";
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2"
              style={{
                left: x,
                top: "calc(50% - 16px)",
                width: isCorr ? 3 : 2,
                height: isCorr ? 12 : 8,
                borderRadius: 2,
                background: isCorr ? "var(--color-brass)" : "var(--color-ink-4)",
                opacity: isCorr ? 0.95 : 0.6,
              }}
              title={isCorr ? `Correction · ${shortDate(new Date(m.t).toISOString())}` : shortDate(new Date(m.t).toISOString())}
            />
          );
        })}

        {/* ticks */}
        {ticks.map((tk) => {
          const x = dateToX(tk.t);
          return (
            <div key={tk.t} className="absolute flex flex-col items-center" style={{ left: x, transform: "translateX(-50%)", top: "calc(50% + 8px)" }}>
              <div style={{ width: 1, height: tk.major ? 7 : 4, background: "var(--color-line-strong)" }} />
              {tk.major && (
                <span className="mt-1 whitespace-nowrap text-[10px]" style={{ color: "var(--color-ink-4)" }}>
                  {tk.label}
                </span>
              )}
            </div>
          );
        })}

        {/* off-window edge indicators for the head */}
        {headOffLeft && <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "var(--color-brass)" }}>‹</div>}
        {headOffRight && <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px]" style={{ color: "var(--color-brass)" }}>›</div>}

        {/* head */}
        {!headOffLeft && !headOffRight && (
          <div
            role="slider"
            tabIndex={0}
            aria-label="Time lens"
            aria-valuetext={isNow ? "now" : absoluteDate(new Date(displayT).toISOString())}
            onPointerDown={onHeadDown}
            onKeyDown={onKey}
            className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: headX, cursor: "ew-resize" }}
          >
            <div
              className="grid place-items-center rounded-full transition-transform"
              style={{
                width: 20,
                height: 20,
                transform: drag === "head" ? "scale(1.15)" : "scale(1)",
                background: isNow ? "var(--color-surface-3)" : "var(--color-brass)",
                border: `2px solid ${isNow ? "var(--color-line-strong)" : "var(--color-brass-bright)"}`,
                boxShadow: drag === "head" ? "0 0 0 6px var(--color-brass-glow)" : "0 2px 8px rgba(0,0,0,.5)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 99, background: isNow ? "var(--color-ink-4)" : "#1a1408" }} />
            </div>
            {drag === "head" && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[6px] px-2 py-1 text-[11px] font-500" style={{ background: "var(--color-brass)", color: "#1a1408" }}>
                {shortDate(new Date(displayT).toISOString())}
              </div>
            )}
          </div>
        )}
      </div>

      {/* footer hint */}
      <div className="mt-2 flex items-center justify-between text-[10.5px]" style={{ color: "var(--color-ink-4)" }}>
        <span>{zoomedIn ? "Drag to pan · scroll to zoom · drag the head to scrub" : "Scroll to zoom in · drag the head to travel through time"}</span>
        <span className="tnum">{Math.round(span / DAY)} days shown</span>
      </div>
    </div>
  );
}
