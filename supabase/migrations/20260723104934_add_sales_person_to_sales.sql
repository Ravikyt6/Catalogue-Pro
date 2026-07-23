-- Add sales_person column to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS sales_person text DEFAULT NULL;
