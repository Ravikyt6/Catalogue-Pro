/*
# ERP Billing & Accounting — full normalized schema

## Overview
Creates the complete normalized table set for a Tally/Vyapar-style billing &
accounting module: parties, addresses, sales (+items), purchases (+items),
credit notes (+items), debit notes (+items), receipts, payments, journals,
ledger entries, and import history. Single-tenant (no auth) — the frontend
operates as the anon role, so every policy lists `anon, authenticated`.

## New tables
1. `parties` — customers & suppliers. Dedup by gstin or lowercased name.
   - type: customer | supplier | both
   - opening_balance / opening_balance_type (dr/cr) seed the ledger.
2. `party_addresses` — billing & shipping addresses per party.
3. `sales` + `sale_items` — sales invoices and line items.
4. `purchases` + `purchase_items` — purchase invoices and line items.
5. `credit_notes` + `credit_note_items` — sales returns; may link to a sale.
6. `debit_notes` + `debit_note_items` — purchase returns; link to a party.
7. `receipts` — money received against a party (reduces receivable).
8. `payments` — money paid to a party (reduces payable).
9. `journal_entries` — optional manual journal vouchers.
10. `ledger_entries` — the accounting ledger. Every voucher inserts rows here.
    - debit / credit are numeric; running balance is computed in the UI.
    - voucher_type + voucher_number + financial_year + company form the
      duplicate-detection key for imports.
11. `import_history` — log of every import batch with rows/failed/skipped and
    a rollback marker (`rolled_back`).

## Security
- RLS enabled on every table.
- All policies are `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is an intentionally shared single-tenant app (no sign-in screen).

## Notes
1. All money columns are `numeric(18,2)` to avoid float drift.
2. `financial_year` is stored as text like '2024-25' for natural Tally mapping.
3. `company` defaults to 'Default Company' — import batches may set it.
4. Every voucher table has a `voucher_type` + `voucher_number` + `financial_year`
   + `company` so the import engine can detect duplicates uniformly.
5. `ledger_entries.party_id` is nullable for journals that are not party-linked.
*/

CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gstin text,
  phone text,
  email text,
  type text NOT NULL DEFAULT 'customer' CHECK (type IN ('customer','supplier','both')),
  opening_balance numeric(18,2) NOT NULL DEFAULT 0,
  opening_balance_type text NOT NULL DEFAULT 'dr' CHECK (opening_balance_type IN ('dr','cr')),
  company text NOT NULL DEFAULT 'Default Company',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS parties_gstin_uniq ON parties (gstin, company) WHERE gstin IS NOT NULL AND gstin <> '';
CREATE UNIQUE INDEX IF NOT EXISTS parties_name_uniq ON parties (lower(name), company);

CREATE TABLE IF NOT EXISTS party_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'billing' CHECK (kind IN ('billing','shipping')),
  line1 text, line2 text, city text, state text, pincode text, country text DEFAULT 'India',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_party_addresses_party ON party_addresses(party_id);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  financial_year text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  discount numeric(18,2) NOT NULL DEFAULT 0,
  tax numeric(18,2) NOT NULL DEFAULT 0,
  shipping numeric(18,2) NOT NULL DEFAULT 0,
  round_off numeric(18,2) NOT NULL DEFAULT 0,
  grand_total numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid','partial','adjusted','cancelled')),
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sales_voucher_uniq ON sales (invoice_number, financial_year, company);
CREATE INDEX IF NOT EXISTS idx_sales_party ON sales(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(invoice_date);

CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  name text NOT NULL,
  hsn text,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  rate numeric(18,2) NOT NULL DEFAULT 0,
  discount numeric(18,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  amount numeric(18,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  invoice_date date NOT NULL,
  financial_year text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  discount numeric(18,2) NOT NULL DEFAULT 0,
  tax numeric(18,2) NOT NULL DEFAULT 0,
  shipping numeric(18,2) NOT NULL DEFAULT 0,
  round_off numeric(18,2) NOT NULL DEFAULT 0,
  grand_total numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid','unpaid','partial','adjusted','cancelled')),
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS purchases_voucher_uniq ON purchases (invoice_number, financial_year, company);
CREATE INDEX IF NOT EXISTS idx_purchases_party ON purchases(party_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(invoice_date);

CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  name text NOT NULL,
  hsn text,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  rate numeric(18,2) NOT NULL DEFAULT 0,
  discount numeric(18,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  amount numeric(18,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);

CREATE TABLE IF NOT EXISTS credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  voucher_number text NOT NULL,
  voucher_date date NOT NULL,
  financial_year text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  amount numeric(18,2) NOT NULL DEFAULT 0,
  tax numeric(18,2) NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'adjusted' CHECK (status IN ('paid','unpaid','partial','adjusted','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS credit_notes_voucher_uniq ON credit_notes (voucher_number, financial_year, company);
CREATE INDEX IF NOT EXISTS idx_credit_notes_party ON credit_notes(party_id);

CREATE TABLE IF NOT EXISTS credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  rate numeric(18,2) NOT NULL DEFAULT 0,
  discount numeric(18,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  amount numeric(18,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_credit_note_items ON credit_note_items(credit_note_id);

CREATE TABLE IF NOT EXISTS debit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  purchase_id uuid REFERENCES purchases(id) ON DELETE SET NULL,
  voucher_number text NOT NULL,
  voucher_date date NOT NULL,
  financial_year text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  amount numeric(18,2) NOT NULL DEFAULT 0,
  tax numeric(18,2) NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'adjusted' CHECK (status IN ('paid','unpaid','partial','adjusted','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS debit_notes_voucher_uniq ON debit_notes (voucher_number, financial_year, company);
CREATE INDEX IF NOT EXISTS idx_debit_notes_party ON debit_notes(party_id);

CREATE TABLE IF NOT EXISTS debit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_id uuid NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric(18,3) NOT NULL DEFAULT 0,
  rate numeric(18,2) NOT NULL DEFAULT 0,
  discount numeric(18,2) NOT NULL DEFAULT 0,
  tax_percent numeric(5,2) NOT NULL DEFAULT 0,
  amount numeric(18,2) NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_debit_note_items ON debit_note_items(debit_note_id);

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  voucher_number text NOT NULL,
  voucher_date date NOT NULL,
  financial_year text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  amount numeric(18,2) NOT NULL DEFAULT 0,
  mode text,
  against_invoice text,
  notes text,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','unpaid','partial','adjusted','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS receipts_voucher_uniq ON receipts (voucher_number, financial_year, company);
CREATE INDEX IF NOT EXISTS idx_receipts_party ON receipts(party_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE RESTRICT,
  voucher_number text NOT NULL,
  voucher_date date NOT NULL,
  financial_year text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  amount numeric(18,2) NOT NULL DEFAULT 0,
  mode text,
  against_invoice text,
  notes text,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','unpaid','partial','adjusted','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_voucher_uniq ON payments (voucher_number, financial_year, company);
CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id);

CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid REFERENCES parties(id) ON DELETE SET NULL,
  voucher_number text NOT NULL,
  voucher_date date NOT NULL,
  financial_year text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  debit_account text,
  credit_account text,
  amount numeric(18,2) NOT NULL DEFAULT 0,
  narration text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS journal_voucher_uniq ON journal_entries (voucher_number, financial_year, company);
CREATE INDEX IF NOT EXISTS idx_journal_party ON journal_entries(party_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id uuid REFERENCES parties(id) ON DELETE CASCADE,
  voucher_type text NOT NULL CHECK (voucher_type IN ('sale','purchase','credit_note','debit_note','receipt','payment','journal','opening_balance')),
  voucher_id uuid,
  voucher_number text NOT NULL,
  voucher_date date NOT NULL,
  financial_year text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  particular text,
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  import_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_party ON ledger_entries(party_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(voucher_date);
CREATE INDEX IF NOT EXISTS idx_ledger_batch ON ledger_entries(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_ledger_voucher ON ledger_entries(voucher_type, voucher_number, financial_year, company);

CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  voucher_type text NOT NULL,
  company text NOT NULL DEFAULT 'Default Company',
  imported_by text NOT NULL DEFAULT 'system',
  imported_at timestamptz NOT NULL DEFAULT now(),
  rows_total int NOT NULL DEFAULT 0,
  rows_imported int NOT NULL DEFAULT 0,
  rows_failed int NOT NULL DEFAULT 0,
  rows_skipped int NOT NULL DEFAULT 0,
  rolled_back boolean NOT NULL DEFAULT false,
  notes text
);
CREATE INDEX IF NOT EXISTS idx_import_history_date ON import_history(imported_at);

-- updated_at trigger for parties
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS parties_touch ON parties;
CREATE TRIGGER parties_touch BEFORE UPDATE ON parties
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Enable RLS on every table
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Generic anon+authenticated CRUD helper. Single-tenant intentionally-shared app.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'parties','party_addresses','sales','sale_items','purchases','purchase_items',
    'credit_notes','credit_note_items','debit_notes','debit_note_items',
    'receipts','payments','journal_entries','ledger_entries','import_history'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO anon, authenticated USING (true);', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (true);', t||'_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', t||'_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', t||'_delete', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE TO anon, authenticated USING (true);', t||'_delete', t);
  END LOOP;
END $$;
