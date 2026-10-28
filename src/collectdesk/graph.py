"""The CollectDesk workflow as a LangGraph StateGraph.

Nodes: ingest -> age -> score -> segment -> draft -> gate.
The gate node is the product's hard rule: drafts are produced, sending
is always a human action. No node calls an LLM and no node sends mail.
"""

from __future__ import annotations

from typing import TypedDict

from langgraph.graph import END, StateGraph

from .nodes import (node_age, node_draft, node_gate, node_score,
                    node_segment)


class CollectState(TypedDict, total=False):
    invoices: list
    aged: list
    scored: list
    segmented: list
    drafted: list
    queue: list


def build_graph():
    graph = StateGraph(CollectState)
    graph.add_node("age", node_age)
    graph.add_node("score", node_score)
    graph.add_node("segment", node_segment)
    graph.add_node("draft", node_draft)
    graph.add_node("gate", node_gate)
    graph.set_entry_point("age")
    graph.add_edge("age", "score")
    graph.add_edge("score", "segment")
    graph.add_edge("segment", "draft")
    graph.add_edge("draft", "gate")
    graph.add_edge("gate", END)
    return graph.compile()


def run_graph(invoices: list) -> list:
    """Run the compiled graph over raw invoices; return the gated queue."""
    app = build_graph()
    result = app.invoke({"invoices": invoices})
    return result["queue"]
