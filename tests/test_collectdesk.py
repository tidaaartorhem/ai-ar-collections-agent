"""Tests for CollectDesk rules, vectors, pipeline and LangGraph graph."""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from collectdesk.nodes import run_nodes  # noqa: E402
from collectdesk.rules import (aging_bucket, draft_subject, escalation_step,  # noqa: E402
                               pay_score, segment)

ROOT = Path(__file__).resolve().parent.parent
VECTORS = json.loads((ROOT / "data" / "test-vectors.json").read_text())


@pytest.mark.parametrize("v", VECTORS, ids=[v["name"] for v in VECTORS])
def test_vectors(v):
    assert aging_bucket(v["days_overdue"]) == v["expected_bucket"]
    score = pay_score(v["days_overdue"], v["disputed"], v["promise_broken"],
                      v["promise_outstanding"], v["days_since_contact"],
                      v["account_on_time_rate"], v["total"])
    assert score == v["expected_score"]
    seg = segment(v["days_overdue"], v["disputed"], v["promise_broken"],
                  v["promise_outstanding"], v["days_since_contact"],
                  v["account_on_time_rate"], v["total"])
    assert seg == v["expected_segment"]


def test_bucket_boundaries():
    assert aging_bucket(30) == "1-30"
    assert aging_bucket(31) == "31-60"
    assert aging_bucket(90) == "61-90"
    assert aging_bucket(91) == "91+"


def test_score_clamped():
    assert pay_score(200, True, True, False, 30, 0, 99999) == 0
    assert pay_score(1, False, False, True, 0, 100, 10) == 100


def test_escalation_ladder():
    assert escalation_step(10) == "reminder email"
    assert escalation_step(45) == "phone call + email"
    assert escalation_step(75) == "final notice before referral"
    assert escalation_step(100).startswith("referral review")


def test_draft_subjects_cover_all_segments():
    for seg in ("NUDGE", "CALL", "ESCALATE", "PROMISE", "HOLD_DISPUTE"):
        assert "123" in draft_subject(seg, "123")


def _fixture_invoice(**over):
    base = {"invoice_no": "999001", "cust": "12345", "country": "United Kingdom",
            "issue_date": "2011-09-01", "due_date": "2011-10-01",
            "days_overdue": 45, "total": 400.0, "lines": 3,
            "disputed": False, "promise_broken": False,
            "promise_outstanding": False, "promise_date": None,
            "days_since_contact": 5, "account_on_time_rate": 75.0}
    base.update(over)
    return base


def test_nodes_end_to_end_gate():
    out = run_nodes({"invoices": [_fixture_invoice()]})
    row = out["queue"][0]
    assert row["bucket"] == "31-60"
    assert row["segment"] == "CALL"
    assert row["gate"] == "pending_human_approval"
    assert row["sent"] is False
    assert "999001" in row["draft_subject"]


def test_graph_matches_nodes():
    pytest.importorskip("langgraph")
    from collectdesk.graph import run_graph
    invs = [_fixture_invoice(),
            _fixture_invoice(invoice_no="999002", disputed=True)]
    via_graph = run_graph(invs)
    via_nodes = run_nodes({"invoices": invs})["queue"]
    assert [r["invoice_no"] for r in via_graph] == [r["invoice_no"] for r in via_nodes]
    for g, n in zip(via_graph, via_nodes):
        assert g["segment"] == n["segment"]
        assert g["pay_score"] == n["pay_score"]
        assert g["sent"] is False


def test_pipeline_outputs_shape():
    summary_path = ROOT / "data" / "outputs" / "summary.json"
    if not summary_path.exists():
        pytest.skip("pipeline not run yet")
    summary = json.loads(summary_path.read_text())
    assert summary["worked_book"]["accounts"] == 150
    assert summary["worked_book"]["invoices"] > 300
    queue = json.loads((ROOT / "data" / "outputs" / "queue.json").read_text())
    assert all(q["gate"] == "pending_human_approval" and q["sent"] is False
               for q in queue)
    assert all(q["segment"] in ("NUDGE", "CALL", "ESCALATE", "PROMISE",
                                "HOLD_DISPUTE") for q in queue)
