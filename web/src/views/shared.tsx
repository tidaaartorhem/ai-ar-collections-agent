import { SEGMENT_LABEL } from "../rules";

const SEG_CLASS: Record<string, string> = {
  NUDGE: "ok",
  CALL: "warn",
  ESCALATE: "bad",
  PROMISE: "neutral",
  HOLD_DISPUTE: "neutral",
};

export function SegmentBadge({ segment }: { segment: string }) {
  return (
    <span className={`pill ${SEG_CLASS[segment] ?? "neutral"}`}>
      {SEGMENT_LABEL[segment] ?? segment}
    </span>
  );
}

export function ScoreBar({ value }: { value: number }) {
  return (
    <span className="confbar">
      <span className="confbar-track">
        <span className="confbar-fill" style={{ width: `${value}%` }} />
      </span>
      <span className="confbar-num mono">{value}</span>
    </span>
  );
}
