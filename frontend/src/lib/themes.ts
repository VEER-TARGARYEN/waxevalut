/** Nine accent themes: the seven rainbow hues, white, plus the original brass.
 *
 *  The app stays dark-committed (it's an investigation console) — a theme swaps the ACCENT
 *  system only: the interaction colour, its bright/dim variants, the wash used behind
 *  brass-tinted surfaces, and the RGB the WebGL background lights the field with. Every
 *  component already reads these through CSS variables, so switching is instant and total.
 */

export interface Theme {
  id: string;
  label: string;
  /** primary accent — interaction, focus, active states */
  accent: string;
  /** lighter variant — gradients, hover */
  bright: string;
  /** darker variant — muted accents, gradient ends */
  dim: string;
  /** rgba glow used for focus rings and shadows */
  glow: string;
  /** faint accent wash behind tinted surfaces */
  wash: string;
  /** normalised rgb for the ambient shader */
  shader: [number, number, number];
}

export const THEMES: Theme[] = [
  {
    id: "brass",
    label: "Brass",
    accent: "#e0a860",
    bright: "#f0ba72",
    dim: "#8a6a3e",
    glow: "rgba(224, 168, 96, 0.16)",
    wash: "rgba(224, 168, 96, 0.08)",
    shader: [0.878, 0.659, 0.376],
  },
  {
    id: "crimson",
    label: "Crimson",
    accent: "#e8615f",
    bright: "#f4837f",
    dim: "#8f3a39",
    glow: "rgba(232, 97, 95, 0.18)",
    wash: "rgba(232, 97, 95, 0.09)",
    shader: [0.91, 0.38, 0.37],
  },
  {
    id: "amber",
    label: "Amber",
    accent: "#f0913f",
    bright: "#ffa95c",
    dim: "#94571f",
    glow: "rgba(240, 145, 63, 0.18)",
    wash: "rgba(240, 145, 63, 0.09)",
    shader: [0.94, 0.57, 0.25],
  },
  {
    id: "gold",
    label: "Gold",
    accent: "#e8c65a",
    bright: "#f5d97e",
    dim: "#8e7828",
    glow: "rgba(232, 198, 90, 0.18)",
    wash: "rgba(232, 198, 90, 0.09)",
    shader: [0.91, 0.78, 0.35],
  },
  {
    id: "emerald",
    label: "Emerald",
    accent: "#5fc98a",
    bright: "#7fdda3",
    dim: "#327a52",
    glow: "rgba(95, 201, 138, 0.18)",
    wash: "rgba(95, 201, 138, 0.09)",
    shader: [0.37, 0.79, 0.54],
  },
  {
    id: "azure",
    label: "Azure",
    accent: "#5aa9f0",
    bright: "#7fbdf7",
    dim: "#2f6291",
    glow: "rgba(90, 169, 240, 0.18)",
    wash: "rgba(90, 169, 240, 0.09)",
    shader: [0.35, 0.66, 0.94],
  },
  {
    id: "indigo",
    label: "Indigo",
    accent: "#7b7ce8",
    bright: "#9a9bf2",
    dim: "#45468c",
    glow: "rgba(123, 124, 232, 0.18)",
    wash: "rgba(123, 124, 232, 0.09)",
    shader: [0.48, 0.49, 0.91],
  },
  {
    id: "violet",
    label: "Violet",
    accent: "#b57ce0",
    bright: "#c99bee",
    dim: "#6b4587",
    glow: "rgba(181, 124, 224, 0.18)",
    wash: "rgba(181, 124, 224, 0.09)",
    shader: [0.71, 0.49, 0.88],
  },
  {
    id: "platinum",
    label: "Platinum",
    accent: "#e6e9ee",
    bright: "#ffffff",
    dim: "#8b9099",
    glow: "rgba(230, 233, 238, 0.16)",
    wash: "rgba(230, 233, 238, 0.07)",
    shader: [0.90, 0.91, 0.93],
  },
];

export const DEFAULT_THEME = "brass";

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Write a theme into the document's CSS variables. Components read these already, so this
 *  is the entire switch — no re-render required, no per-component theme plumbing. */
export function applyTheme(id: string): Theme {
  const t = getTheme(id);
  const s = document.documentElement.style;
  s.setProperty("--color-brass", t.accent);
  s.setProperty("--color-brass-bright", t.bright);
  s.setProperty("--color-brass-dim", t.dim);
  s.setProperty("--color-brass-glow", t.glow);
  s.setProperty("--brass-wash", t.wash);
  document.documentElement.dataset.accent = t.id;
  return t;
}
