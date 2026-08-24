/**
 * Real HTTP client — talks to the FastAPI backend. Same interface as the mock, so swapping
 * is a one-line change in ./index.ts. Base URL comes from VITE_API_BASE (default "/api",
 * which the Vite dev proxy forwards to the running backend).
 */
import type {
  Agent,
  Api,
  EntityDetail,
  EntitySuggestion,
  GraphResponse,
  Health,
  ImpactResponse,
  ObserveRequest,
  ObserveResponse,
  Provenance,
  RecallResponse,
} from "./types";

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "/api";

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || body.message || detail;
    } catch {
      /* ignore */
    }
    throw new HttpError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

const qs = (o: Record<string, string | number | null | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const httpApi: Api = {
  health: () => req<Health>("/health"),
  agents: () => req<Agent[]>("/agents"),
  entities: (q, signal) => req<EntitySuggestion[]>(`/entities${qs({ q })}`, { signal }),
  recall: (agent_id, query, signal) =>
    req<RecallResponse>("/recall", { method: "POST", body: JSON.stringify({ agent_id, query }), signal }),
  entity: (name, agent_id, as_of, signal) =>
    req<EntityDetail>(`/entity/${encodeURIComponent(name)}${qs({ agent_id, as_of })}`, { signal }),
  impact: (name, agent_id, depth, signal) =>
    req<ImpactResponse>(`/entity/${encodeURIComponent(name)}/impact${qs({ agent_id, depth })}`, { signal }),
  graph: (name, agent_id, depth, signal) =>
    req<GraphResponse>(`/entity/${encodeURIComponent(name)}/graph${qs({ agent_id, depth })}`, { signal }),
  provenance: (fact_id, signal) =>
    req<Provenance>(`/fact/${encodeURIComponent(fact_id)}/provenance`, { signal }),
  observe: (body: ObserveRequest) =>
    req<ObserveResponse>("/observe", { method: "POST", body: JSON.stringify(body) }),
};
