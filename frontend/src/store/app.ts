/**
 * Global UI state (not server state — that lives in TanStack Query).
 * Deliberately tiny: the active agent (the "lens"), and which overlay is open. Everything
 * else is URL-driven so navigation preserves context and is shareable.
 */
import { create } from "zustand";

interface ProvenanceTarget {
  factId: string;
}

interface AppState {
  activeAgentId: string;
  setActiveAgent: (id: string) => void;

  // Overlays. Kept here so any component can open them without prop-drilling.
  observeOpen: boolean;
  observePrefillEntity?: string;
  observeSupersedes?: { factId: string; statement: string };
  openObserve: (opts?: { entity?: string; supersedes?: { factId: string; statement: string } }) => void;
  closeObserve: () => void;

  provenance: ProvenanceTarget | null;
  openProvenance: (factId: string) => void;
  closeProvenance: () => void;

  paletteOpen: boolean;
  setPalette: (v: boolean) => void;
}

const STORAGE_KEY = "waxevalut.agent";
const initialAgent =
  (typeof localStorage !== "undefined" && localStorage.getItem(STORAGE_KEY)) || "support_bot";

export const useApp = create<AppState>((set) => ({
  activeAgentId: initialAgent,
  setActiveAgent: (id) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    set({ activeAgentId: id });
  },

  observeOpen: false,
  openObserve: (opts) =>
    set({
      observeOpen: true,
      observePrefillEntity: opts?.entity,
      observeSupersedes: opts?.supersedes,
    }),
  closeObserve: () => set({ observeOpen: false, observeSupersedes: undefined }),

  provenance: null,
  openProvenance: (factId) => set({ provenance: { factId } }),
  closeProvenance: () => set({ provenance: null }),

  paletteOpen: false,
  setPalette: (v) => set({ paletteOpen: v }),
}));
