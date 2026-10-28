"""CollectDesk rules — deterministic, disclosed, no LLM calls.

Every number the UI shows comes from these functions (Python) or their
exact TypeScript mirror (web/src/rules.ts). The shared contract is
data/test-vectors.json, asserted by both pytest and vitest.

Pay-likelihood score (0-100), additive and fully disclosed:
  base by days overdue: 1-30 -> 85, 31-60 -> 60, 61-90 -> 40, 91+ -> 25
  -25 if the invoice is disputed (disputes pause collections)
  -15 if a promise to pay was broken
  +10 if a promise to pay is currently outstanding (not yet due)
  -10 if there has been no contact in 14+ days
  + (account on-time rate - 70) * 0.3, clamped to [-15, +15]
  -8 if the invoice total exceeds 2000 (large balances settle slower)
  clamped to [0, 100].

Segments (in order — first match wins):
  disputed            -> HOLD_DISPUTE (no chase while disputed)
  broken promise      -> ESCALATE (trust is spent; final notice)
  outstanding promise -> PROMISE (monitor; do not chase before its date)
  score >= 70         -> NUDGE (polite reminder)
  score >= 40         -> CALL (phone follow-up)
  otherwise           -> ESCALATE (final notice / referral review)

Escalation ladder by days overdue:
  1-30  -> reminder email
  31-60 -> phone call + email
  61-90 -> final notice before referral
  91+   -> referral review (agency / legal, human decision only)
"""

from __future__ import annotations


def aging_bucket(days_overdue: int) -> str:
    if days_overdue <= 30:
        return "1-30"
    if days_overdue <= 60:
        return "31-60"
    if days_overdue <= 90:
        return "61-90"
    return "91+"


def base_score(days_overdue: int) -> int:
    if days_overdue <= 30:
        return 85
    if days_overdue <= 60:
        return 60
    if days_overdue <= 90:
        return 40
    return 25


def pay_score(days_overdue: int, disputed: bool, promise_broken: bool,
              promise_outstanding: bool, days_since_contact: int,
              account_on_time_rate: float, total: float) -> int:
    score = base_score(days_overdue)
    if disputed:
        score -= 25
    if promise_broken:
        score -= 15
    if promise_outstanding:
        score += 10
    if days_since_contact >= 14:
        score -= 10
    history = (account_on_time_rate - 70) * 0.3
    history = max(-15.0, min(15.0, history))
    score += history
    if total > 2000:
        score -= 8
    return max(0, min(100, round(score)))


def segment(days_overdue: int, disputed: bool, promise_broken: bool,
            promise_outstanding: bool, days_since_contact: int,
            account_on_time_rate: float, total: float) -> str:
    if disputed:
        return "HOLD_DISPUTE"
    if promise_broken:
        return "ESCALATE"
    if promise_outstanding:
        return "PROMISE"
    score = pay_score(days_overdue, disputed, promise_broken,
                      promise_outstanding, days_since_contact,
                      account_on_time_rate, total)
    if score >= 70:
        return "NUDGE"
    if score >= 40:
        return "CALL"
    return "ESCALATE"


def escalation_step(days_overdue: int) -> str:
    if days_overdue <= 30:
        return "reminder email"
    if days_overdue <= 60:
        return "phone call + email"
    if days_overdue <= 90:
        return "final notice before referral"
    return "referral review (agency / legal, human decision only)"


def draft_subject(seg: str, invoice_no: str) -> str:
    return {
        "NUDGE": f"Friendly reminder: invoice {invoice_no} is past due",
        "CALL": f"Following up: invoice {invoice_no} needs your attention",
        "ESCALATE": f"Final notice: invoice {invoice_no} — action required",
        "PROMISE": f"Thank you — payment promised for invoice {invoice_no}",
        "HOLD_DISPUTE": f"On hold: invoice {invoice_no} under dispute review",
    }[seg]


def draft_body(seg: str, invoice_no: str, total: float, days_overdue: int,
               promise_date: str | None) -> str:
    amount = f"£{total:,.2f}"
    if seg == "NUDGE":
        return (f"Hi, a quick note that invoice {invoice_no} for {amount} "
                f"is {days_overdue} days past due. If payment is already on "
                f"its way, please ignore this note. Otherwise, could you "
                f"confirm when we can expect it?")
    if seg == "CALL":
        return (f"Call script — invoice {invoice_no} ({amount}, "
                f"{days_overdue} days overdue): confirm receipt, ask what "
                f"is blocking payment, agree a dated promise to pay, and "
                f"log the outcome before hanging up.")
    if seg == "ESCALATE":
        return (f"Final notice — invoice {invoice_no} for {amount} is "
                f"{days_overdue} days past due. Please arrange payment or "
                f"contact us within 7 days, or the account will be reviewed "
                f"for referral. A human must approve this notice before it "
                f"is sent.")
    if seg == "PROMISE":
        return (f"Thank you for promising payment on invoice {invoice_no} "
                f"({amount}) by {promise_date or 'the agreed date'}. We "
                f"will check in only if that date passes unpaid — no chase "
                f"before then.")
    return (f"Invoice {invoice_no} ({amount}) is on dispute hold: no "
            f"collection contact until the dispute is resolved. Internal "
            f"next step is to resolve the disputed item, not to chase "
            f"the customer.")
