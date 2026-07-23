-- Add import_batch_id columns to voucher tables (safe, idempotent)
alter table sales add column if not exists import_batch_id text;
alter table purchases add column if not exists import_batch_id text;
alter table credit_notes add column if not exists import_batch_id text;
alter table debit_notes add column if not exists import_batch_id text;
alter table receipts add column if not exists import_batch_id text;
alter table payments add column if not exists import_batch_id text;
alter table journal_entries add column if not exists import_batch_id text;

-- Unique dedup indexes
create unique index if not exists sales_invoice_uniq on sales (invoice_number, financial_year, company);
create unique index if not exists purchases_invoice_uniq on purchases (invoice_number, financial_year, company);
create index if not exists ledger_party_date_idx on ledger_entries (party_id, voucher_date, created_at);
create index if not exists import_batch_idx on import_history (imported_at);
