import { useState } from "react";
import { agingBucket, escalationStep, payScore, segment } from "../rules";
import { SegmentBadge, ScoreBar } from "./shared";

export default function PasteView() {
  const [days, setDays] = useState(45);
  const [total, setTotal] = useState(400);
  const [rate, setRate] = useState(75);
  const [contact, setContact] = useState(5);
  const [disputed, setDisputed] = useState(false);
  const [broken, setBroken] = useState(false);
  const [outstanding, setOutstanding] = useState(false);

  const score = payScore(days, disputed, broken, outstanding, contact, rate, total);
  const seg = segment(days, disputed, broken, outstanding, contact, rate, total);

  return (
    <div className="card">
      <h2>Score an invoice — the same rules, in your browser</h2>
      <p className="muted small">
        The TypeScript mirror of the Python pipeline. Change the inputs and
        the score, segment and next step update live — no server, no LLM.
      </p>
      <div className="paste-form">
        <label>Days overdue <input className="input" type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
        <label>Invoice total (£) <input className="input" type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} /></label>
        <label>Account on-time rate (%) <input className="input" type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label>
        <label>Days since last contact <input className="input" type="number" value={contact} onChange={(e) => setContact(Number(e.target.value))} /></label>
        <label><input type="checkbox" checked={disputed} onChange={(e) => setDisputed(e.target.checked)} /> Disputed</label>
        <label><input type="checkbox" checked={broken} onChange={(e) => setBroken(e.target.checked)} /> Promise broken</label>
        <label><input type="checkbox" checked={outstanding} onChange={(e) => setOutstanding(e.target.checked)} /> Promise outstanding</label>
      </div>
      <p>Aging bucket: <b>{agingBucket(days)}</b></p>
      <p>Pay-likelihood score: <ScoreBar value={score} /></p>
      <p>Segment: <SegmentBadge segment={seg} /></p>
      <p>Next step: <b>{escalationStep(days)}</b></p>
      <p className="muted small">
        Score formula: bucket base (85 / 60 / 40 / 25) −25 disputed −15 broken
        promise +10 outstanding promise −10 no contact in 14+ days
        ±15 account history −8 over £2,000, clamped 0–100.
      </p>
    </div>
  );
}
