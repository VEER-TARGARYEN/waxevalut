/**
 * Shared motion language. A coherent timing scale so the whole app moves with one voice.
 * Framer Motion is used only where it materially helps (context transitions, drawers, the
 * redaction dissolve); simple hovers stay in CSS.
 */
import type { Transition, Variants } from "framer-motion";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DUR = {
  micro: 0.13,
  normal: 0.22,
  context: 0.34,
  spatial: 0.5,
} as const;

export const spring: Transition = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 };

/** Results feed: cards rise and fade in, gently staggered. */
export const feedContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};
export const feedItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.context, ease: EASE_OUT } },
};

/** Drawer / sheet from the right. */
export const drawerVariants: Variants = {
  hidden: { x: "100%", opacity: 0.4 },
  show: { x: 0, opacity: 1, transition: { duration: DUR.context, ease: EASE_OUT } },
  exit: { x: "100%", opacity: 0.4, transition: { duration: DUR.normal, ease: EASE_IN_OUT } },
};

/** Modal scale-in that keeps the underlying context visible. */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: DUR.context, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: DUR.normal, ease: EASE_IN_OUT } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.normal } },
  exit: { opacity: 0, transition: { duration: DUR.micro } },
};

/** Mobile bottom sheet: slides up from the bottom edge. */
export const sheetVariants: Variants = {
  hidden: { y: "100%" },
  show: { y: 0, transition: { duration: DUR.context, ease: EASE_OUT } },
  exit: { y: "100%", transition: { duration: DUR.normal, ease: EASE_IN_OUT } },
};
