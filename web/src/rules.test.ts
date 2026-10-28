import { describe, expect, it } from "vitest";
import { agingBucket, payScore, segment } from "./rules";
import type { TestVector } from "./types";
import vectors from "../../data/test-vectors.json";

describe("shared contract (data/test-vectors.json)", () => {
  const rows = vectors as TestVector[];
  it.each(rows.map((v) => [v.name, v]))("%s", (_name, v) => {
    expect(agingBucket(v.days_overdue)).toBe(v.expected_bucket);
    expect(payScore(v.days_overdue, v.disputed, v.promise_broken,
      v.promise_outstanding, v.days_since_contact,
      v.account_on_time_rate, v.total)).toBe(v.expected_score);
    expect(segment(v.days_overdue, v.disputed, v.promise_broken,
      v.promise_outstanding, v.days_since_contact,
      v.account_on_time_rate, v.total)).toBe(v.expected_segment);
  });
  it("bucket boundaries", () => {
    expect(agingBucket(30)).toBe("1-30");
    expect(agingBucket(31)).toBe("31-60");
    expect(agingBucket(90)).toBe("61-90");
    expect(agingBucket(91)).toBe("91+");
  });
  it("score clamps to 0..100", () => {
    expect(payScore(200, true, true, false, 30, 0, 99999)).toBe(0);
    expect(payScore(1, false, false, true, 0, 100, 10)).toBe(100);
  });
});
