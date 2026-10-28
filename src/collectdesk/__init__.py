"""CollectDesk — the AR collections desk (LangGraph workflow, deterministic rules)."""

from .rules import (aging_bucket, base_score, draft_body, draft_subject,
                    escalation_step, pay_score, segment)

__all__ = ["aging_bucket", "base_score", "draft_body", "draft_subject",
           "escalation_step", "pay_score", "segment"]
