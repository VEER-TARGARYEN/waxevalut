/**
 * TanStack Query hooks — one place all server state is fetched, cached and invalidated.
 * Components call these; they never construct requests. AbortSignals flow through so stale
 * requests are cancelled (search, timeline scrubbing).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type ObserveRequest } from "@/lib/api";

export const keys = {
  health: ["health"] as const,
  agents: ["agents"] as const,
  entities: (q: string) => ["entities", q] as const,
  recall: (agent: string, query: string) => ["recall", agent, query] as const,
  entity: (name: string, agent: string, asOf: string | null) => ["entity", name, agent, asOf] as const,
  impact: (name: string, agent: string, depth: number) => ["impact", name, agent, depth] as const,
  graph: (name: string, agent: string, depth: number) => ["graph", name, agent, depth] as const,
  provenance: (id: string) => ["provenance", id] as const,
};

export function useHealth() {
  return useQuery({
    queryKey: keys.health,
    queryFn: () => api.health(),
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
}

export function useAgents() {
  return useQuery({ queryKey: keys.agents, queryFn: () => api.agents(), staleTime: Infinity });
}

export function useAutocomplete(q: string) {
  return useQuery({
    queryKey: keys.entities(q),
    queryFn: ({ signal }) => api.entities(q, signal),
    enabled: q.trim().length > 0,
    staleTime: 30_000,
    placeholderData: (prev) => prev, // keep suggestions while the next query loads
  });
}

export function useRecall(agentId: string, query: string) {
  return useQuery({
    queryKey: keys.recall(agentId, query),
    queryFn: ({ signal }) => api.recall(agentId, query, signal),
    enabled: query.trim().length > 0,
    placeholderData: (prev) => prev, // agent switch keeps prior facts visible until new arrive
    staleTime: 15_000,
  });
}

export function useEntity(name: string, agentId: string, asOf: string | null) {
  return useQuery({
    queryKey: keys.entity(name, agentId, asOf),
    queryFn: ({ signal }) => api.entity(name, agentId, asOf, signal),
    enabled: !!name,
    placeholderData: (prev) => prev, // timeline scrub keeps prior facts until new arrive
    staleTime: 10_000,
  });
}

export function useImpact(name: string, agentId: string, depth: number, enabled = true) {
  return useQuery({
    queryKey: keys.impact(name, agentId, depth),
    queryFn: ({ signal }) => api.impact(name, agentId, depth, signal),
    enabled: enabled && !!name,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useGraph(name: string, agentId: string, depth: number, enabled = true) {
  return useQuery({
    queryKey: keys.graph(name, agentId, depth),
    queryFn: ({ signal }) => api.graph(name, agentId, depth, signal),
    enabled: enabled && !!name,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

export function useProvenance(factId: string | null) {
  return useQuery({
    queryKey: keys.provenance(factId ?? ""),
    queryFn: ({ signal }) => api.provenance(factId!, signal),
    enabled: !!factId,
    staleTime: 60_000,
  });
}

export function useObserve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ObserveRequest) => api.observe(body),
    onSuccess: () => {
      // New memory is live: recall, entity and graph views must reflect it immediately.
      qc.invalidateQueries({ queryKey: ["recall"] });
      qc.invalidateQueries({ queryKey: ["entity"] });
      qc.invalidateQueries({ queryKey: ["graph"] });
      qc.invalidateQueries({ queryKey: ["impact"] });
      qc.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}
