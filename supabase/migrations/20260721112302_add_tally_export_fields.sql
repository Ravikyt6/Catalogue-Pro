/*
# Add full Tally SALE ASPL export fields to sales, purchases, and item tables

## Purpose
The Voucher Detail screen must show ALL fields parsed from the Tally Sale export.
Currently the schema is missing: buyer address, consignee, state, packing charges,
CGST/SGST/IGST split, outstanding/received/due, per-item unit and tax_amount.

## Changes

### sales table — new columns
- buyer_address (text, nullable) — full buyer/billing address from Tally
- consignee (text, nullable) — consignee / ship-to name
- state (text, nullable) — party state code/name
- packing_charges (numeric, default 0) — packing charges line
- cgst (numeric, default 0) — Central GST amount
- sgst (numeric, default 0) — State GST amount
- igst (numeric, default 0) — Integrated GST amount
- outstanding (numeric, default 0) — amount still outstanding
- received (numeric, default 0) — amount received against this invoice
- due (numeric, default 0) — amount due

### purchases table — same columns added for symmetry
(same list as sales)

### sale_items table — new columns
- unit (text, nullable) — unit of measurement (Nos, Kgs, etc.)
- tax_amount (numeric, default 0) — per-item tax amount

### purchase_items table — new columns
- unit (text, nullable)
- tax_amount (numeric, default 0)

### parties table — new column
- state (text, nullable) — state code/name from Tally

All additions are additive (ALTER TABLE ADD COLUMN IF NOT EXISTS). No existing
columns are dropped or type-changed. No data is lost.
*/

-- sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS buyer_address text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS consignee text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS packing_charges numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cgst numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sgst numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS igst numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS outstanding numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS received numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS due numeric DEFAULT 0;

-- purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS buyer_address text;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS consignee text;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS packing_charges numeric DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS cgst numeric DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS sgst numeric DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS igst numeric DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS outstanding numeric DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS received numeric DEFAULT 0;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS due numeric DEFAULT 0;

-- sale_items
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;

-- purchase_items
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0;

-- parties
ALTER TABLE parties ADD COLUMN IF NOT EXISTS state text;
