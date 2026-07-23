-- RPC function to update cost_price on ALL matching sale_items by SKU name array
-- This avoids the Supabase client 1000-row default select cap
CREATE OR REPLACE FUNCTION update_cost_price_by_sku_names(
  p_sku_names text[],
  p_cost_price numeric
) RETURNS void AS $$
BEGIN
  UPDATE sale_items
  SET cost_price = p_cost_price
  WHERE name = ANY(p_sku_names);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION update_cost_price_by_sku_names(text[], numeric) TO anon, authenticated;