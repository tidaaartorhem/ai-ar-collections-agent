/** TypeScript mirror of src/collectdesk/rules.py — must agree exactly.
 * Python's round() is banker's rounding (half to even); JS Math.round
 * is half up, so roundHalfEven is used wherever Python rounds. The
 * shared contract is data/test-vectors.json, asserted by both pytest
 * and vitest. */

export function roundHalfEven(x: number): number {
  const f = Math.floor(x);
  const diff = x - f;
  if (diff < 0.5) return f;
  if (diff > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

export function agingBucket(daysOverdue: number): string {
  if (daysOverdue <= 30) return "1-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "91+";
}

export function baseScore(daysOverdue: number): number {
  if (daysOverdue <= 30) return 85;
  if (daysOverdue <= 60) return 60;
  if (daysOverdue <= 90) return 40;
  return 25;
}

export function payScore(
  daysOverdue: number,
  disputed: boolean,
  promiseBroken: boolean,
  promiseOutstanding: boolean,
  daysSinceContact: number,
  accountOnTimeRate: number,
  total: number,
): number {
  let score = baseScore(daysOverdue);
  if (disputed) score -= 25;
  if (promiseBroken) score -= 15;
  if (promiseOutstanding) score += 10;
  if (daysSinceContact >= 14) score -= 10;
  const history = Math.max(-15, Math.min(15, (accountOnTimeRate - 70) * 0.3));
  score += history;
  if (total > 2000) score -= 8;
  return Math.max(0, Math.min(100, roundHalfEven(score)));
}

export function segment(
  daysOverdue: number,
  disputed: boolean,
  promiseBroken: boolean,
  promiseOutstanding: boolean,
  daysSinceContact: number,
  accountOnTimeRate: number,
  total: number,
): string {
  if (disputed) return "HOLD_DISPUTE";
  if (promiseBroken) return "ESCALATE";
  if (promiseOutstanding) return "PROMISE";
  const score = payScore(daysOverdue, disputed, promiseBroken,
    promiseOutstanding, daysSinceContact, accountOnTimeRate, total);
  if (score >= 70) return "NUDGE";
  if (score >= 40) return "CALL";
  return "ESCALATE";
}

export function escalationStep(daysOverdue: number): string {
  if (daysOverdue <= 30) return "reminder email";
  if (daysOverdue <= 60) return "phone call + email";
  if (daysOverdue <= 90) return "final notice before referral";
  return "referral review (agency / legal, human decision only)";
}

export const SEGMENT_LABEL: Record<string, string> = {
  NUDGE: "Nudge — reminder",
  CALL: "Call — phone follow-up",
  ESCALATE: "Escalate — final notice",
  PROMISE: "Promise — monitor",
  HOLD_DISPUTE: "Hold — dispute",
};
