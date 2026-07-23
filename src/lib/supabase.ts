import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Party {
  id: string; name: string; gstin: string | null; state: string | null;
  phone: string | null; email: string | null; type: string | null;
  opening_balance: number | null; opening_balance_type: string | null;
  company: string | null; created_at: string;
}

export interface Sale {
  id: string; invoice_number: string; invoice_date: string; party_id: string;
  financial_year: string; company: string | null; subtotal: number; discount: number;
  tax: number | null; shipping: number; round_off: number; grand_total: number;
  status: string; due_date: string | null; notes: string | null;
  import_batch_id: string | null; batch_id: string | null;
  buyer_address: string | null; consignee: string | null; state: string | null;
  packing_charges: number | null; cgst: number | null; sgst: number | null;
  igst: number | null; outstanding: number | null; received: number | null;
  due: number | null; sale_amount: number | null; gross_invoice_total: number | null;
  taxable_value: number | null; expense: number | null;
  expense_breakdown: Record<string, number> | null; sales_person: string | null;
  created_at: string;
}

export interface SaleItem {
  id: string; sale_id: string; name: string; hsn: string | null;
  quantity: number; rate: number; discount: number | null;
  tax_percent: number | null; amount: number; unit: string | null;
  tax_amount: number | null; cost_price: number | null;
  returned_qty: number | null; created_at: string;
}

export interface LedgerEntry {
  id: string; party_id: string; voucher_type: string; voucher_id: string | null;
  voucher_number: string | null; voucher_date: string | null;
  entry_date: string | null; financial_year: string | null; company: string | null;
  particular: string | null; debit: number | null; credit: number | null;
  import_batch_id: string | null; created_at: string;
}

export interface ImportHistory {
  id: string; file_name: string; voucher_type: string | null; company: string | null;
  imported_by: string | null; imported_at: string; rows_total: number | null;
  rows_imported: number | null; rows_failed: number | null; rows_skipped: number | null;
  rows_cancelled: number | null; rows_duplicates: number | null;
  rolled_back: boolean | null; notes: string | null; batch_id: string | null;
}

export interface ItemMaster {
  id: string; base_name: string; cost_price: number | null;
  stock_qty: number | null; created_at: string; updated_at: string;
}

export interface ItemGroup {
  id: string; name: string; cost_price: number | null;
  created_at: string; updated_at: string;
}

export interface ItemGroupMapping {
  id: string; group_id: string; sku_name: string;
  base_item: string | null; created_at: string; updated_at: string;
}

export interface RtoEntry {
  id: string; sale_id: string; sale_item_id: string; party_id: string;
  item_name: string; quantity_sold: number; returned_qty: number;
  rate: number; return_value: number; reason: string; return_date: string;
  remarks: string | null; financial_year: string | null; company: string | null;
  created_at: string;
}

export const EXPENSE_TYPES = ['Freight', 'Packaging', 'Commission', 'Other'] as const;
export type ExpenseType = typeof EXPENSE_TYPES[number];
