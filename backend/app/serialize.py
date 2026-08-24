"""Turn raw driver rows into the exact JSON shapes PAGES.md promises the front end.

Keeping this in one module means the API contract is enforced in one place: if a field name
has to change, it changes here and nowhere else, and the front end never sees a Neo4j
temporal object leak through as an unserialisable value.
"""
from __future__ import annotations

from typing import Any

from .queries import DATA_CLASS_LEVEL


def iso(v: Any) -> str | None:
    """Neo4j DateTime / date -> ISO 8601 string. Passes through strings and None."""
    if v is None:
        return None
    if isinstance(v, str):
        return v
    # neo4j.time.DateTime and friends implement isoformat via to_native()/iso_format().
    for attr in ("iso_format", "isoformat"):
        fn = getattr(v, attr, None)
        if callable(fn):
            try:
                return fn()
            except Exception:
                pass
    try:
        return v.to_native().isoformat()
    except Exception:
        return str(v)


def estimate_tokens(chars: int) -> int:
    """Rough token count. ~4 chars per token is the widely-used heuristic; we label it an
    estimate everywhere it surfaces so no one mistakes it for a tokenizer."""
    return max(0, round(chars / 4))


def fact_from_row(row: dict) -> dict:
    """The canonical Fact shape used by Recall and Entity Detail."""
    return {
        "id": row.get("fact_id"),
        "entity": row.get("entity"),
        "statement": row.get("statement"),
        "data_class": row.get("data_class"),
        "data_class_level": row.get("data_class_level"),
        "observed_at": iso(row.get("observed_at")),
        "source": {
            "id": row.get("source_id"),
            "kind": row.get("source_kind"),
            "uri": row.get("source_uri"),
        },
        "superseded": False,  # the read path only ever returns non-superseded facts
    }


def token_block(corpus_chars: int, packet_chars: int) -> dict:
    corpus = estimate_tokens(corpus_chars)
    packet = estimate_tokens(packet_chars)
    reduction = round((1 - (packet / corpus)) * 100, 1) if corpus > 0 else 0.0
    return {
        "corpus": corpus,
        "packet": packet,
        "reduction_pct": max(0.0, reduction),
        "note": "token counts are char/4 estimates, not a tokenizer",
    }


def data_class_level(label: str) -> int:
    return DATA_CLASS_LEVEL.get((label or "").lower(), 0)
