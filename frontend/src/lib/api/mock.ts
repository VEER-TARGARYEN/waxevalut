/**
 * Mock API — implements the exact same interface and response shapes as the real backend,
 * enforcing the same authorization / supersede / token logic client-side so the demo behaves
 * identically before the backend is wired in. Adds small artificial latency so loading and
 * transition states are real, not skipped.
 */
import {
  AGENTS,
  ENTITIES,
  FACTS,
  RELATIONS,
  RETRIEVAL_CYPHER,
  SESSION,
  type MockFact,
} from "./mockData";
import {
  CLASS_LEVEL,
  type Api,
  type DataClass,
  type EntityDetail,
  type Fact,
  type GraphResponse,
  type Health,
  type ImpactResponse,
  type ObserveRequest,
  type ObserveResponse,
  type Provenance,
  type RecallResponse,
} from "./types";

// Mutable copy so /observe writes are visible in subsequent reads within the session.
let facts: MockFact[] = [...FACTS];
let writeSeq = 0;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const level = (c: DataClass) => CLASS_LEVEL[c];
const est = (chars: number) => Math.max(0, Math.round(chars / 4));

function agentOrThrow(id: string) {
  const a = AGENTS.find((x) => x.id === id);
  if (!a) throw new ApiError(404, `unknown agent '${id}'`);
  return a;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function isSuperseded(f: MockFact, asOf?: string | null): boolean {
  const newer = facts.find((n) => n.supersedes === f.id);
  if (!newer) return false;
  if (asOf) return newer.observed_at <= asOf; // superseded only if the correction predates asOf
  return true;
}

function toFact(f: MockFact): Fact {
  return {
    id: f.id,
    entity: f.entity,
    statement: f.statement,
    data_class: f.data_class,
    data_class_level: level(f.data_class),
    observed_at: f.observed_at,
    source: { id: f.source_id, kind: f.source_kind, uri: f.source_uri },
    superseded: false,
  };
}

function neighbourhood(root: string, depth: number): Set<string> {
  const seen = new Set<string>([root]);
  let frontier = [root];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const e of frontier) {
      for (const [s, , t] of RELATIONS) {
        if (s === e && !seen.has(t)) (seen.add(t), next.push(t));
        if (t === e && !seen.has(s)) (seen.add(s), next.push(s));
      }
    }
    frontier = next;
  }
  return seen;
}

export const mockApi: Api = {
  async health(): Promise<Health> {
    await delay(60);
    return { status: "connected", latency_ms: 4 + Math.round(Math.random() * 6) };
  },

  async agents() {
    await delay(80);
    return [...AGENTS].sort((a, b) => a.clearance - b.clearance || a.name.localeCompare(b.name));
  },

  async entities(q, signal) {
    await delay(90);
    signal?.throwIfAborted?.();
    const ql = q.trim().toLowerCase();
    if (!ql) return [];
    return ENTITIES.filter((e) => e.name.toLowerCase().includes(ql))
      .slice(0, 10)
      .map((e) => ({ name: e.name, kind: e.kind }));
  },

  async recall(agentId, query, signal): Promise<RecallResponse> {
    await delay(240);
    signal?.throwIfAborted?.();
    const agent = agentOrThrow(agentId);
    const q = query.trim().toLowerCase();

    // full-text-ish: entities whose name contains the query, scored by closeness
    const matched = ENTITIES.filter((e) => e.name.toLowerCase().includes(q) || q.includes(e.name.toLowerCase().split(" ")[0]))
      .map((e) => ({
        name: e.name,
        kind: e.kind,
        score: Number((1 - Math.abs(e.name.length - q.length) / 40).toFixed(4)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    const names = new Set(matched.map((m) => m.name));

    const about = facts.filter((f) => names.has(f.entity) && !isSuperseded(f));
    const visible = about.filter((f) => level(f.data_class) <= agent.clearance);
    const redacted = about.filter((f) => level(f.data_class) > agent.clearance);

    const factsOut = visible
      .sort((a, b) => (a.observed_at < b.observed_at ? 1 : -1))
      .map(toFact);

    // token corpus baseline: every fact in the k-hop neighbourhood of matched entities
    const neigh = new Set<string>();
    matched.forEach((m) => neighbourhood(m.name, 3).forEach((x) => neigh.add(x)));
    const corpusChars = facts
      .filter((f) => neigh.has(f.entity))
      .reduce((s, f) => s + f.statement.length, 0);
    const packetChars = factsOut.reduce((s, f) => s + f.statement.length, 0);
    const corpus = est(corpusChars);
    const packet = est(packetChars);

    return {
      query,
      agent,
      matched_entities: matched,
      facts: factsOut,
      redacted_count: redacted.length,
      redacted_reason: redacted.length ? "requires higher clearance" : null,
      tokens: {
        corpus,
        packet,
        reduction_pct: corpus > 0 ? Math.max(0, Number((100 * (1 - packet / corpus)).toFixed(1))) : 0,
        note: "token counts are char/4 estimates, not a tokenizer",
      },
    };
  },

  async entity(name, agentId, asOf, signal): Promise<EntityDetail> {
    await delay(200);
    signal?.throwIfAborted?.();
    const agent = agentOrThrow(agentId);
    const ent = ENTITIES.find((e) => e.name === name);
    if (!ent) throw new ApiError(404, `unknown entity '${name}'`);

    const about = facts.filter((f) => f.entity === name);
    const visible = about.filter(
      (f) =>
        level(f.data_class) <= agent.clearance &&
        (!asOf || f.observed_at <= asOf) &&
        !isSuperseded(f, asOf),
    );
    const redacted = about.filter(
      (f) => level(f.data_class) > agent.clearance && !isSuperseded(f, asOf),
    );

    const corrections = about
      .filter((f) => f.supersedes && level(f.data_class) <= agent.clearance)
      .map((f) => {
        const old = facts.find((o) => o.id === f.supersedes)!;
        return {
          old: { id: old.id, statement: old.statement, observed_at: old.observed_at },
          new: { id: f.id, statement: f.statement, observed_at: f.observed_at },
        };
      })
      .sort((a, b) => (a.new.observed_at < b.new.observed_at ? 1 : -1));

    const relations = RELATIONS.filter(([s]) => s === name).map(([, type, target]) => ({
      type,
      target,
      target_kind: ENTITIES.find((e) => e.name === target)?.kind ?? "entity",
    }));

    return {
      entity: { name: ent.name, kind: ent.kind, created_at: ent.created_at },
      facts: visible.sort((a, b) => (a.observed_at < b.observed_at ? 1 : -1)).map(toFact),
      redacted_count: redacted.length,
      corrections,
      relations,
      as_of: asOf ?? null,
    };
  },

  async impact(name, agentId, _depth, signal): Promise<ImpactResponse> {
    await delay(220);
    signal?.throwIfAborted?.();
    const agent = agentOrThrow(agentId);
    // BFS with hop distances
    const dist = new Map<string, number>([[name, 0]]);
    let frontier = [name];
    for (let d = 1; d <= 3; d++) {
      const next: string[] = [];
      for (const e of frontier)
        for (const [s, , t] of RELATIONS) {
          if (s === e && !dist.has(t)) (dist.set(t, d), next.push(t));
          if (t === e && !dist.has(s)) (dist.set(s, d), next.push(s));
        }
      frontier = next;
    }
    const reached = [...dist.entries()]
      .filter(([e]) => e !== name)
      .map(([entity, hops]) => ({
        entity,
        hops,
        what_we_know: facts
          .filter((f) => f.entity === entity && level(f.data_class) <= agent.clearance && !isSuperseded(f))
          .slice(0, 3)
          .map((f) => f.statement),
      }))
      .sort((a, b) => a.hops - b.hops || a.entity.localeCompare(b.entity));
    return { root: name, reached };
  },

  async graph(name, agentId, depth, signal): Promise<GraphResponse> {
    await delay(180);
    signal?.throwIfAborted?.();
    const agent = agentOrThrow(agentId);
    const ents = neighbourhood(name, depth);
    const nodes: GraphResponse["nodes"] = [];
    const edges: GraphResponse["edges"] = [];
    const have = new Set<string>();
    const add = (id: string, node: GraphResponse["nodes"][number]) => {
      if (!have.has(id)) (have.add(id), nodes.push(node));
    };

    ents.forEach((e) => {
      const meta = ENTITIES.find((x) => x.name === e);
      add(`e_${e}`, { id: `e_${e}`, label: e, type: "entity", kind: meta?.kind });
    });
    // entity-entity edges within neighbourhood
    RELATIONS.forEach(([s, type, t]) => {
      if (ents.has(s) && ents.has(t)) edges.push({ source: `e_${s}`, target: `e_${t}`, type });
    });
    // facts + sources for entities in neighbourhood, authorized
    facts
      .filter((f) => ents.has(f.entity) && level(f.data_class) <= agent.clearance && !isSuperseded(f))
      .forEach((f) => {
        const fnode = `f_${f.id}`;
        add(fnode, { id: fnode, label: f.statement.slice(0, 60), type: "fact", data_class: f.data_class });
        edges.push({ source: fnode, target: `e_${f.entity}`, type: "ABOUT" });
        const snode = `s_${f.source_id}`;
        add(snode, { id: snode, label: f.source_uri, type: "source", kind: f.source_kind });
        edges.push({ source: fnode, target: snode, type: "SOURCED_FROM" });
      });

    const redacted = facts.filter(
      (f) => ents.has(f.entity) && level(f.data_class) > agent.clearance && !isSuperseded(f),
    ).length;
    return { nodes, edges, redacted_count: redacted };
  },

  async provenance(factId, signal): Promise<Provenance> {
    await delay(140);
    signal?.throwIfAborted?.();
    const f = facts.find((x) => x.id === factId);
    if (!f) throw new ApiError(404, `unknown fact '${factId}'`);
    return {
      fact: {
        id: f.id,
        statement: f.statement,
        data_class: f.data_class,
        observed_at: f.observed_at,
        entity: f.entity,
      },
      source: {
        id: f.source_id,
        kind: f.source_kind,
        uri: f.source_uri,
        ingested_at: f.observed_at,
      },
      session: SESSION,
      retrieval_cypher: RETRIEVAL_CYPHER,
    };
  },

  async observe(body: ObserveRequest): Promise<ObserveResponse> {
    await delay(260);
    const id = `f_new_${(++writeSeq).toString().padStart(3, "0")}`;
    const f: MockFact = {
      id,
      entity: body.entity.trim(),
      statement: body.statement.trim(),
      data_class: body.data_class,
      observed_at: new Date().toISOString(),
      source_kind: body.source_kind,
      source_uri: body.source_uri || `${body.source_kind}:${id}`,
      source_id: `s_new_${writeSeq}`,
      supersedes: body.supersedes_fact_id ?? undefined,
    };
    facts = [...facts, f];
    if (!ENTITIES.find((e) => e.name === f.entity)) {
      ENTITIES.push({ name: f.entity, kind: body.kind || "entity", created_at: new Date().toISOString() });
    }
    return { ok: true, fact_id: id, entity: f.entity };
  },
};

/** Reset mock mutations — used by tests / demo reset. */
export function resetMock() {
  facts = [...FACTS];
  writeSeq = 0;
}
