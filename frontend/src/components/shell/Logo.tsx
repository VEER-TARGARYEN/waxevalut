/** WaxeValut mark — a live vault glyph. Concentric hex "vault layers" rotate slowly in
 *  opposite directions and the sealed core node pulses; on hover the whole mark energises
 *  (layers speed up, core brightens). Canvas-drawn so it's genuinely animated, not a static
 *  SVG. Honors reduced motion (draws one still frame). */
import { useEffect, useRef, useState } from "react";

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rot: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = rot + (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function Logo({ size = 28 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hover = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const brass = "#e0a860";
    const brassBright = "#f3c98a";
    const line = "#3a4048";

    let raf = 0;
    let energy = 0; // 0..1 eases toward hover state

    const draw = (t: number) => {
      const cx = size / 2;
      const cy = size / 2;
      const target = hover.current ? 1 : 0;
      energy += (target - energy) * 0.12;
      const spin = t * 0.0004 * (1 + energy * 2.2);

      ctx.clearRect(0, 0, size, size);

      // outer vault layer (rotates one way, cool line)
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = line;
      hexPath(ctx, cx, cy, size * 0.42, spin);
      ctx.stroke();

      // inner vault layer (counter-rotates, brass, brightens with energy)
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = brass;
      ctx.globalAlpha = 0.75 + energy * 0.25;
      hexPath(ctx, cx, cy, size * 0.27, -spin * 1.3);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // sealed core — pulses; glows on hover
      const pulse = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.003);
      const coreR = size * 0.075 * (1 + pulse * 0.18 + energy * 0.25);
      ctx.shadowColor = brass;
      ctx.shadowBlur = 6 + pulse * 6 + energy * 10;
      ctx.fillStyle = energy > 0.5 ? brassBright : brass;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    if (reduce) draw(1200);
    else raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: "block" }}
      onMouseEnter={() => (hover.current = true)}
      onMouseLeave={() => (hover.current = false)}
      aria-hidden
    />
  );
}

export function Wordmark() {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="flex items-center gap-2 select-none"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Logo />
      <span
        className="text-[15px] font-600 tracking-tight"
        style={{ letterSpacing: "-0.01em", transition: "opacity 200ms" }}
      >
        Waxe
        <span style={{ color: "var(--color-brass)", textShadow: hover ? "0 0 12px var(--color-brass-glow)" : "none", transition: "text-shadow 250ms" }}>
          Valut
        </span>
      </span>
    </div>
  );
}
