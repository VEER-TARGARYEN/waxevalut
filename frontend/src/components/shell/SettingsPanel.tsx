/** Settings — a right-side drawer holding the two things a user actually tunes here: the
 *  accent theme (nine of them) and the animation frame budget (auto-matched to the display,
 *  or pinned with the dial). Both persist to localStorage and apply instantly. */
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { THEMES } from "@/lib/themes";
import { FPS_MAX, FPS_MIN, useSettings } from "@/store/settings";
import { Dial } from "@/components/ui/Dial";
import { Close, Check } from "@/components/ui/icons";
import { DUR, EASE_OUT } from "@/lib/motion";

export function SettingsPanel() {
  const open = useSettings((s) => s.settingsOpen);
  const setOpen = useSettings((s) => s.setSettingsOpen);
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const fps = useSettings((s) => s.fps);
  const setFps = useSettings((s) => s.setFps);
  const detected = useSettings((s) => s.detectedFps);

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && open && setOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setOpen]);

  const auto = fps === "auto";
  const shown = auto ? detected ?? 60 : (fps as number);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.normal }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[85]"
            style={{ background: "color-mix(in oklab, var(--color-base) 45%, transparent)" }}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: DUR.context, ease: EASE_OUT }}
            role="dialog"
            aria-label="Settings"
            className="fixed right-0 top-0 z-[86] flex h-full w-[min(400px,94vw)] flex-col overflow-y-auto"
            style={{ background: "var(--color-surface-1)", borderLeft: "1px solid var(--color-line-strong)", boxShadow: "var(--shadow-pop)" }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 backdrop-blur-md" style={{ borderBottom: "1px solid var(--color-line)", background: "color-mix(in oklab, var(--color-surface-1) 88%, transparent)" }}>
              <div>
                <div className="text-[15px] font-600">Settings</div>
                <div className="text-[12px]" style={{ color: "var(--color-ink-4)" }}>
                  Appearance and motion
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close settings" className="text-[var(--color-ink-4)] transition-colors hover:text-[var(--color-ink-2)]">
                <Close width={18} height={18} />
              </button>
            </div>

            {/* ── themes ── */}
            <section className="px-5 py-5">
              <SectionTitle>Accent theme</SectionTitle>
              <p className="mb-3 text-[12px]" style={{ color: "var(--color-ink-4)" }}>
                The console stays dark; the accent drives every interaction, focus state and the
                ambient background.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((t) => {
                  const on = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className="group relative flex flex-col items-center gap-2 rounded-[11px] px-2 py-3 transition-colors active:scale-95"
                      style={{
                        background: on ? "var(--color-surface-3)" : "var(--color-surface-2)",
                        border: `1px solid ${on ? t.accent : "var(--color-line)"}`,
                      }}
                    >
                      {/* swatch: accent → bright gradient with a dim ring */}
                      <span
                        className="grid h-9 w-9 place-items-center rounded-full"
                        style={{
                          background: `linear-gradient(140deg, ${t.bright}, ${t.accent} 55%, ${t.dim})`,
                          boxShadow: on ? `0 0 0 3px ${t.glow}` : "none",
                        }}
                      >
                        {on && <Check width={16} height={16} style={{ color: "#12100c" }} />}
                      </span>
                      <span className="text-[11px]" style={{ color: on ? "var(--color-ink)" : "var(--color-ink-3)" }}>
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="mx-5 h-px" style={{ background: "var(--color-line)" }} />

            {/* ── motion / fps ── */}
            <section className="px-5 py-5">
              <SectionTitle>Motion</SectionTitle>
              <p className="mb-4 text-[12px]" style={{ color: "var(--color-ink-4)" }}>
                Frame budget for the ambient background and the animated mark.{" "}
                <span style={{ color: "var(--color-ink-3)" }}>Auto</span> matches your display —
                detected&nbsp;
                <span className="tnum" style={{ color: "var(--color-brass)" }}>
                  {detected ?? "…"}
                </span>
                &nbsp;Hz.
              </p>

              <div className="mb-4 flex gap-2">
                <ModeButton on={auto} onClick={() => setFps("auto")}>
                  Auto
                </ModeButton>
                <ModeButton on={!auto} onClick={() => setFps(detected ?? 60)}>
                  Custom
                </ModeButton>
              </div>

              <div className="flex justify-center">
                <Dial
                  value={shown}
                  min={FPS_MIN}
                  max={FPS_MAX}
                  step={5}
                  onChange={(v) => setFps(v)}
                  label={auto ? "matching display" : "frames per second"}
                  suffix="FPS"
                  disabled={auto}
                />
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {[30, 40, 60, 90, 120].map((p) => (
                  <button
                    key={p}
                    onClick={() => setFps(p)}
                    className="rounded-full px-2.5 py-1 text-[11.5px] tnum transition-colors"
                    style={{
                      color: !auto && shown === p ? "var(--color-brass)" : "var(--color-ink-3)",
                      background: !auto && shown === p ? "var(--brass-wash)" : "var(--color-surface-2)",
                      border: "1px solid var(--color-line)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <p className="mt-4 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-4)" }}>
                Higher is smoother but costs battery. The background pauses entirely when the tab
                is hidden, and respects your system&rsquo;s reduced-motion setting.
              </p>
            </section>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-500 uppercase tracking-wider" style={{ color: "var(--color-ink-3)" }}>
      {children}
    </div>
  );
}

function ModeButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-[9px] px-3 py-2 text-[12.5px] font-500 transition-colors active:scale-95"
      style={{
        color: on ? "var(--color-ink)" : "var(--color-ink-3)",
        background: on ? "var(--color-surface-3)" : "var(--color-surface-2)",
        border: `1px solid ${on ? "var(--color-brass)" : "var(--color-line)"}`,
      }}
    >
      {children}
    </button>
  );
}
