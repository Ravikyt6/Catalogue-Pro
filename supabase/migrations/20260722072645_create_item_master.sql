/*
# Create item_master table for Item Costing

## Purpose
Stores the canonical "base item name" and its cost price.
The Costing page reads unique base item names from sale_items, normalizes
variant suffixes (sizes like XL, 4XL, (5), -5) to derive the base name,
and persists the cost price here so it applies to all future variants.

## New Tables
- `item_master`
  - `id` (uuid, primary key)
  - `base_name` (text, unique, not null) — normalized base item name, e.g. "ASTRIKE QR-55"
  - `cost_price` (numeric, default 0) — cost price per unit shared by all variants
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Security
- RLS enabled.
- Single-tenant no-auth app: anon + authenticated have full CRUD (data is intentionally shared).
*/

CREATE TABLE IF NOT EXISTS item_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_name text UNIQUE NOT NULL,
  cost_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE item_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_item_master" ON item_master;
CREATE POLICY "anon_select_item_master" ON item_master FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_item_master" ON item_master;
CREATE POLICY "anon_insert_item_master" ON item_master FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_item_master" ON item_master;
CREATE POLICY "anon_update_item_master" ON item_master FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_item_master" ON item_master;
CREATE POLICY "anon_delete_item_master" ON item_master FOR DELETE
  TO anon, authenticated USING (true);
