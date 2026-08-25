/** Persisted user settings: accent theme and animation frame budget.
 *
 *  FPS is "auto" by default, which measures what the device can actually sustain and matches
 *  it (so a 120Hz laptop feels glassy and a weak machine doesn't cook its battery). It can be
 *  pinned to an explicit value from the settings dial.
 */
import { create } from "zustand";
import { applyTheme, DEFAULT_THEME } from "@/lib/themes";

const THEME_KEY = "waxevalut.theme";
const FPS_KEY = "waxevalut.fps"; // "auto" | number-as-string

export const FPS_MIN = 15;
export const FPS_MAX = 120;

function readTheme(): string {
  try {
    return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
function readFps(): "auto" | number {
  try {
    const v = localStorage.getItem(FPS_KEY);
    if (!v || v === "auto") return "auto";
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(FPS_MAX, Math.max(FPS_MIN, n)) : "auto";
  } catch {
    return "auto";
  }
}

/** Measure the display's real refresh rate over a short window, then snap to a sane tier.
 *  Runs once at startup; cheap (~400ms of counting frames we'd render anyway). */
export function detectRefreshRate(): Promise<number> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") return resolve(60);
    let frames = 0;
    const t0 = performance.now();
    const tick = () => {
      frames++;
      const dt = performance.now() - t0;
      if (dt < 400) requestAnimationFrame(tick);
      else {
        const hz = (frames / dt) * 1000;
        // snap to the nearest common tier so we don't chase noise
        const tiers = [30, 40, 60, 90, 120];
        const nearest = tiers.reduce((a, b) => (Math.abs(b - hz) < Math.abs(a - hz) ? b : a), 60);
        resolve(nearest);
      }
    };
    requestAnimationFrame(tick);
    // safety: if rAF never fires (hidden tab, headless), don't hang the app
    setTimeout(() => resolve(60), 1500);
  });
}

interface SettingsState {
  theme: string;
  setTheme: (id: string) => void;

  /** user preference — "auto" or a pinned number */
  fps: "auto" | number;
  setFps: (v: "auto" | number) => void;

  /** what auto-detection measured (null until detected) */
  detectedFps: number | null;
  setDetectedFps: (n: number) => void;

  /** the value renderers should actually use */
  effectiveFps: () => number;

  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  theme: readTheme(),
  setTheme: (id) => {
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {
      /* ignore */
    }
    applyTheme(id);
    set({ theme: id });
  },

  fps: readFps(),
  setFps: (v) => {
    try {
      localStorage.setItem(FPS_KEY, v === "auto" ? "auto" : String(v));
    } catch {
      /* ignore */
    }
    set({ fps: v });
  },

  detectedFps: null,
  setDetectedFps: (n) => set({ detectedFps: n }),

  effectiveFps: () => {
    const { fps, detectedFps } = get();
    if (fps === "auto") return detectedFps ?? 60;
    return fps;
  },

  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),
}));

/** Call once at boot: paint the saved theme and kick off refresh-rate detection. */
export function initSettings() {
  applyTheme(useSettings.getState().theme);
  detectRefreshRate().then((hz) => useSettings.getState().setDetectedFps(hz));
}
