import { useEffect, useState, useMemo } from 'react';
import { ArrowLeftRight, AlertCircle, Search, X, FileSpreadsheet, FileText } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import { VoucherDrawer } from '../components/VoucherDrawer';
import { fetchAllTransactions, type RecentTxn } from '../lib/queries';
import { fmtINR, fmtDate } from '../lib/format';
import { exportToExcel, exportToPDF } from '../lib/exports';

export default function TransactionsPage() {
  const [txns, setTxns] = useState<RecentTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    (async () => {
      try { setTxns(await fetchAllTransactions()); }
      catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return txns;
    return txns.filter(t => t.invoice_number.toLowerCase().includes(q) || t.party_name.toLowerCase().includes(q) || (t.sales_person ?? '').toLowerCase().includes(q));
  }, [txns, search]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;

  const doExport = (kind: 'excel' | 'pdf') => {
    const headers = ['Invoice', 'Date', 'Party', 'Sales Person', 'Amount', 'Outstanding', 'Status'];
    const rows = filtered.map(t => [t.invoice_number, fmtDate(t.invoice_date), t.party_name, t.sales_person ?? '', t.sale_amount ?? t.grand_total, t.outstanding ?? 0, t.status]);
    if (kind === 'excel') exportToExcel('transactions', headers, rows);
    else exportToPDF('Transactions', headers, rows);
  };

  return (
    <div>
      <PageHeader title="Transactions" subtitle={`${filtered.length} transactions`} icon={<ArrowLeftRight size={20} />} actions={
        <div className="flex gap-2">
          <button onClick={() => doExport('excel')} className="btn-secondary"><FileSpreadsheet size={16} /> Excel</button>
          <button onClick={() => doExport('pdf')} className="btn-secondary"><FileText size={16} /> PDF</button>
        </div>
      } />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice, party, or sales person…" className="input pl-9 text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={14} /></button>}
        </div>
      </Card>
      <Card className="overflow-hidden">
        {filtered.length === 0 ? <EmptyState title="No transactions" icon={<ArrowLeftRight size={28} />} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="surface text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Invoice</th>
                  <th className="px-5 py-2.5 text-left font-medium">Date</th>
                  <th className="px-5 py-2.5 text-left font-medium">Party</th>
                  <th className="px-5 py-2.5 text-left font-medium">Sales Person</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5 text-right font-medium">Outstanding</th>
                  <th className="px-5 py-2.5 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} onClick={() => setDrawer({ type: 'sale', id: t.id })} className="cursor-pointer border-t border-app transition hover:bg-[var(--surface-2)]">
                    <td className="px-5 py-2.5 font-medium text-app">{t.invoice_number}</td>
                    <td className="px-5 py-2.5 text-muted whitespace-nowrap">{fmtDate(t.invoice_date)}</td>
                    <td className="px-5 py-2.5 text-app">{t.party_name}</td>
                    <td className="px-5 py-2.5 text-muted">{t.sales_person ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-app whitespace-nowrap">{fmtINR(t.sale_amount ?? t.grand_total)}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">{(t.outstanding ?? 0) > 0 ? <Badge tone="warning">{fmtINR(t.outstanding)}</Badge> : <Badge tone="success">Paid</Badge>}</td>
                    <td className="px-5 py-2.5 text-center"><Badge tone="ink">{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <VoucherDrawer voucherType={drawer?.type ?? null} voucherId={drawer?.id ?? null} onClose={() => setDrawer(null)} />
    </div>
  );
}
