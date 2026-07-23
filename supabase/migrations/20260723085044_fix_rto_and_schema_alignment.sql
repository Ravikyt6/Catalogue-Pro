-- Drop the old jsonb overload of process_rto so only the text version remains
DROP FUNCTION IF EXISTS public.process_rto(uuid, jsonb);

-- Add cost_price column to item_groups (needed by Costing page)
ALTER TABLE public.item_groups ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- Create update_stock_qty function (used by import engine)
CREATE OR REPLACE FUNCTION public.update_stock_qty(p_sku text, p_qty numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE item_master
  SET stock_qty = COALESCE(stock_qty, 0) + p_qty, updated_at = now()
  WHERE base_name = p_sku;
END;
$function$;
