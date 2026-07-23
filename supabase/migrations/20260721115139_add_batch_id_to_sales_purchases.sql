ALTER TABLE sales ADD COLUMN IF NOT EXISTS batch_id text;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS batch_id text;
