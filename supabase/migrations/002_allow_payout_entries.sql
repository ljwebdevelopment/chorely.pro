-- Allow negative amount_cents so payout entries can be recorded as negative values.
-- Payouts are inserted into earnings_ledger with a negative amount_cents, which
-- automatically reduces the running balance for that child.
alter table public.earnings_ledger
  drop constraint if exists earnings_ledger_amount_cents_check;
