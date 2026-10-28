import { useState } from "react";
import { fmtGBP, type CollectDeskData } from "../data";
import { SegmentBadge } from "./shared";

export default function DraftsView({ data }: { data: CollectDeskData }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ }
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };
  return (
    <div>
      <div className="card">
        <h2>Drafts — human-gated</h2>
        <p className="muted small">
          Every invoice gets one draft: a reminder, a call script, a final
          notice, a promise acknowledgement, or a dispute-hold note. Every
          draft sits at <b>pending human approval</b>. CollectDesk never
          sends anything; the send is always a person's decision.
        </p>
      </div>
      {data.queue.slice(0, 60).map((r) => (
        <div className="card" key={r.invoice_no}>
          <div className="match-head">
            <span><b className="mono">{r.invoice_no}</b> · account {r.cust} · {fmtGBP(r.total)} · {r.days_overdue}d overdue</span>
            <SegmentBadge segment={r.segment} />
          </div>
          <p><b>{r.draft_subject}</b></p>
          <p>{r.draft_body}</p>
          <p className="muted small">Gate: pending human approval · sent: no</p>
          <button className="btn" onClick={() => copy(r.invoice_no, `${r.draft_subject}\n\n${r.draft_body}`)}>
            {copied === r.invoice_no ? "Copied" : "Copy draft"}
          </button>
        </div>
      ))}
      <p className="muted small">Showing drafts for the first 60 queue rows; the full queue carries a draft per invoice.</p>
    </div>
  );
}
