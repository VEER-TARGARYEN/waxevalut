/**
 * API types — the exact shapes the backend returns (see PAGES.md).
 * Components import ONLY from here, never from the mock or the real client, so switching
 * the implementation is a one-line change in ./index.ts.
 */

export type DataClass = "public" | "internal" | "pii" | "secret";
export type EntityKind = "account" | "service" | "person" | "project" | "incident" | string;
export type SourceKind = "conversation" | "document" | "api";

export interface Agent {
  id: string;
  name: string;
  role: string;
  clearance: number; // 0 public .. 3 secret
}

export interface Source {
  id: string | null;
  kind: SourceKind | null;
  uri: string | null;
}

export interface Fact {
  id: string;
  entity: string | null;
  statement: string;
  data_class: DataClass;
  data_class_level: number;
  observed_at: string; // ISO
  source: Source;
  superseded: boolean;
}

export interface MatchedEntity {
  name: string;
  kind: EntityKind;
  score: number;
}

export interface TokenStats {
  corpus: number;
  packet: number;
  reduction_pct: number;
  note?: string;
}

export interface RecallResponse {
  query: string;
  agent: Agent;
  matched_entities: MatchedEntity[];
  facts: Fact[];
  redacted_count: number;
  redacted_reason: string | null;
  tokens: TokenStats;
}

export interface Correction {
  old: { id: string; statement: string; observed_at: string };
  new: { id: string; statement: string; observed_at: string };
}

export interface Relation {
  type: string;
  target: string;
  target_kind: EntityKind;
}

export interface EntityDetail {
  entity: { name: string; kind: EntityKind; created_at: string | null };
  facts: Fact[];
  redacted_count: number;
  corrections: Correction[];
  relations: Relation[];
  as_of: string | null;
}

export interface ImpactReach {
  entity: string;
  hops: number;
  what_we_know: string[];
}
export interface ImpactResponse {
  root: string;
  reached: ImpactReach[];
}

export type GraphNodeType = "entity" | "fact" | "source";
export interface GraphNode {
  id: string;
  label: string;
  type: GraphNodeType;
  kind?: EntityKind;
  data_class?: DataClass;
}
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}
export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  redacted_count: number;
}

export interface Provenance {
  fact: {
    id: string;
    statement: string;
    data_class: DataClass;
    observed_at: string;
    entity: string | null;
  };
  source: {
    id: string | null;
    kind: SourceKind | null;
    uri: string | null;
    ingested_at: string | null;
  };
  session: { id: string | null; agent: string | null; started_at: string | null };
  retrieval_cypher: string;
}

export interface Health {
  status: "connected" | "degraded" | "offline";
  latency_ms: number | null;
}

export interface ObserveRequest {
  entity: string;
  kind?: string;
  statement: string;
  data_class: DataClass;
  source_kind: SourceKind;
  source_uri?: string;
  session_id?: string | null;
  supersedes_fact_id?: string | null;
}
export interface ObserveResponse {
  ok: boolean;
  fact_id: string;
  entity: string;
}

export interface EntitySuggestion {
  name: string;
  kind: EntityKind;
}

export interface Api {
  health(): Promise<Health>;
  agents(): Promise<Agent[]>;
  entities(q: string, signal?: AbortSignal): Promise<EntitySuggestion[]>;
  recall(agentId: string, query: string, signal?: AbortSignal): Promise<RecallResponse>;
  entity(name: string, agentId: string, asOf?: string | null, signal?: AbortSignal): Promise<EntityDetail>;
  impact(name: string, agentId: string, depth: number, signal?: AbortSignal): Promise<ImpactResponse>;
  graph(name: string, agentId: string, depth: number, signal?: AbortSignal): Promise<GraphResponse>;
  provenance(factId: string, signal?: AbortSignal): Promise<Provenance>;
  observe(body: ObserveRequest): Promise<ObserveResponse>;
}

export const CLASS_LEVEL: Record<DataClass, number> = {
  public: 0,
  internal: 1,
  pii: 2,
  secret: 3,
};
