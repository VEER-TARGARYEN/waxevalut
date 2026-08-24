/** WaxeValut mark: layered vault hexagon with a sealed core node — memory, sealed and
 *  connected. Geometric, no "AI spark" cliché. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 4l10.4 6v12L16 28 5.6 22V10z"
        stroke="var(--color-line-strong)"
        strokeWidth="1.4"
      />
      <path
        d="M16 9l6 3.5v7L16 23l-6-3.5v-7z"
        stroke="var(--color-brass)"
        strokeWidth="1.5"
      />
      <circle cx="16" cy="16" r="2.3" fill="var(--color-brass)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-2 select-none">
      <Logo />
      <span className="text-[15px] font-600 tracking-tight" style={{ letterSpacing: "-0.01em" }}>
        Waxe<span style={{ color: "var(--color-brass)" }}>Valut</span>
      </span>
    </div>
  );
}
