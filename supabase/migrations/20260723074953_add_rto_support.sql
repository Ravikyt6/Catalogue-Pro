/*
# Add RTO (Return To Origin) Support

1. New Columns
- `sale_items.returned_qty` (numeric, default 0) — tracks how many units of this line item have been returned via RTO.
- `item_master.stock_qty` (numeric, default 0) — current inventory quantity; RTO returns add back into this.

2. New Tables
- `rto_entries` — audit trail for every RTO event. Each row records: which sale, which sale_item, which party, item name, qty sold, qty returned, rate, return_value (proportional line amount), reason, return_date, remarks, financial_year, company, created_at.

3. New RPC Function
- `process_rto(p_sale_id uuid, p_items jsonb)` — atomically processes an RTO:
  a) Updates `sale_items.returned_qty` for each returned item.
  b) Inserts a row into `rto_entries` for each returned item.
  c) Updates `item_master.stock_qty` (adds returned qty back to inventory).
  d) Creates a single `ledger_entries` row with `voucher_type = 'rto_adjustment'` and `credit = total_return_value` — this automatically reduces the party's outstanding.
  Never deletes or modifies the original sale invoice. Everything remains auditable.

4. Security
- Enable RLS on `rto_entries`.
- Allow anon + authenticated CRUD (single-tenant, no auth).

5. Important Notes
- RTO never deletes invoices. The sale record stays intact.
- Ledger balances recalculate automatically because running balances are computed from ledger_entries rows.
- Inventory updates via item_master.stock_qty.
- Profit recalculates because it's derived from sale_items (quantity - returned_qty).
*/

-- 1. Add returned_qty to sale_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sale_items' AND column_name = 'returned_qty') THEN
    ALTER TABLE sale_items ADD COLUMN returned_qty numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Add stock_qty to item_master
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'item_master' AND column_name = 'stock_qty') THEN
    ALTER TABLE item_master ADD COLUMN stock_qty numeric NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 3. Create rto_entries table
CREATE TABLE IF NOT EXISTS rto_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sale_item_id uuid NOT NULL REFERENCES sale_items(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  item_name text NOT NULL DEFAULT '',
  quantity_sold numeric NOT NULL DEFAULT 0,
  returned_qty numeric NOT NULL DEFAULT 0,
  rate numeric NOT NULL DEFAULT 0,
  return_value numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  remarks text,
  financial_year text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT 'Default Company',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rto_entries_sale_id ON rto_entries(sale_id);
CREATE INDEX IF NOT EXISTS idx_rto_entries_party_id ON rto_entries(party_id);
CREATE INDEX IF NOT EXISTS idx_rto_entries_return_date ON rto_entries(return_date);

-- 4. Enable RLS on rto_entries
ALTER TABLE rto_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_rto" ON rto_entries;
CREATE POLICY "anon_select_rto" ON rto_entries FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_rto" ON rto_entries;
CREATE POLICY "anon_insert_rto" ON rto_entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_rto" ON rto_entries;
CREATE POLICY "anon_update_rto" ON rto_entries FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_rto" ON rto_entries;
CREATE POLICY "anon_delete_rto" ON rto_entries FOR DELETE
  TO anon, authenticated USING (true);

-- 5. Create process_rto RPC function
CREATE OR REPLACE FUNCTION process_rto(p_sale_id uuid, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item jsonb;
  v_sale RECORD;
  v_return_value numeric;
  v_total_return numeric DEFAULT 0;
  v_rto_id uuid;
  v_returned_qty numeric;
  v_rate numeric;
  v_amount numeric;
  v_qty numeric;
  v_item_name text;
  v_reason text;
  v_return_date date;
  v_remarks text;
  v_sale_item_id uuid;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_sale_item_id := (v_item->>'sale_item_id')::uuid;
    v_returned_qty := (v_item->>'returned_qty')::numeric;
    v_item_name := v_item->>'item_name';
    v_reason := v_item->>'reason';
    v_return_date := (v_item->>'return_date')::date;
    v_remarks := v_item->>'remarks';

    -- Get sale_item details
    SELECT quantity, rate, amount INTO v_qty, v_rate, v_amount
    FROM sale_items WHERE id = v_sale_item_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sale item not found: %', v_sale_item_id;
    END IF;

    -- Calculate proportional return value
    IF v_qty > 0 THEN
      v_return_value := (v_amount / v_qty) * v_returned_qty;
    ELSE
      v_return_value := v_rate * v_returned_qty;
    END IF;

    v_total_return := v_total_return + v_return_value;

    -- Update sale_items returned_qty
    UPDATE sale_items
    SET returned_qty = returned_qty + v_returned_qty
    WHERE id = v_sale_item_id;

    -- Insert rto_entries record
    INSERT INTO rto_entries (
      sale_id, sale_item_id, party_id, item_name,
      quantity_sold, returned_qty, rate, return_value,
      reason, return_date, remarks, financial_year, company
    ) VALUES (
      p_sale_id, v_sale_item_id, v_sale.party_id, v_item_name,
      v_qty, v_returned_qty, v_rate, v_return_value,
      v_reason, v_return_date, v_remarks,
      v_sale.financial_year, v_sale.company
    );

    -- Update item_master stock (add returned qty back)
    UPDATE item_master
    SET stock_qty = stock_qty + v_returned_qty, updated_at = now()
    WHERE base_name = v_item_name;

    -- If item_master row doesn't exist, create it
    IF NOT FOUND THEN
      INSERT INTO item_master (base_name, stock_qty, cost_price)
      VALUES (v_item_name, v_returned_qty, 0)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Create ledger entry for RTO adjustment (credit reduces party outstanding)
  INSERT INTO ledger_entries (
    party_id, voucher_type, voucher_id, voucher_number,
    voucher_date, financial_year, company, particular,
    debit, credit
  ) VALUES (
    v_sale.party_id,
    'rto_adjustment',
    p_sale_id,
    v_sale.invoice_number || '-RTO',
    CURRENT_DATE,
    v_sale.financial_year,
    v_sale.company,
    'RTO Adjustment for ' || v_sale.invoice_number,
    0,
    v_total_return
  );

  RETURN jsonb_build_object(
    'success', true,
    'total_return_value', v_total_return,
    'sale_id', p_sale_id,
    'party_id', v_sale.party_id
  );
END;
$$;
