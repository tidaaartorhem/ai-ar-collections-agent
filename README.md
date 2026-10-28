# CollectDesk — the AR collections desk

**The problem:** late payments kill more small businesses than anything
else, yet the collections "system" at most SMEs is a spreadsheet and a
memory. Nobody works the overdue book in priority order: the polite
reminder goes to the account that would have paid anyway, the broken
promise sits unnoticed for weeks, and the disputed invoice keeps getting
chased — which is how a billing error turns into a lost customer. The
follow-up itself is the other failure: every chase is drafted from
scratch, so it either never happens or happens late.

**What this does:** a LangGraph workflow that runs the Monday-morning
collections desk. It ages every open invoice, scores pay-likelihood with
a fully disclosed formula, routes each invoice to exactly one action
(Nudge, Call, Escalate, Promise-monitor, or Dispute-hold), and generates
one follow-up draft per invoice — behind a hard human gate. The workflow
never sends anything; the send is always a person's decision.

## The workflow (LangGraph StateGraph)

```
invoices ──► age ──► score ──► segment ──► draft ──► gate ──► queue
```

- **age** — Net 30 due dates against the replay date; buckets 1-30 /
  31-60 / 61-90 / 91+ days overdue; escalation ladder per bucket.
- **score** — pay-likelihood 0-100, additive and disclosed: bucket base
  (85 / 60 / 40 / 25) −25 disputed −15 broken promise +10 outstanding
  promise −10 no contact in 14+ days ±15 account on-time history −8
  over £2,000, clamped 0-100.
- **segment** — first match wins: disputed → HOLD_DISPUTE; broken
  promise → ESCALATE; outstanding promise → PROMISE (monitor, never
  chase before its date); score ≥70 → NUDGE; ≥40 → CALL; else ESCALATE.
- **draft** — one draft per invoice: reminder, call script, final
  notice, promise acknowledgement, or dispute-hold note.
- **gate** — every draft marked `pending_human_approval`, `sent: false`.

The node functions in `src/collectdesk/nodes.py` are pure and
deterministic; `src/collectdesk/graph.py` is the StateGraph wrapper.
`scripts/build_collectdesk.py` runs the graph when langgraph is
installed and the same nodes in order when it is not — identical output
either way, so the pipeline never stalls on the library.

## What is real and what is seeded

- **Real:** invoice numbers, dates, customer accounts, countries and
  line totals, aggregated unedited from the UCI Online Retail dataset
  (Chen, D. (2015), CC BY 4.0, https://doi.org/10.24432/C5BW33) — the
  same cleaned corpus used by the sibling ai-invoice-processing-agent
  build. 19,960 invoices in the corpus.
- **Seeded (disclosed, deterministic):** the public corpus records
  sales, not payments. Payment outcomes, uniform Net 30 terms, last
  contact dates, promises to pay and dispute flags stand in for the
  SME's ERP/CRM feed. They are SHA-256 hashes of the invoice number, so
  re-running the pipeline reproduces byte-identical output. Nothing
  seeded is presented as a real company's record.

## Headline numbers (replay: Monday 2011-11-28)

- Full open book: **1,243 invoices, £764,632.54** across 916 accounts
- Worked book (top 150 accounts by open balance): **354 invoices,
  £505,558.50**
- Aging: 1-30 days: 147 (£174,577.99) · 31-60: 121 (£199,130.63) ·
  61-90: 86 (£131,849.88)
- Segments: Nudge 84 · Call 108 · Escalate 78 · Promise 60 ·
  Dispute-hold 24
- **38 broken promises** in the queue — the accounts where trust is
  already spent — and **24 disputed invoices** the desk must not chase
- Zero LLM calls. Same inputs → byte-identical outputs.

## The web app

Light, minimal, five views:

1. **Morning queue** — the worked book, lowest pay-likelihood first,
   searchable and filterable by segment and aging bucket.
2. **Accounts** — the 150 worked accounts ranked by open balance, with
   broken promises and disputes called out.
3. **Drafts** — one human-gated draft per invoice, copy-to-clipboard,
   behind an explicit "nothing is sent" banner.
4. **Score an invoice** — paste in days overdue, total, history and
   flags; the same deterministic rules run in your browser (TypeScript
   mirror) and score it live.
5. **Replay** — the full workflow run narrated step-by-step with the
   real numbers, so the figures are auditable.

Live: https://ai-ar-collections-agent.web.app

## Cross-language rule contract

`src/collectdesk/rules.py` and `web/src/rules.ts` implement the
identical scoring/segmentation rules, including Python's banker's
rounding (half to even) in the TypeScript mirror.
`data/test-vectors.json` (6 vectors with hard-coded expected values)
is asserted by both `tests/test_collectdesk.py` (pytest) and
`web/src/rules.test.ts` (vitest) — Python and the browser agree exactly.

## Run it

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
python3 scripts/build_collectdesk.py   # writes data/outputs/ + web/public/data/
.venv/bin/python -m pytest tests/ -q
cd web && npm install && npm test && npm run build
```

`build_collectdesk.py` reads the cleaned UCI line rows from
`../ai-invoice-processing-agent/data/processed/invoice_lines.csv` by
default (pass `--csv` to point elsewhere). No Jev, no Laya, no external
service: the workflow runs entirely on local rules.
