import { fmtGBP, type CollectDeskData } from "../data";

export default function AccountsView({ data }: { data: CollectDeskData }) {
  return (
    <div className="card">
      <h2>Accounts — the worked book</h2>
      <p className="muted small">
        150 accounts ranked by open balance. Broken promises and disputes
        are called out because they change the next action, not just the score.
      </p>
      <div className="table-wrap">
        <table className="table">
          <thead><tr>
            <th>Account</th><th>Country</th><th>Open invoices</th>
            <th>Open total</th><th>Oldest overdue</th><th>Worst score</th>
            <th>Disputed</th><th>Broken promises</th>
          </tr></thead>
          <tbody>
            {data.accounts.map((a) => (
              <tr key={a.cust}>
                <td className="mono">{a.cust}</td>
                <td>{a.country}</td>
                <td>{a.open_invoices}</td>
                <td>{fmtGBP(a.open_total)}</td>
                <td>{a.oldest_overdue}d</td>
                <td>{a.worst_score}</td>
                <td>{a.disputed}</td>
                <td>{a.broken_promises}</td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
