import { supabase } from './supabase';
import { parseExcelRows } from './parse';
import { getFinancialYear } from './format';
import * as XLSX from 'xlsx';

export interface ImportResult {
  totalRows: number; imported: number; skipped: number;
  failed: number; cancelled: number; duplicates: number; batchId: string;
}

export async function importExcelFile(file: File): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  const parsed = parseExcelRows(rows);

  const batchId = crypto.randomUUID();
  let imported = 0, skipped = 0, failed = 0, cancelled = 0, duplicates = 0;

  const existingInvoices = new Set<string>();
  const { data: existing } = await supabase.from('sales').select('invoice_number');
  for (const s of existing ?? []) existingInvoices.add(s.invoice_number);

  for (const sale of parsed) {
    if (sale.isCancelled) { cancelled++; continue; }
    if (existingInvoices.has(sale.invoice_number)) { duplicates++; continue; }
    if (!sale.party_name) { skipped++; continue; }

    try {
      const { data: party } = await supabase.from('parties').select('id').eq('name', sale.party_name).maybeSingle();
      let partyId = party?.id;
      if (!partyId) {
        const { data: newParty, error: pErr } = await supabase.from('parties').insert({
          name: sale.party_name, gstin: sale.party_gstin, state: sale.state,
        }).select().single();
        if (pErr) throw pErr;
        partyId = (newParty as { id: string }).id;
      }

      const { data: saleRec, error: sErr } = await supabase.from('sales').insert({
        invoice_number: sale.invoice_number, invoice_date: sale.invoice_date, party_id: partyId,
        subtotal: sale.subtotal, discount: sale.discount, cgst: sale.cgst, sgst: sale.sgst, igst: sale.igst,
        shipping: sale.shipping, round_off: sale.round_off, grand_total: sale.grand_total,
        taxable_value: sale.taxable_value, sale_amount: sale.sale_amount,
        gross_invoice_total: sale.gross_invoice_total, packing_charges: sale.packing_charges,
        state: sale.state, buyer_address: sale.buyer_address, consignee: sale.consignee,
        status: 'completed', financial_year: getFinancialYear(new Date(sale.invoice_date)),
        import_batch_id: batchId, outstanding: sale.grand_total, received: 0, due: sale.grand_total,
        expense: 0, expense_breakdown: {}, sales_person: null,
      }).select().single();
      if (sErr) throw sErr;
      const saleId = (saleRec as { id: string }).id;

      for (const item of sale.items) {
        const { error: iErr } = await supabase.from('sale_items').insert({
          sale_id: saleId, name: item.item_name, quantity: item.quantity,
          rate: item.rate, amount: item.amount, returned_qty: 0,
        });
        if (iErr) throw iErr;

        const { data: master } = await supabase.from('item_master').select('id').eq('base_name', item.item_name).maybeSingle();
        if (!master) {
          await supabase.from('item_master').insert({ base_name: item.item_name, stock_qty: -item.quantity });
        } else {
          await supabase.rpc('update_stock_qty', { p_sku: item.item_name, p_qty: -item.quantity });
        }
      }

      await supabase.from('ledger_entries').insert({
        party_id: partyId, voucher_type: 'sale', voucher_id: saleId,
        voucher_number: sale.invoice_number, voucher_date: sale.invoice_date,
        particular: `Sale ${sale.invoice_number}`, debit: sale.grand_total, credit: 0,
        financial_year: getFinancialYear(new Date(sale.invoice_date)), import_batch_id: batchId,
      });

      existingInvoices.add(sale.invoice_number);
      imported++;
    } catch { failed++; }
  }

  await supabase.from('import_history').insert({
    file_name: file.name, rows_total: parsed.length, rows_imported: imported,
    rows_skipped: skipped, rows_failed: failed, rows_cancelled: cancelled,
    rows_duplicates: duplicates, batch_id: batchId, notes: `Batch ${batchId}`,
  });

  return { totalRows: parsed.length, imported, skipped, failed, cancelled, duplicates, batchId };
}
