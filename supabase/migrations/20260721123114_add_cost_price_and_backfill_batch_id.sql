-- Add cost_price to sale_items for per-item costing / profit calculation
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;
ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS cost_price numeric DEFAULT 0;

-- Backfill batch_id in import_history from notes column for existing rows
UPDATE import_history
SET batch_id = substring(notes from 'Batch ([a-f0-9-]+)')
WHERE batch_id IS NULL AND notes LIKE 'Batch %';

-- Also backfill sales.batch_id from import_batch_id for consistency
UPDATE sales SET batch_id = import_batch_id WHERE batch_id IS NULL AND import_batch_id IS NOT NULL;
UPDATE purchases SET batch_id = import_batch_id WHERE batch_id IS NULL AND import_batch_id IS NOT NULL;
