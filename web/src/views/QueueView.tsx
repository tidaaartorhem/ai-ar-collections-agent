import { useMemo, useState } from "react";
import { fmtGBP, type CollectDeskData } from "../data";
import { SegmentBadge, ScoreBar } from "./shared";

export default function QueueView({ data }: { data: CollectDeskData }) {
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState("ALL");
  const [bucket, setBucket] = useState("ALL");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.queue.filter((r) =>
      (seg === "ALL" || r.segment === seg) &&
      (bucket === "ALL" || r.bucket === bucket) &&
      (needle === "" ||
        r.invoice_no.includes(needle) || r.cust.includes(needle) ||
        r.country.toLowerCase().includes(needle)));
  }, [data, q, seg, bucket]);

  return (
    <div className="card">
      <h2>Morning queue — {rows.length} invoices</h2>
      <p className="muted small">
        Worked book: top 150 accounts by open balance. Sorted lowest
        pay-likelihood first, the accounts most at risk of never paying.
      </p>
      <div className="filters">
        <input className="input" placeholder="Search invoice, account, country…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={seg} onChange={(e) => setSeg(e.target.value)}>
          <option value="ALL">All segments</option>
          {["NUDGE", "CALL", "ESCALATE", "PROMISE", "HOLD_DISPUTE"].map((s) => (
            <option key={s} value={s}>{s}</option>))}
        </select>
        <select className="input" value={bucket} onChange={(e) => setBucket(e.target.value)}>
          <option value="ALL">All aging buckets</option>
          {["1-30", "31-60", "61-90"].map((b) => (
            <option key={b} value={b}>{b} days</option>))}
        </select>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr>
            <th>Invoice</th><th>Account</th><th>Due</th><th>Overdue</th>
            <th>Amount</th><th>Pay score</th><th>Segment</th><th>Next step</th>
          </tr></thead>
          <tbody>
            {rows.slice(0, 200).map((r) => (
              <tr key={r.invoice_no}>
                <td className="mono">{r.invoice_no}</td>
                <td className="mono">{r.cust}</td>
                <td>{r.due_date}</td>
                <td>{r.days_overdue}d <span className="muted">({r.bucket})</span></td>
                <td>{fmtGBP(r.total)}</td>
                <td><ScoreBar value={r.pay_score} /></td>
                <td><SegmentBadge segment={r.segment} /></td>
                <td>{r.escalation}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Showing first 200 of {rows.length} matching rows.</p>
    </div>
  );
}
