import { fmtGBP, type CollectDeskData } from "../data";

const STEPS = [
  ["ingest", "Aggregate 19,960 real UCI Online Retail invoices to invoice level; keep the 2011-08-01..2011-10-28 window."],
  ["age", "Apply Net 30 terms, compute due dates against the Monday 2011-11-28 replay date, and bucket every invoice 1-30 / 31-60 / 61-90 days overdue."],
  ["score", "Score each open invoice 0-100 with the disclosed formula: bucket base, dispute, promise, contact-recency, account history and size adjustments."],
  ["segment", "Route each invoice to exactly one action: Nudge, Call, Escalate, Promise (monitor) or Hold (dispute)."],
  ["draft", "Generate one draft per invoice — reminder, call script, final notice, promise note or dispute-hold note."],
  ["gate", "Mark every draft pending human approval. Nothing is sent by the workflow, ever."],
];

export default function ReplayView({ data }: { data: CollectDeskData }) {
  const s = data.summary;
  return (
    <div className="card">
      <h2>Replay — Monday 2011-11-28, step by step</h2>
      <p className="muted small">
        The LangGraph workflow (age → score → segment → draft → gate) as it
        ran over the worked book. Every figure below is pipeline output, not
        hand-written copy.
      </p>
      <ul>
        {STEPS.map(([name, text]) => (
          <li key={name}><b className="mono">{name}</b> — {text}</li>
        ))}
      </ul>
      <div className="stat-grid">
        <div className="stat"><div className="stat-num">{s.worked_book.invoices}</div><div className="stat-label">invoices in worked book</div></div>
        <div className="stat"><div className="stat-num">{fmtGBP(s.worked_book.value)}</div><div className="stat-label">worked-book value</div></div>
        <div className="stat"><div className="stat-num">{s.full_open_book.invoices}</div><div className="stat-label">invoices in full open book</div></div>
        <div className="stat"><div className="stat-num">{fmtGBP(s.full_open_book.value)}</div><div className="stat-label">full open-book value</div></div>
        <div className="stat"><div className="stat-num">{s.broken_promises}</div><div className="stat-label">broken promises in queue</div></div>
        <div className="stat"><div className="stat-num">{s.disputed}</div><div className="stat-label">disputed invoices on hold</div></div>
      </div>
      <h3>Segments</h3>
      <ul>
        {Object.entries(s.segments).map(([k, v]) => (
          <li key={k}><b>{k}</b>: {v.count} invoices, {fmtGBP(v.value)}</li>))}
      </ul>
      <h3>Aging buckets</h3>
      <ul>
        {Object.entries(s.buckets).map(([k, v]) => (
          <li key={k}><b>{k} days</b>: {v.count} invoices, {fmtGBP(v.value)}</li>))}
      </ul>
      <p className="muted small">
        Shared contract: {data.vectors.length} test vectors asserted by both
        pytest and vitest, so the Python pipeline and the browser agree exactly.
      </p>
    </div>
  );
}
