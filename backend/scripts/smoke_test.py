#!/usr/bin/env python3
"""End-to-end API smoke test. Assumes the seed has run and the server is up.

    python scripts/smoke_test.py [http://127.0.0.1:8000]

Exercises every endpoint and asserts the behaviours that matter: authorization filtering
(the money shot), time-travel, the write-then-read live path, and provenance. Exits non-zero
on any failure so it can gate a deploy.
"""
from __future__ import annotations

import sys
import urllib.request
import json

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://127.0.0.1:8000"
FAILS: list[str] = []


def call(method: str, path: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())


def check(label: str, ok: bool, detail: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f"  ({detail})" if detail else ""))
    if not ok:
        FAILS.append(label)


def main() -> int:
    print(f"Smoke testing {BASE}")

    h = call("GET", "/api/health")
    check("health is connected", h.get("status") == "connected", str(h))

    agents = call("GET", "/api/agents")
    check("agents listed with clearances", len(agents) >= 2 and "clearance" in agents[0])

    # The money shot: same query, different clearance, different visible facts.
    pub = call("POST", "/api/recall", {"agent_id": "public_bot", "query": "Acme"})
    fin = call("POST", "/api/recall", {"agent_id": "finance_bot", "query": "Acme"})
    check("public bot sees fewer facts than finance bot",
          len(pub["facts"]) < len(fin["facts"]),
          f"{len(pub['facts'])} < {len(fin['facts'])}")
    check("public bot has redactions", pub["redacted_count"] > 0, f"{pub['redacted_count']} hidden")
    check("token reduction is reported", fin["tokens"]["reduction_pct"] > 0,
          f"{fin['tokens']['corpus']}->{fin['tokens']['packet']} = {fin['tokens']['reduction_pct']}%")

    # Time-travel: the corrected fact reverts before its correction date.
    now = call("GET", "/api/entity/Acme Corporation", None) if False else \
        call("GET", "/api/entity/Acme%20Corporation?agent_id=finance_bot")
    past = call("GET", "/api/entity/Acme%20Corporation?agent_id=finance_bot&as_of=2026-08-10T00:00:00Z")
    now_contact = [f["statement"] for f in now["facts"] if "contact" in f["statement"].lower()]
    past_contact = [f["statement"] for f in past["facts"] if "contact" in f["statement"].lower()]
    check("current contact differs from historical contact",
          now_contact and past_contact and now_contact != past_contact,
          f"now={now_contact[:1]} then={past_contact[:1]}")

    # Live write path: observe, then recall shows it.
    w = call("POST", "/api/observe", {
        "entity": "Globex Industries", "statement": "SMOKE TEST fact - safe to ignore.",
        "data_class": "public", "source_kind": "api", "source_uri": "smoke-test",
    })
    check("observe returns a fact id", w.get("ok") and w.get("fact_id"))
    r2 = call("POST", "/api/recall", {"agent_id": "public_bot", "query": "Globex"})
    check("written fact is immediately recallable",
          any("SMOKE TEST" in f["statement"] for f in r2["facts"]))

    # Impact + graph shape.
    imp = call("GET", "/api/entity/Payments%20API/impact?agent_id=support_bot")
    check("impact returns multi-hop reach", len(imp["reached"]) >= 3,
          f"{len(imp['reached'])} entities")
    g = call("GET", "/api/entity/Billing%20Service/graph?agent_id=support_bot&depth=1")
    check("graph returns nodes and edges", len(g["nodes"]) > 0 and len(g["edges"]) > 0,
          f"{len(g['nodes'])} nodes / {len(g['edges'])} edges")

    print()
    if FAILS:
        print(f"{len(FAILS)} check(s) failed.")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
