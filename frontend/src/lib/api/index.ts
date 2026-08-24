/**
 * The single switch between mock and live backend.
 *
 * Default: mock (so the app runs with zero backend, per the build directive).
 * Set VITE_USE_MOCK=0 (and optionally VITE_API_BASE) to talk to the real FastAPI service.
 * Components import `api` from here and never know which implementation they got.
 */
import { httpApi } from "./client";
import { mockApi } from "./mock";
import type { Api } from "./types";

const useMock = (import.meta.env.VITE_USE_MOCK ?? "1") !== "0";

export const api: Api = useMock ? mockApi : httpApi;
export const API_MODE: "mock" | "live" = useMock ? "mock" : "live";

export * from "./types";
