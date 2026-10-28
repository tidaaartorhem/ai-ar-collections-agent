import { useEffect, useState } from "react";
import type { AccountRow, QueueRow, Summary, TestVector } from "./types";

export interface CollectDeskData {
  summary: Summary;
  queue: QueueRow[];
  accounts: AccountRow[];
  vectors: TestVector[];
}

async function get<T>(name: string): Promise<T> {
  const res = await fetch(`data/${name}.json`);
  if (!res.ok) throw new Error(`failed to load data/${name}.json`);
  return res.json() as Promise<T>;
}

/** Loads the pipeline payloads (written by scripts/build_collectdesk.py). */
export function useCollectDeskData() {
  const [data, setData] = useState<CollectDeskData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [summary, queue, accounts, vectors] = await Promise.all([
          get<Summary>("summary"),
          get<QueueRow[]>("queue"),
          get<AccountRow[]>("accounts"),
          get<TestVector[]>("test-vectors"),
        ]);
        setData({ summary, queue, accounts, vectors });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return { data, error };
}

export const fmtGBP = (n: number) =>
  "£" + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
