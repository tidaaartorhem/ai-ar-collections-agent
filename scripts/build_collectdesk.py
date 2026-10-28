#!/usr/bin/env python3
"""Build CollectDesk payloads.

Reads real invoice line rows (UCI Online Retail, via the cleaned
invoice_lines.csv produced by the sibling ai-invoice-processing-agent
build — same corpus, CC BY 4.0), aggregates them to invoices, and runs
the LangGraph collections workflow over a fixed Monday-morning replay.

Replay date: Monday 2011-11-28. Terms: Net 30 (seeded — the corpus
carries no terms). Window: invoices issued 2011-08-01..2011-10-28, so
every due date falls before the replay date (1-89 days overdue).

What is real and what is seeded (also stated in README + UI):
- REAL: invoice numbers, dates, customer accounts, countries, line
  totals — aggregated from the UCI corpus, unedited.
- SEEDED (standing in for the SME's ERP/CRM feed, which the public
  corpus does not contain): payment outcomes, per-account terms are
  uniform Net 30, last-contact dates, promises to pay, dispute flags.
  All seeded values are deterministic SHA-256 hashes of the invoice
  number, so re-running this script reproduces byte-identical output.
  Nothing seeded is presented as a real company's record.

Worked book: the queue shows the top 150 accounts by open balance
(354 invoices). The full open book (all accounts) is reported in
summary.json so the truncation is visible, not hidden.

Outputs: data/outputs/{queue,accounts,summary}.json and copies under
web/public/data/ (the web app reads those).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import sys
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "src"))

from collectdesk.nodes import run_nodes  # noqa: E402

REPLAY = date(2011, 11, 28)
WINDOW_START = date(2011, 8, 1)
WINDOW_END = date(2011, 10, 28)
TERMS_DAYS = 30
WORKED_ACCOUNTS = 150
DEFAULT_CSV = (Path.home() / "workspace" / "github-repos"
               / "ai-invoice-processing-agent" / "data" / "processed"
               / "invoice_lines.csv")


def h(seed: str) -> int:
    return int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16)


def account_pay_rate(cust: str) -> int:
    """Seeded per-account pay propensity, 55-95 (disclosed, hash-based)."""
    return 55 + h("rate" + cust) % 41


def is_paid(invoice_no: str, cust: str) -> bool:
    return h("paid" + invoice_no) % 100 < account_pay_rate(cust)


def aggregate(csv_path: Path) -> dict:
    invoices = {}
    with open(csv_path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            no = row["invoice_no"]
            if no.startswith("C"):
                continue
            inv = invoices.setdefault(no, {
                "invoice_no": no, "cust": row["cust"],
                "country": row["country"], "issue_date": row["invoice_date"],
                "total": 0.0, "lines": 0})
            inv["total"] += float(row["line_total"])
            inv["lines"] += 1
    return invoices


def build(csv_path: Path) -> dict:
    invoices = aggregate(csv_path)

    # Account on-time rate: paid share over pre-window invoices whose
    # due date passed before the replay date (seeded ledger). Fallback
    # 70 (neutral) for accounts with no history.
    hist_paid: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for inv in invoices.values():
        iss = date.fromisoformat(inv["issue_date"])
        if iss < WINDOW_START and iss + timedelta(days=TERMS_DAYS) < REPLAY:
            hist_paid[inv["cust"]][1] += 1
            if is_paid(inv["invoice_no"], inv["cust"]):
                hist_paid[inv["cust"]][0] += 1
    on_time = {}
    for cust, (paid, total) in hist_paid.items():
        on_time[cust] = round(100 * paid / total, 1) if total else 70.0

    open_all = []
    for inv in invoices.values():
        iss = date.fromisoformat(inv["issue_date"])
        due = iss + timedelta(days=TERMS_DAYS)
        if not (WINDOW_START <= iss <= WINDOW_END):
            continue
        if due >= REPLAY or is_paid(inv["invoice_no"], inv["cust"]):
            continue
        no = inv["invoice_no"]
        disputed = h("dispute" + no) % 100 < 8
        p = h("promise" + no) % 100
        broken = out = False
        promise_date = None
        if not disputed and p < 12:
            broken = True
            promise_date = (REPLAY - timedelta(days=1 + h("pb" + no) % 10)).isoformat()
        elif not disputed and p < 32:
            out = True
            promise_date = (REPLAY + timedelta(days=3 + h("po" + no) % 12)).isoformat()
        open_all.append({
            "invoice_no": no, "cust": inv["cust"], "country": inv["country"],
            "issue_date": inv["issue_date"], "due_date": due.isoformat(),
            "days_overdue": (REPLAY - due).days,
            "total": round(inv["total"], 2), "lines": inv["lines"],
            "disputed": disputed, "promise_broken": broken,
            "promise_outstanding": out, "promise_date": promise_date,
            "days_since_contact": h("contact" + no) % 26,
            "account_on_time_rate": on_time.get(inv["cust"], 70.0),
        })

    by_account: dict[str, list[dict]] = defaultdict(list)
    for inv in open_all:
        by_account[inv["cust"]].append(inv)
    ranked = sorted(by_account.items(),
                    key=lambda kv: -sum(i["total"] for i in kv[1]))
    worked = dict(ranked[:WORKED_ACCOUNTS])
    raw_queue = [inv for cust in worked for inv in by_account[cust]]

    try:
        from collectdesk.graph import run_graph
        queue = run_graph(raw_queue)
    except ImportError:
        # langgraph not installed: same nodes, same output, no graph lib.
        queue = run_nodes({"invoices": raw_queue})["queue"]
    queue.sort(key=lambda i: (i["pay_score"], -i["days_overdue"]))

    by_queue: dict[str, list[dict]] = defaultdict(list)
    for inv in queue:
        by_queue[inv["cust"]].append(inv)
    accounts = []
    for cust, invs in sorted(by_queue.items(),
                             key=lambda kv: -sum(i["total"] for i in kv[1])):
        accounts.append({
            "cust": cust, "country": invs[0]["country"],
            "open_invoices": len(invs),
            "open_total": round(sum(i["total"] for i in invs), 2),
            "oldest_overdue": max(i["days_overdue"] for i in invs),
            "worst_score": min(i["pay_score"] for i in invs),
            "disputed": sum(1 for i in invs if i["disputed"]),
            "broken_promises": sum(1 for i in invs if i["promise_broken"]),
            "segments": {s: sum(1 for i in invs if i["segment"] == s)
                         for s in ("NUDGE", "CALL", "ESCALATE", "PROMISE",
                                   "HOLD_DISPUTE")},
        })

    buckets: dict[str, dict] = {}
    for inv in queue:
        b = buckets.setdefault(inv["bucket"], {"count": 0, "value": 0.0})
        b["count"] += 1
        b["value"] = round(b["value"] + inv["total"], 2)
    segs: dict[str, dict] = {}
    for inv in queue:
        s = segs.setdefault(inv["segment"], {"count": 0, "value": 0.0})
        s["count"] += 1
        s["value"] = round(s["value"] + inv["total"], 2)

    summary = {
        "replay_date": REPLAY.isoformat(), "terms": "Net 30 (seeded)",
        "window": [WINDOW_START.isoformat(), WINDOW_END.isoformat()],
        "full_open_book": {"invoices": len(open_all),
                           "value": round(sum(i["total"] for i in open_all), 2),
                           "accounts": len(by_account)},
        "worked_book": {"accounts": len(worked), "invoices": len(queue),
                        "value": round(sum(i["total"] for i in queue), 2)},
        "buckets": buckets, "segments": segs,
        "broken_promises": sum(1 for i in queue if i["promise_broken"]),
        "disputed": sum(1 for i in queue if i["disputed"]),
        "graph": "LangGraph StateGraph: age -> score -> segment -> draft -> gate",
        "human_gate": "every draft pending_human_approval; nothing is sent",
    }
    return {"queue": queue, "accounts": accounts, "summary": summary}


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False, sort_keys=True)
        fh.write("\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default=str(DEFAULT_CSV))
    args = ap.parse_args()
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"collectdesk: invoice CSV not found: {csv_path}",
              file=sys.stderr)
        print("collectdesk: pass --csv, or reuse committed data/outputs/",
              file=sys.stderr)
        raise SystemExit(1)
    result = build(csv_path)
    for name, payload in result.items():
        write_json(ROOT / "data" / "outputs" / f"{name}.json", payload)
        write_json(ROOT / "web" / "public" / "data" / f"{name}.json", payload)
    s = result["summary"]
    print(f"collectdesk: worked book {s['worked_book']['invoices']} invoices, "
          f"£{s['worked_book']['value']:,.2f} across "
          f"{s['worked_book']['accounts']} accounts; full open book "
          f"{s['full_open_book']['invoices']} invoices, "
          f"£{s['full_open_book']['value']:,.2f}")


if __name__ == "__main__":
    main()
