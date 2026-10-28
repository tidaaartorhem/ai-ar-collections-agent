import { useState } from "react";
import { fmtGBP, useCollectDeskData } from "./data";
import QueueView from "./views/QueueView";
import AccountsView from "./views/AccountsView";
import DraftsView from "./views/DraftsView";
import PasteView from "./views/PasteView";
import ReplayView from "./views/ReplayView";
import "./styles.css";

const REPO_URL = "https://github.com/tidaaartorhem/ai-ar-collections-agent";
const LIVE_URL = "https://ai-ar-collections-agent.web.app";

type Tab = "queue" | "accounts" | "drafts" | "paste" | "replay";

const TABS: { id: Tab; label: string }[] = [
  { id: "queue", label: "Morning queue" },
  { id: "accounts", label: "Accounts" },
  { id: "drafts", label: "Drafts (human-gated)" },
  { id: "paste", label: "Score an invoice" },
  { id: "replay", label: "Replay" },
];

export default function App() {
  const { data, error } = useCollectDeskData();
  const [tab, setTab] = useState<Tab>("queue");

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1><span className="mark">Cd</span>CollectDesk</h1>
          <p className="sub">
            The AR collections desk: a LangGraph workflow that ages overdue
            invoices, scores pay-likelihood with a disclosed formula, routes
            each invoice to one action, and drafts the follow-up — behind a
            hard human gate. Nothing is ever sent automatically.
          </p>
          <div className="badges">
            <span className="badge neutral"><a href={REPO_URL} target="_blank" rel="noreferrer">GitHub repo</a></span>
            <span className="badge neutral"><a href={LIVE_URL} target="_blank" rel="noreferrer">Live site</a></span>
          </div>
        </div>
      </header>

      <div className="disclosure">
        <b>What is real, what is seeded.</b> Invoice amounts, dates and
        accounts are real UCI Online Retail records (CC BY 4.0). Payment
        outcomes, Net 30 terms, contact history, promises and dispute flags
        are a seeded stand-in for an SME's ERP/CRM feed, which the public
        corpus does not contain — deterministic, disclosed in the README,
        and never presented as a real company's records.
      </div>

      {error && <div className="card error">Failed to load data: {error}</div>}
      {!data && !error && <div className="card">Loading…</div>}

      {data && (
        <>
          <div className="stat-grid">
            <div className="stat"><div className="stat-num">{data.summary.worked_book.invoices}</div><div className="stat-label">invoices queued</div></div>
            <div className="stat"><div className="stat-num">{fmtGBP(data.summary.worked_book.value)}</div><div className="stat-label">queued value</div></div>
            <div className="stat"><div className="stat-num">{data.summary.segments.ESCALATE?.count ?? 0}</div><div className="stat-label">need escalation</div></div>
            <div className="stat"><div className="stat-num">{data.summary.broken_promises}</div><div className="stat-label">broken promises</div></div>
            <div className="stat"><div className="stat-num">{data.summary.disputed}</div><div className="stat-label">on dispute hold</div></div>
          </div>

          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "queue" && <QueueView data={data} />}
          {tab === "accounts" && <AccountsView data={data} />}
          {tab === "drafts" && <DraftsView data={data} />}
          {tab === "paste" && <PasteView />}
          {tab === "replay" && <ReplayView data={data} />}

          <footer className="footer muted small">
            Replay date Monday 2011-11-28 · Terms Net 30 (seeded) · Workflow:
            LangGraph StateGraph age → score → segment → draft → gate ·
            Deterministic rules, no LLM calls, no automatic sends.
          </footer>
        </>
      )}
    </div>
  );
}
