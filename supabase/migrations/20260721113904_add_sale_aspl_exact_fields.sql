/*
# Add Tally SALE ASPL exact-mapping fields + import tracking columns

## Purpose
The parser must store every column from the Tally SALE ASPL export with exact
mappings:
  Value           -> Taxable Value
  Gross Total     -> Gross Invoice Total
  SALE            -> Sale Amount
  OUTPUT IGST 5%  -> IGST Amount (already have igst, but add sale_amount + gross_invoice_total + taxable_value)
Also track cancelled and duplicate counts in import_history.

## Changes

### sales / purchases — new columns
- sale_amount (numeric, default 0) — the SALE column total
- gross_invoice_total (numeric, default 0) — Gross Total column
- taxable_value (numeric, default 0) — Value column (sum of taxable values)

### import_history — new columns
- rows_cancelled (integer, default 0) — count of cancelled invoices skipped
- rows_duplicates (integer, default 0) — count of duplicate vouchers skipped

All additive. No data lost.
*/

ALTER TABLE sales ADD COLUMN IF NOT EXISTS sale_amount numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS gross_invoice_total numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS taxable_value numeric DEFAULT 0;

ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sale_amount numeric DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS gross_invoice_total numeric DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS taxable_value numeric DEFAULT 0;

ALTER TABLE import_history ADD COLUMN IF NOT EXISTS rows_cancelled integer DEFAULT 0;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS rows_duplicates integer DEFAULT 0;
