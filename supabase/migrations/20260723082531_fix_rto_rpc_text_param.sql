/*
# Fix RTO RPC: accept text[] instead of jsonb

The "cannot extract elements from a scalar" error occurs because
the Supabase JS client passes p_items as a JSON string (scalar text),
but the function tried to use jsonb_array_elements on it.

Fix: Change p_items from jsonb to text, then parse it inside the function
with jsonb_in(). This way the client can pass a JSON string and the
function converts it to jsonb internally.
*/

CREATE OR REPLACE FUNCTION process_rto(p_sale_id uuid, p_items text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_items jsonb;
  v_item jsonb;
  v_sale RECORD;
  v_return_value numeric;
  v_total_return numeric DEFAULT 0;
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
  -- Parse the text input as jsonb
  v_items := p_items::jsonb;

  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sale not found';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
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
