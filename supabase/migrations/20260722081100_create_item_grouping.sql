/*
# Create item_groups and item_group_mappings tables for Manual SKU Grouping

## Purpose
Replaces automatic item normalization with manual SKU grouping.
Admin assigns each SKU (from sale_items) to a Group manually.
The Costing page shows Group Name + SKU count + Cost Price (one per group).

## New Tables
- `item_groups`
  - `id` (uuid, primary key)
  - `name` (text, unique, not null) — the group name, e.g. "ASTRIKE QR-55"
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

- `item_group_mappings`
  - `id` (uuid, primary key)
  - `sku_name` (text, unique, not null) — the original SKU name from sale_items
  - `group_id` (uuid, FK to item_groups, nullable — null means ungrouped)
  - `base_item` (text, nullable) — optional base item label
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

## Modified Tables
- `item_master`: now stores cost per group name (base_name column reused as group name).
  No schema change needed — the column already exists.

## Security
- RLS enabled on both new tables.
- Single-tenant no-auth app: anon + authenticated have full CRUD.
*/

CREATE TABLE IF NOT EXISTS item_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE item_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_item_groups" ON item_groups;
CREATE POLICY "anon_select_item_groups" ON item_groups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_item_groups" ON item_groups;
CREATE POLICY "anon_insert_item_groups" ON item_groups FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_item_groups" ON item_groups;
CREATE POLICY "anon_update_item_groups" ON item_groups FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_item_groups" ON item_groups;
CREATE POLICY "anon_delete_item_groups" ON item_groups FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS item_group_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_name text UNIQUE NOT NULL,
  group_id uuid REFERENCES item_groups(id) ON DELETE SET NULL,
  base_item text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE item_group_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_mappings" ON item_group_mappings;
CREATE POLICY "anon_select_mappings" ON item_group_mappings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_mappings" ON item_group_mappings;
CREATE POLICY "anon_insert_mappings" ON item_group_mappings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_mappings" ON item_group_mappings;
CREATE POLICY "anon_update_mappings" ON item_group_mappings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_mappings" ON item_group_mappings;
CREATE POLICY "anon_delete_mappings" ON item_group_mappings FOR DELETE
  TO anon, authenticated USING (true);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_item_group_mappings_group_id ON item_group_mappings(group_id);
CREATE INDEX IF NOT EXISTS idx_item_group_mappings_sku ON item_group_mappings(sku_name);
