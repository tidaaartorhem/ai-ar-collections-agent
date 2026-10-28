# Data provenance

## Real: UCI Online Retail invoice corpus

Invoice numbers, dates, customer accounts, countries and line totals
are aggregated unedited from the UCI Online Retail dataset (Daqing
Chen, Sai Liang Sain, and Kun Guo, 2015; CC BY 4.0;
https://doi.org/10.24432/C5BW33), via the cleaned line rows
(`invoice_lines.csv`, 19,960 invoices) produced by the sibling
ai-invoice-processing-agent build. Cancelled invoices (numbers starting
with `C`) are dropped, as in that build.

## Seeded: the ERP/CRM overlay (not real company data)

The corpus records sales, not payments, terms, contacts, promises or
disputes. Those fields are a deterministic stand-in, generated in
`scripts/build_collectdesk.py` as SHA-256 hashes of the invoice number:

- payment outcome: paid iff `hash("paid"+invoice) % 100 < 55 + hash("rate"+cust) % 41`
- terms: uniform Net 30 for every account
- days since last contact: `hash("contact"+invoice) % 26`
- disputed: `hash("dispute"+invoice) % 100 < 8`
- promise broken (12%) / outstanding (20%) / none, with dates derived
  from the replay date
- account on-time rate: paid share of that account's pre-window
  invoices under the same seeded ledger (fallback 70 with no history)

Re-running the script reproduces identical output. The UI and README
label this overlay wherever its numbers appear.

## Replay

Monday 2011-11-28. Window: invoices issued 2011-08-01..2011-10-28, so
all due dates (issue + 30 days) fall before the replay date. Worked
book: top 150 accounts by open balance (354 invoices, £505,558.50);
full open book (1,243 invoices, £764,632.54) is reported in
summary.json so the truncation is visible.
