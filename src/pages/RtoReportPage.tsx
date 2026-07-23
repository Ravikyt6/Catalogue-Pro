import { useEffect, useState, useMemo } from 'react';
import { RotateCcw, AlertCircle, Search, X, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState, Badge, StatCard } from '../components/ui';
import { fetchRtoReport, type RtoReportRow } from '../lib/queries';
import { fmtINR, fmtDate } from '../lib/format';
import { exportToExcel, exportToPDF } from '../lib/exports';

export default function RtoReportPage() {
  const [rows, setRows] = useState<RtoReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    (async () => {
      try { setRows(await fetchRtoReport({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, search: search || undefined })); }
      catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, [search, dateFrom, dateTo]);

  const totalReturnValue = useMemo(() => rows.reduce((s, r) => s + r.return_value, 0), [rows]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;

  const doExport = (kind: 'excel' | 'pdf') => {
    const headers = ['Invoice', 'Party', 'Item', 'Qty Sold', 'Returned Qty', 'Return Value', 'Reason', 'Return Date'];
    const data = rows.map(r => [r.invoice_number, r.party_name, r.item_name, r.quantity_sold, r.returned_qty, r.return_value, r.reason, fmtDate(r.return_date)]);
    if (kind === 'excel') exportToExcel('rto_report', headers, data);
    else exportToPDF('RTO Report', headers, data);
  };

  return (
    <div>
      <PageHeader title="RTO Report" subtitle={`${rows.length} return entries`} icon={<RotateCcw size={20} />} actions={
        <div className="flex gap-2">
          <button onClick={() => doExport('excel')} className="btn-secondary"><FileSpreadsheet size={16} /> Excel</button>
          <button onClick={() => doExport('pdf')} className="btn-secondary"><FileText size={16} /> PDF</button>
        </div>
      } />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Returns" value={String(rows.length)} tone="danger" icon={<RotateCcw size={18} />} />
        <StatCard label="Return Value" value={fmtINR(totalReturnValue)} tone="danger" icon={<RotateCcw size={18} />} />
      </div>
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, party, item, reason…" className="input pl-9 text-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={14} /></button>}
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-muted" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input text-sm" />
            <span className="text-muted text-sm">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input text-sm" />
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden">
        {rows.length === 0 ? <EmptyState title="No RTO entries" description="No returns recorded yet." icon={<RotateCcw size={28} />} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="surface text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Invoice</th>
                  <th className="px-5 py-2.5 text-left font-medium">Party</th>
                  <th className="px-5 py-2.5 text-left font-medium">Item</th>
                  <th className="px-5 py-2.5 text-right font-medium">Qty Sold</th>
                  <th className="px-5 py-2.5 text-right font-medium">Returned</th>
                  <th className="px-5 py-2.5 text-right font-medium">Return Value</th>
                  <th className="px-5 py-2.5 text-left font-medium">Reason</th>
                  <th className="px-5 py-2.5 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t border-app transition hover:bg-[var(--surface-2)]">
                    <td className="px-5 py-2.5 font-medium text-app">{r.invoice_number}</td>
                    <td className="px-5 py-2.5 text-app">{r.party_name}</td>
                    <td className="px-5 py-2.5 text-app">{r.item_name}</td>
                    <td className="px-5 py-2.5 text-right text-muted">{r.quantity_sold}</td>
                    <td className="px-5 py-2.5 text-right text-rose-600">{r.returned_qty}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-rose-600 whitespace-nowrap">{fmtINR(r.return_value)}</td>
                    <td className="px-5 py-2.5"><Badge tone="danger">{r.reason}</Badge></td>
                    <td className="px-5 py-2.5 text-muted whitespace-nowrap">{fmtDate(r.return_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
