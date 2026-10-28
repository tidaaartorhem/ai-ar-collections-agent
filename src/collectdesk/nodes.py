"""LangGraph node functions — pure, deterministic, independently testable.

The graph itself lives in graph.py (a thin StateGraph wrapper around
these nodes). scripts/build_collectdesk.py runs the same nodes in order
when langgraph is not installed, so the pipeline output is identical
with or without the graph library: the graph is orchestration, the
nodes are the work.
"""

from __future__ import annotations

from .rules import (aging_bucket, draft_body, draft_subject,
                    escalation_step, pay_score, segment)


def node_age(state: dict) -> dict:
    """Attach due dates, days overdue and aging buckets to raw invoices."""
    out = []
    for inv in state["invoices"]:
        row = dict(inv)
        row["bucket"] = aging_bucket(inv["days_overdue"])
        row["escalation"] = escalation_step(inv["days_overdue"])
        out.append(row)
    return {"aged": out}


def node_score(state: dict) -> dict:
    """Attach the disclosed pay-likelihood score to every aged invoice."""
    out = []
    for inv in state["aged"]:
        row = dict(inv)
        row["pay_score"] = pay_score(
            inv["days_overdue"], inv["disputed"], inv["promise_broken"],
            inv["promise_outstanding"], inv["days_since_contact"],
            inv["account_on_time_rate"], inv["total"])
        out.append(row)
    return {"scored": out}


def node_segment(state: dict) -> dict:
    """Segment every scored invoice into one recommended action."""
    out = []
    for inv in state["scored"]:
        row = dict(inv)
        row["segment"] = segment(
            inv["days_overdue"], inv["disputed"], inv["promise_broken"],
            inv["promise_outstanding"], inv["days_since_contact"],
            inv["account_on_time_rate"], inv["total"])
        out.append(row)
    return {"segmented": out}


def node_draft(state: dict) -> dict:
    """Generate one human-gated draft per invoice. Nothing is sent."""
    out = []
    for inv in state["segmented"]:
        row = dict(inv)
        row["draft_subject"] = draft_subject(inv["segment"], inv["invoice_no"])
        row["draft_body"] = draft_body(inv["segment"], inv["invoice_no"],
                                       inv["total"], inv["days_overdue"],
                                       inv.get("promise_date"))
        out.append(row)
    return {"drafted": out}


def node_gate(state: dict) -> dict:
    """Human gate: every draft is marked pending approval, never sent."""
    out = []
    for inv in state["drafted"]:
        row = dict(inv)
        row["gate"] = "pending_human_approval"
        row["sent"] = False
        out.append(row)
    return {"queue": out}


NODES_IN_ORDER = [node_age, node_score, node_segment, node_draft, node_gate]


def run_nodes(state: dict) -> dict:
    """Run the nodes in order without langgraph (identical output)."""
    for fn in NODES_IN_ORDER:
        state = {**state, **fn(state)}
    return state
