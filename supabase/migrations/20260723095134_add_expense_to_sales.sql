-- Add expense column to sales for per-voucher expense tracking
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS expense numeric DEFAULT 0;
