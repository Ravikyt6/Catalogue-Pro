import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { ShoppingBag, Search, AlertCircle, FileSpreadsheet, FileText, RotateCcw, ChevronLeft, ChevronRight, Calendar, X, TrendingUp, DollarSign, User } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState, Badge, StatCard } from '../components/ui';
import { VoucherDrawer } from '../components/VoucherDrawer';
import { RtoModal } from '../components/RtoModal';
import { fetchSales, type SaleWithParty } from '../lib/queries';
import { fmtINR, fmtDate } from '../lib/format';
import { exportToExcel, exportToPDF, printDocument } from '../lib/exports';

type DateFilter = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'fy' | 'custom' | 'all';
const PAGE_SIZE = 25;

function getFYRange(): { from: string; to: string } {
  const now = new Date(); const y = now.getFullYear(); const m = now.getMonth();
  const fyStart = m >= 3 ? new Date(y, 3, 1) : new Date(y - 1, 3, 1);
  const fyEnd = m >= 3 ? new Date(y + 1, 2, 31) : new Date(y, 2, 31);
  return { from: fyStart.toISOString().slice(0, 10), to: fyEnd.toISOString().slice(0, 10) };
}

function getDateRange(filter: DateFilter, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  const now = new Date();
  switch (filter) {
    case 'today': { const d = now.toISOString().slice(0, 10); return { from: d, to: d }; }
    case 'yesterday': { const d = new Date(now); d.setDate(d.getDate() - 1); const s = d.toISOString().slice(0, 10); return { from: s, to: s }; }
    case 'this_week': { const d = new Date(now); const day = d.getDay(); const start = new Date(d); start.setDate(d.getDate() - day); start.setHours(0, 0, 0, 0); return { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }; }
    case 'this_month': { const start = new Date(now.getFullYear(), now.getMonth(), 1); return { from: start.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) }; }
    case 'last_month': { const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 0); return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }; }
    case 'fy': return getFYRange();
    case 'custom': return { from: customFrom, to: customTo };
    default: return {};
  }
}

function getMonthOptions(): { value: string; label: string }[] {
  const months = []; const now = new Date();
  for (let i = -6; i <= 6; i++) { const d = new Date(now.getFullYear(), now.getMonth() + i, 1); months.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }); }
  return months;
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  completed: { label: 'Completed', tone: 'success' },
  partial_return: { label: 'Partial Return', tone: 'warning' },
  fully_returned: { label: 'Fully Returned', tone: 'danger' },
};

export default function SalesPage() {
  const [sales, setSales] = useState<SaleWithParty[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [monthSel, setMonthSel] = useState('');
  const [personFilter, setPersonFilter] = useState('');
  const [page, setPage] = useState(0);
  const [drawer, setDrawer] = useState<{ type: string; id: string } | null>(null);
  const [rtoModal, setRtoModal] = useState<SaleWithParty | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => { setDebouncedSearch(value); setPage(0); }, 300);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(dateFilter, customFrom, customTo);
      setSales(await fetchSales({ dateFrom: from, dateTo: to, month: monthSel || undefined }));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, [dateFilter, customFrom, customTo, monthSel]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return sales.filter(s => {
      if (q) {
        const matchesInvoice = s.invoice_number.toLowerCase().includes(q);
        const matchesParty = s.party_name.toLowerCase().includes(q);
        const matchesGst = (s.party_gstin ?? '').toLowerCase().includes(q);
        const matchesPerson = (s.sales_person ?? '').toLowerCase().includes(q);
        const matchesItem = (s.item_names ?? []).some(n => n.toLowerCase().includes(q));
        if (!matchesInvoice && !matchesParty && !matchesGst && !matchesPerson && !matchesItem) return false;
      }
      if (personFilter) {
        if (personFilter === '__none__') { if (s.sales_person && s.sales_person.trim() !== '') return false; }
        else { if (s.sales_person !== personFilter) return false; }
      }
      return true;
    });
  }, [sales, debouncedSearch, personFilter]);

  const salesPersons = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => { if (s.sales_person && s.sales_person.trim() !== '') set.add(s.sales_person); });
    return Array.from(set).sort();
  }, [sales]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalSaleAmount = filtered.reduce((s, r) => s + (r.sale_amount || r.grand_total || 0), 0);
  const totalReturned = filtered.reduce((s, r) => s + r.returned_amount, 0);
  const totalNet = filtered.reduce((s, r) => s + r.net_sale, 0);
  const totalProfit = filtered.reduce((s, r) => s + r.profit, 0);

  const doExport = (kind: 'excel' | 'pdf' | 'print') => {
    const headers = ['Invoice', 'Date', 'Party', 'GSTIN', 'Sales Person', 'Sale Amount', 'Returned', 'Net Sale', 'Profit', 'Status'];
    const rows = filtered.map(s => [s.invoice_number, fmtDate(s.invoice_date), s.party_name, s.party_gstin ?? '', s.sales_person ?? '', s.sale_amount || s.grand_total, s.returned_amount, s.net_sale, s.profit.toFixed(2), STATUS_LABELS[s.rto_status]?.label ?? s.rto_status]);
    if (kind === 'excel') exportToExcel('sales', headers, rows);
    else if (kind === 'pdf') exportToPDF('Sales Report', headers, rows);
    else printDocument('Sales Report', headers, rows);
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;

  return (
    <div>
      <PageHeader title="Sales" subtitle={`${filtered.length} invoices`} icon={<ShoppingBag size={20} />} actions={
        <div className="flex flex-wrap gap-2">
          <button onClick={() => doExport('excel')} className="btn-secondary"><FileSpreadsheet size={16} /> Excel</button>
          <button onClick={() => doExport('pdf')} className="btn-secondary"><FileText size={16} /> PDF</button>
          <button onClick={() => doExport('print')} className="btn-secondary"><FileText size={16} /> Print</button>
        </div>} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Sale Amount" value={fmtINR(totalSaleAmount)} tone="brand" icon={<ShoppingBag size={18} />} />
        <StatCard label="Returned" value={fmtINR(totalReturned)} tone="danger" icon={<RotateCcw size={18} />} />
        <StatCard label="Net Sale" value={fmtINR(totalNet)} tone="success" icon={<DollarSign size={18} />} />
        <StatCard label="Profit" value={fmtINR(totalProfit)} tone={totalProfit >= 0 ? 'success' : 'danger'} icon={<TrendingUp size={18} />} />
      </div>
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={16} className="text-muted" />
            {(['all', 'today', 'yesterday', 'this_week', 'this_month', 'last_month', 'fy', 'custom'] as DateFilter[]).map(f => (
              <button key={f} onClick={() => setDateFilter(f)} className={`btn text-xs ${dateFilter === f ? 'bg-brand-600 text-white' : 'border border-app text-muted'}`}>{f === 'fy' ? 'Financial Year' : f === 'all' ? 'All' : f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input sm:w-44 text-sm" />
              <span className="text-muted text-sm">to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input sm:w-44 text-sm" />
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select value={monthSel} onChange={e => { setMonthSel(e.target.value); setPage(0); }} className="input sm:w-48 text-sm">
              <option value="">All Months</option>
              {monthOptions.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <select value={personFilter} onChange={e => { setPersonFilter(e.target.value); setPage(0); }} className="input sm:w-48 text-sm">
              <option value="">All Sales Persons</option>
              {salesPersons.map(p => <option key={p} value={p}>{p}</option>)}
              <option value="__none__">No Sales Person</option>
            </select>
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input value={searchInput} onChange={e => handleSearchChange(e.target.value)} placeholder="Search invoice, party, GST, sales person, item…" className="input pl-9 text-sm" />
              {searchInput && <button onClick={() => { setSearchInput(''); setDebouncedSearch(''); setPage(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={14} /></button>}
            </div>
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden">
        {filtered.length === 0 ? <EmptyState title="No sales found" description="Adjust filters or import a Tally file." icon={<ShoppingBag size={28} />} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="surface text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">Invoice</th>
                    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">Date</th>
                    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">Party</th>
                    <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap">Sales Person</th>
                    <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">Sale Amount</th>
                    <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">Returned</th>
                    <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">Net Sale</th>
                    <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap">Profit</th>
                    <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">Status</th>
                    <th className="px-4 py-2.5 text-center font-medium whitespace-nowrap">RTO</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(s => {
                    const st = STATUS_LABELS[s.rto_status] ?? { label: s.rto_status, tone: 'ink' };
                    return (
                      <tr key={s.id} onClick={() => setDrawer({ type: 'sale', id: s.id })} className="cursor-pointer border-t border-app transition hover:bg-[var(--surface-2)]">
                        <td className="px-4 py-2.5 font-medium text-app whitespace-nowrap">{s.invoice_number}</td>
                        <td className="px-4 py-2.5 text-muted whitespace-nowrap">{fmtDate(s.invoice_date)}</td>
                        <td className="px-4 py-2.5 text-app"><div><p className="font-medium">{s.party_name}</p>{s.party_gstin && <p className="text-xs text-muted">{s.party_gstin}</p>}</div></td>
                        <td className="px-4 py-2.5 whitespace-nowrap">{s.sales_person ? <span className="inline-flex items-center gap-1 text-xs text-app"><User size={11} className="text-brand-500" /> {s.sales_person}</span> : <span className="text-xs text-muted">—</span>}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-app whitespace-nowrap">{fmtINR(s.sale_amount || s.grand_total)}</td>
                        <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">{s.returned_amount > 0 ? <span className="text-rose-600">{fmtINR(s.returned_amount)}</span> : '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-app whitespace-nowrap">{fmtINR(s.net_sale)}</td>
                        <td className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${s.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtINR(s.profit)}</td>
                        <td className="px-4 py-2.5 text-center whitespace-nowrap"><Badge tone={st.tone}>{st.label}</Badge></td>
                        <td className="px-4 py-2.5 text-center"><button onClick={e => { e.stopPropagation(); setRtoModal(s); }} className="flex items-center justify-center gap-1 rounded-lg border border-app px-2.5 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-900/30"><RotateCcw size={12} /> RTO</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-app px-5 py-3">
              <span className="text-xs text-muted">Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost p-2"><ChevronLeft size={16} /></button>
                <span className="px-3 py-1.5 text-xs text-muted">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="btn-ghost p-2"><ChevronRight size={16} /></button>
              </div>
            </div>
          </>
        )}
      </Card>
      <VoucherDrawer voucherType={drawer?.type ?? null} voucherId={drawer?.id ?? null} onClose={() => setDrawer(null)} />
      {rtoModal && <RtoModal sale={rtoModal} party={null} onClose={() => setRtoModal(null)} onSuccess={() => { setRtoModal(null); setRefreshKey(k => k + 1); }} />}
    </div>
  );
}
