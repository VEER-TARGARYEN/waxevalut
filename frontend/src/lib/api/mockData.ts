/**
 * Mock dataset — a faithful mirror of backend/scripts/seed.py.
 *
 * Same entities, facts, data classes, relations and corrections as the real seed, so the
 * front end behaves identically whether it talks to this mock or the live FastAPI service.
 * When the backend is connected, this file simply stops being imported.
 */
import type { DataClass, EntityKind, SourceKind } from "./types";

export interface MockEntity {
  name: string;
  kind: EntityKind;
  created_at: string;
}
export interface MockFact {
  id: string;
  entity: string;
  statement: string;
  data_class: DataClass;
  observed_at: string;
  source_kind: SourceKind;
  source_uri: string;
  source_id: string;
  supersedes?: string; // fact id this one corrects
}

export const AGENTS = [
  { id: "support_bot", name: "Support Bot", role: "L1 Support", clearance: 1 },
  { id: "field_agent", name: "Field Agent", role: "L2 Field", clearance: 1 },
  { id: "pii_bot", name: "Data Bot", role: "Data (PII)", clearance: 2 },
  { id: "finance_bot", name: "Finance Bot", role: "Finance", clearance: 3 },
  { id: "public_bot", name: "Research Bot", role: "Public", clearance: 0 },
];

export const ENTITIES: MockEntity[] = [
  ["Acme Corporation", "account"],
  ["Globex Industries", "account"],
  ["Initech LLC", "account"],
  ["Umbrella Health", "account"],
  ["Billing Service", "service"],
  ["Payments API", "service"],
  ["Auth Gateway", "service"],
  ["Notification Service", "service"],
  ["Data Warehouse", "service"],
  ["Jane Okafor", "person"],
  ["Marcus Lee", "person"],
  ["Priya Nair", "person"],
  ["INC-4471", "incident"],
  ["INC-4488", "incident"],
  ["INC-4501", "incident"],
].map(([name, kind]) => ({ name, kind, created_at: "2026-01-01T00:00:00Z" }));

export const RELATIONS: [string, string, string][] = [
  ["Acme Corporation", "depends_on", "Billing Service"],
  ["Globex Industries", "depends_on", "Billing Service"],
  ["Initech LLC", "depends_on", "Auth Gateway"],
  ["Umbrella Health", "depends_on", "Notification Service"],
  ["Billing Service", "depends_on", "Payments API"],
  ["Billing Service", "depends_on", "Auth Gateway"],
  ["Payments API", "depends_on", "Data Warehouse"],
  ["Notification Service", "depends_on", "Auth Gateway"],
  ["INC-4471", "affects", "Payments API"],
  ["INC-4488", "affects", "Auth Gateway"],
  ["INC-4501", "affects", "Notification Service"],
  ["Jane Okafor", "works_on", "Billing Service"],
  ["Marcus Lee", "works_on", "Auth Gateway"],
  ["Priya Nair", "works_on", "Payments API"],
  ["Jane Okafor", "contact_for", "Acme Corporation"],
];

let n = 0;
const fid = () => `f_seed_${(++n).toString().padStart(3, "0")}`;
const sid = (i: number) => `s_${i.toString().padStart(3, "0")}`;

// (entity, statement, class, source_kind, source_uri, observed_at)
const raw: [string, string, DataClass, SourceKind, string, string][] = [
  ["Acme Corporation", "Acme upgraded to the Enterprise plan.", "internal", "document", "contract-2026-07.pdf", "2026-07-14T09:20:00Z"],
  ["Acme Corporation", "Primary billing contact is Jane Okafor.", "internal", "conversation", "ticket #4471", "2026-07-15T11:00:00Z"],
  ["Acme Corporation", "Acme's account card ending 4242 expires 2026-11.", "pii", "api", "stripe:cus_ACME", "2026-07-16T08:00:00Z"],
  ["Acme Corporation", "Acme raised a billing dispute over a duplicate charge.", "internal", "conversation", "ticket #4471", "2026-08-20T14:30:00Z"],
  ["Acme Corporation", "Internal note: Acme renewal at risk, exec escalation.", "secret", "conversation", "slack:#accounts", "2026-08-21T16:00:00Z"],
  ["Globex Industries", "Globex is on the Growth plan, 40 seats.", "internal", "document", "order-2026-03.pdf", "2026-03-02T10:00:00Z"],
  ["Globex Industries", "Globex reported intermittent 502s on checkout.", "internal", "conversation", "ticket #4482", "2026-08-19T09:10:00Z"],
  ["Initech LLC", "Initech uses SSO via the Auth Gateway.", "internal", "document", "onboarding.md", "2026-05-11T13:00:00Z"],
  ["Initech LLC", "Initech admin email is admin@initech.example.", "pii", "api", "crm:initech", "2026-05-11T13:05:00Z"],
  ["Umbrella Health", "Umbrella is a HIPAA-covered entity; PHI handling applies.", "secret", "document", "dpa-umbrella.pdf", "2026-02-20T09:00:00Z"],
  ["Umbrella Health", "Umbrella relies on the Notification Service for alerts.", "internal", "document", "arch-review.md", "2026-06-01T09:00:00Z"],
  ["Billing Service", "Billing Service p95 latency is 180ms under normal load.", "internal", "api", "grafana:billing", "2026-08-01T00:00:00Z"],
  ["Billing Service", "Billing Service depends on Payments API and Auth Gateway.", "public", "document", "arch-review.md", "2026-06-01T09:00:00Z"],
  ["Payments API", "Payments API had a 22-minute outage during INC-4471.", "internal", "conversation", "ticket #4471", "2026-08-20T14:00:00Z"],
  ["Payments API", "Payments API rotates credentials every 30 days.", "secret", "document", "runbook-payments.md", "2026-07-01T09:00:00Z"],
  ["Auth Gateway", "Auth Gateway rate limit is 1000 req/min per tenant.", "public", "document", "api-docs.md", "2026-04-01T09:00:00Z"],
  ["Auth Gateway", "Auth Gateway certificate renews 2026-10-15.", "internal", "api", "cert-manager", "2026-08-10T09:00:00Z"],
  ["Notification Service", "Notification Service uses Auth Gateway for tenant scoping.", "public", "document", "arch-review.md", "2026-06-01T09:00:00Z"],
  ["Jane Okafor", "Jane Okafor is the on-call lead for Billing this week.", "internal", "api", "pagerduty", "2026-08-18T09:00:00Z"],
  ["Marcus Lee", "Marcus Lee owns the Auth Gateway service.", "internal", "document", "org-chart.md", "2026-01-10T09:00:00Z"],
  ["INC-4471", "INC-4471: duplicate charge caused by a Payments API retry storm.", "internal", "conversation", "ticket #4471", "2026-08-20T15:00:00Z"],
  ["INC-4471", "INC-4471 root cause: missing idempotency key on retry.", "internal", "document", "postmortem-4471.md", "2026-08-22T10:00:00Z"],
  ["INC-4488", "INC-4488: Auth Gateway latency spike from cert reload.", "internal", "conversation", "ticket #4488", "2026-08-11T09:30:00Z"],
];

export const FACTS: MockFact[] = raw.map(([entity, statement, data_class, sk, uri, observed], i) => ({
  id: fid(),
  entity,
  statement,
  data_class,
  observed_at: observed,
  source_kind: sk,
  source_uri: uri,
  source_id: sid(i),
}));

// Corrections: a newer fact SUPERSEDES an older one (by statement substring match).
const corrections: [string, string, string, DataClass, string, string][] = [
  ["Acme Corporation", "Primary billing contact is Jane Okafor", "Primary billing contact is Marcus Lee (Jane moved teams).", "internal", "ticket #4471", "2026-08-25T10:00:00Z"],
  ["Globex Industries", "Growth plan, 40 seats", "Globex upgraded to the Growth plan, 65 seats.", "internal", "order-2026-08.pdf", "2026-08-05T10:00:00Z"],
];

corrections.forEach(([entity, oldSub, statement, data_class, uri, observed], i) => {
  const old = FACTS.find((f) => f.entity === entity && f.statement.includes(oldSub));
  FACTS.push({
    id: fid(),
    entity,
    statement,
    data_class,
    observed_at: observed,
    source_kind: "conversation",
    source_uri: uri,
    source_id: sid(100 + i),
    supersedes: old?.id,
  });
});

export const SESSION = { id: "sess_seed", agent: "ingestor", started_at: "2026-07-01T09:00:00Z" };

export const RETRIEVAL_CYPHER = `MATCH (e:Entity {name: $name})<-[:ABOUT]-(f:Fact)-[:SOURCED_FROM]->(src:Source)
WHERE f.data_class_level <= $clearance
  AND ($as_of IS NULL OR f.observed_at <= datetime($as_of))
OPTIONAL MATCH (f)<-[:SUPERSEDES]-(newer:Fact)
  WHERE ($as_of IS NULL OR newer.observed_at <= datetime($as_of))
WITH f, src, newer
WHERE newer IS NULL
RETURN f.id, f.statement, f.data_class, f.observed_at,
       src.id, src.kind, src.uri
ORDER BY f.observed_at DESC`;
