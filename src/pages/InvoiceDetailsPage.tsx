import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Card, Badge, EmptyState, Spinner, statusTone } from '../components/ui';
import { supabase, type Sale, type SaleItem, type Party } from '../lib/supabase';
import { fmtINR, fmtDate } from '../lib/format';
import { exportToPDF, printDocument } from '../lib/exports';

export default function InvoiceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [party, setParty] = useState<Party | null>(null);
  const [receipts, setReceipts] = useState<{ voucher_number: string; voucher_date: string; amount: number }[]>([]);
  const [creditNotes, setCreditNotes] = useState<{ voucher_number: string; voucher_date: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) load(id); }, [id]);

  async function load(lid: string) {
    setLoading(true);
    const { data: ledger } = await supabase.from('ledger_entries').select('voucher_id, voucher_type').eq('id', lid).maybeSingle();
    const saleId = ledger?.voucher_id;
    if (!saleId) { setLoading(false); return; }

    const { data: s } = await supabase.from('sales').select('*').eq('id', saleId).maybeSingle();
    const saleRow = s as Sale | null;
    setSale(saleRow);
    if (saleRow) {
      const { data: it } = await supabase.from('sale_items').select('*').eq('sale_id', saleRow.id);
      setItems((it ?? []) as SaleItem[]);
      const { data: p } = await supabase.from('parties').select('*').eq('id', saleRow.party_id).maybeSingle();
      setParty(p as Party | null);
      const { data: r } = await supabase.from('receipts').select('voucher_number, voucher_date, amount').eq('party_id', saleRow.party_id).order('voucher_date');
      setReceipts((r ?? []) as { voucher_number: string; voucher_date: string; amount: number }[]);
      const { data: c } = await supabase.from('credit_notes').select('voucher_number, voucher_date, amount').eq('party_id', saleRow.party_id).order('voucher_date');
      setCreditNotes((c ?? []) as { voucher_number: string; voucher_date: string; amount: number }[]);
    }
    setLoading(false);
  }

  const paidAmount = receipts.reduce((s, r) => s + Number(r.amount), 0) + creditNotes.reduce((s, c) => s + Number(c.amount), 0);
  const outstanding = (sale?.grand_total ?? 0) - paidAmount;

  const doExportPDF = () => {
    if (!sale || !party) return;
    exportToPDF({
      title: `Invoice ${sale.invoice_number}`,
      subtitle: `${party.name} · ${fmtDate(sale.invoice_date)}`,
      head: ['Item', 'Qty', 'Rate', 'Discount', 'Amount'],
      body: items.map((it) => [it.name, String(it.quantity), fmtINR(it.rate), fmtINR(it.discount), fmtINR(it.amount)]),
      fileName: `invoice-${sale.invoice_number}`,
    });
  };

  if (loading) return <AppShell title="Invoice"><div className="py-20 grid place-items-center"><Spinner size={28} /></div></AppShell>;
  if (!sale) return <AppShell title="Invoice"><EmptyState title="Invoice not found" icon={<FileText size={40} />} /></AppShell>;

  return (
    <AppShell title={`Invoice ${sale.invoice_number}`}>
      <div className="flex items-center gap-3 mb-6 no-print">
        <button className="btn-ghost p-2" onClick={() => nav(-1)}><ArrowLeft size={18} /></button>
        <div className="flex-1" />
        <button className="btn-outline" onClick={doExportPDF}><Download size={16} /> PDF</button>
        <button className="btn-outline" onClick={() => printDocument(`Invoice ${sale.invoice_number}`)}><Printer size={16} /> Print</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-wide">Invoice</p>
                <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-50">{sale.invoice_number}</h2>
                <p className="text-sm text-ink-500 mt-1">{fmtDate(sale.invoice_date)}</p>
              </div>
              <Badge tone={statusTone(sale.status)}>{sale.status}</Badge>
            </div>

            {party && (
              <div className="rounded-lg bg-ink-50 dark:bg-ink-800/50 p-4 mb-6">
                <p className="text-xs text-ink-400 uppercase mb-1">Bill To</p>
                <p className="font-semibold text-ink-900 dark:text-ink-50">{party.name}</p>
                <p className="text-sm text-ink-500">{party.gstin ?? '—'}</p>
                <p className="text-sm text-ink-500">{party.phone ?? '—'}</p>
              </div>
            )}

            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-200 dark:border-ink-800">
                  <th className="th">Item</th><th className="th text-right">Qty</th><th className="th text-right">Rate</th>
                  <th className="th text-right">Disc</th><th className="th text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="td"><p className="font-medium">{it.name}</p>{it.hsn && <p className="text-xs text-ink-400">HSN: {it.hsn}</p>}</td>
                    <td className="td text-right tabular-nums">{it.quantity}</td>
                    <td className="td text-right tabular-nums">{fmtINR(it.rate)}</td>
                    <td className="td text-right tabular-nums">{it.discount ? fmtINR(it.discount) : '—'}</td>
                    <td className="td text-right tabular-nums font-semibold">{fmtINR(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end mt-6">
              <div className="w-full sm:w-72 space-y-2 text-sm">
                <Row label="Subtotal" value={fmtINR(sale.subtotal)} />
                <Row label="Discount" value={sale.discount ? `- ${fmtINR(sale.discount)}` : '—'} />
                <Row label="Tax" value={sale.tax ? fmtINR(sale.tax) : '—'} />
                <Row label="Shipping" value={sale.shipping ? fmtINR(sale.shipping) : '—'} />
                <Row label="Round Off" value={sale.round_off ? fmtINR(sale.round_off) : '—'} />
                <div className="border-t border-ink-200 dark:border-ink-800 pt-2 flex justify-between font-bold text-base">
                  <span>Grand Total</span><span className="text-brand-600">{fmtINR(sale.grand_total)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-sm text-ink-900 dark:text-ink-50 mb-4">Outstanding</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-ink-500">Invoice Total</span><span className="font-semibold">{fmtINR(sale.grand_total)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-ink-500">Received / Adjusted</span><span className="font-semibold text-success-600">{fmtINR(paidAmount)}</span></div>
              <div className="border-t border-ink-200 dark:border-ink-800 pt-3 flex justify-between">
                <span className="text-sm font-medium">Outstanding</span>
                <span className={`font-bold ${outstanding > 0 ? 'text-danger-600' : 'text-success-600'}`}>{fmtINR(outstanding)}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm text-ink-900 dark:text-ink-50 mb-3 flex items-center gap-2"><CheckCircle2 size={16} className="text-success-600" /> Payment History</h3>
            {receipts.length === 0 ? <p className="text-xs text-ink-400">No receipts recorded.</p> :
              <div className="space-y-2">{receipts.map((r, i) => (
                <div key={i} className="flex justify-between text-sm"><span>{r.voucher_number} · {fmtDate(r.voucher_date)}</span><span className="font-medium text-success-600">{fmtINR(r.amount)}</span></div>
              ))}</div>}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-sm text-ink-900 dark:text-ink-50 mb-3">Linked Credit Notes</h3>
            {creditNotes.length === 0 ? <p className="text-xs text-ink-400">No credit notes linked.</p> :
              <div className="space-y-2">{creditNotes.map((c, i) => (
                <div key={i} className="flex justify-between text-sm"><span>{c.voucher_number} · {fmtDate(c.voucher_date)}</span><span className="font-medium text-warning-600">{fmtINR(c.amount)}</span></div>
              ))}</div>}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-ink-500">{label}</span><span className="font-medium tabular-nums">{value}</span></div>;
}
