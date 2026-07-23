-- Add expense_breakdown JSONB column to sales for multiple expense types
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS expense_breakdown jsonb DEFAULT '{}'::jsonb;
