export interface ParsedSale {
  invoice_number: string; invoice_date: string; party_name: string;
  party_gstin: string | null; subtotal: number; discount: number;
  cgst: number; sgst: number; igst: number; shipping: number;
  round_off: number; grand_total: number; taxable_value: number | null;
  sale_amount: number | null; gross_invoice_total: number | null;
  packing_charges: number | null; state: string | null;
  buyer_address: string | null; consignee: string | null;
  items: ParsedSaleItem[]; isCancelled: boolean;
}

export interface ParsedSaleItem {
  item_name: string; hsn: string | null; quantity: number;
  rate: number; amount: number; gst_rate: number | null;
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,₹\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

export function isRowCancelled(row: Record<string, unknown>): boolean {
  for (const v of Object.values(row)) {
    if (v == null) continue;
    const s = String(v).toLowerCase().trim();
    if (s === 'cancelled' || s === 'cancel' || s.includes('cancelled')) return true;
  }
  return false;
}

export function parseExcelRows(rows: Record<string, unknown>[]): ParsedSale[] {
  const sales: ParsedSale[] = [];
  let current: ParsedSale | null = null;

  for (const row of rows) {
    if (isRowCancelled(row)) {
      if (current) current.isCancelled = true;
      continue;
    }

    const inv = str(row['Invoice No'] ?? row['invoice_no'] ?? row['Voucher Number'] ?? row['voucher_number'] ?? row['Invoice Number']);
    const party = str(row['Party Name'] ?? row['party_name'] ?? row['Party'] ?? row['Buyer Name'] ?? row['party']);
    const date = str(row['Date'] ?? row['date'] ?? row['Invoice Date'] ?? row['invoice_date']);

    if (inv && inv !== (current as ParsedSale | null)?.invoice_number) {
      if (current) sales.push(current);
      current = {
        invoice_number: inv, invoice_date: date || new Date().toISOString().slice(0, 10),
        party_name: party,
        party_gstin: str(row['Party GSTIN'] ?? row['party_gstin'] ?? row['GSTIN'] ?? row['Buyer GSTIN']) || null,
        subtotal: num(row['Subtotal'] ?? row['subtotal']),
        discount: num(row['Discount'] ?? row['discount']),
        cgst: num(row['CGST'] ?? row['cgst']),
        sgst: num(row['SGST'] ?? row['sgst']),
        igst: num(row['IGST'] ?? row['igst']),
        shipping: num(row['Shipping'] ?? row['shipping'] ?? row['Freight'] ?? row['freight']),
        round_off: num(row['Round Off'] ?? row['round_off'] ?? row['Rounded Off'] ?? row['roundoff']),
        grand_total: num(row['Grand Total'] ?? row['grand_total'] ?? row['Total'] ?? row['total']),
        taxable_value: num(row['Taxable Value'] ?? row['taxable_value'] ?? 0) || null,
        sale_amount: num(row['Sale Amount'] ?? row['sale_amount'] ?? 0) || null,
        gross_invoice_total: num(row['Gross Invoice Total'] ?? row['gross_invoice_total'] ?? 0) || null,
        packing_charges: num(row['Packing Charges'] ?? row['packing_charges'] ?? 0) || null,
        state: str(row['State'] ?? row['state']) || null,
        buyer_address: str(row['Buyer Address'] ?? row['buyer_address'] ?? row['Address']) || null,
        consignee: str(row['Consignee'] ?? row['consignee']) || null,
        items: [], isCancelled: false,
      };
    }

    const itemName = str(row['Item Name'] ?? row['item_name'] ?? row['Item'] ?? row['Particular'] ?? row['particular']);
    if (itemName && current) {
      current.items.push({
        item_name: itemName,
        hsn: str(row['HSN'] ?? row['hsn'] ?? row['HSN/SAC']) || null,
        quantity: num(row['Quantity'] ?? row['quantity'] ?? row['Qty'] ?? row['qty']),
        rate: num(row['Rate'] ?? row['rate'] ?? row['Price'] ?? row['price']),
        amount: num(row['Amount'] ?? row['amount']),
        gst_rate: num(row['GST Rate'] ?? row['gst_rate'] ?? row['GST%'] ?? 0) || null,
      });
    }
  }

  if (current) sales.push(current);
  return sales.filter(s => s.invoice_number);
}
