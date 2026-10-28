export interface QueueRow {
  invoice_no: string;
  cust: string;
  country: string;
  issue_date: string;
  due_date: string;
  days_overdue: number;
  total: number;
  lines: number;
  bucket: string;
  pay_score: number;
  segment: string;
  escalation: string;
  disputed: boolean;
  promise_broken: boolean;
  promise_outstanding: boolean;
  promise_date: string | null;
  days_since_contact: number;
  account_on_time_rate: number;
  draft_subject: string;
  draft_body: string;
  gate: string;
  sent: boolean;
}

export interface AccountRow {
  cust: string;
  country: string;
  open_invoices: number;
  open_total: number;
  oldest_overdue: number;
  worst_score: number;
  disputed: number;
  broken_promises: number;
  segments: Record<string, number>;
}

export interface Summary {
  replay_date: string;
  terms: string;
  window: [string, string];
  full_open_book: { invoices: number; value: number; accounts: number };
  worked_book: { accounts: number; invoices: number; value: number };
  buckets: Record<string, { count: number; value: number }>;
  segments: Record<string, { count: number; value: number }>;
  broken_promises: number;
  disputed: number;
  graph: string;
  human_gate: string;
}

export interface TestVector {
  name: string;
  days_overdue: number;
  disputed: boolean;
  promise_broken: boolean;
  promise_outstanding: boolean;
  days_since_contact: number;
  account_on_time_rate: number;
  total: number;
  expected_bucket: string;
  expected_score: number;
  expected_segment: string;
}
