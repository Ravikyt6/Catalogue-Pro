import { useEffect, useState } from 'react';
import { Users, AlertCircle, ArrowLeft, TrendingUp, ShoppingBag, RotateCcw, DollarSign } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState, StatCard, Badge } from '../components/ui';
import { VoucherDrawer } from '../components/VoucherDrawer';
import { fetchPartySummary, fetchPartyLedger, type PartySummary, type LedgerRow } from '../lib/queries';
import { fmtINR, fmtDate } from '../lib/format';
import { useParams, useNavigate } from 'react-router-dom';

export default function PartyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PartySummary | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [drawer, setDrawer] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [s, l] = await Promise.all([fetchPartySummary(id), fetchPartyLedger(id)]);
        setSummary(s); setLedger(l);
      } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;
  if (!summary) return <EmptyState title="Party not found" icon={<Users size={28} />} />;

  return (
    <div>
      <PageHeader title={summary.party.name} subtitle={summary.party.gstin ?? 'No GSTIN'} icon={<Users size={20} />} actions={<button onClick={() => navigate('/parties')} className="btn-secondary"><ArrowLeft size={16} /> Back</button>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Sale" value={fmtINR(summary.totalSale)} tone="brand" icon={<ShoppingBag size={18} />} />
        <StatCard label="Returned" value={fmtINR(summary.totalReturned)} tone="danger" icon={<RotateCcw size={18} />} />
        <StatCard label="Net Sale" value={fmtINR(summary.netSale)} tone="success" icon={<DollarSign size={18} />} />
        <StatCard label="Profit" value={fmtINR(summary.totalProfit)} tone={summary.totalProfit >= 0 ? 'success' : 'danger'} icon={<TrendingUp size={18} />} />
      </div>
      {summary.party.state && <div className="mb-4"><Badge tone="ink">State: {summary.party.state}</Badge></div>}
      {summary.outstanding > 0 && <div className="mb-4"><Badge tone="warning">Outstanding: {fmtINR(summary.outstanding)}</Badge></div>}
      <Card className="overflow-hidden">
        <div className="border-b border-app px-5 py-4"><h2 className="text-base font-semibold text-app">Ledger</h2></div>
        {ledger.length === 0 ? <EmptyState title="No ledger entries" icon={<Users size={28} />} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="surface text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Date</th>
                  <th className="px-5 py-2.5 text-left font-medium">Type</th>
                  <th className="px-5 py-2.5 text-left font-medium">Voucher</th>
                  <th className="px-5 py-2.5 text-left font-medium">Particular</th>
                  <th className="px-5 py-2.5 text-right font-medium">Debit</th>
                  <th className="px-5 py-2.5 text-right font-medium">Credit</th>
                  <th className="px-5 py-2.5 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(row => (
                  <tr key={row.id} onClick={() => row.voucher_id && setDrawer({ type: row.voucher_type, id: row.voucher_id })} className={`border-t border-app transition hover:bg-[var(--surface-2)] ${row.voucher_id ? 'cursor-pointer' : ''}`}>
                    <td className="px-5 py-2.5 text-muted whitespace-nowrap">{fmtDate(row.entry_date)}</td>
                    <td className="px-5 py-2.5"><Badge tone={row.voucher_type === 'sale' ? 'brand' : 'ink'}>{row.voucher_type}</Badge></td>
                    <td className="px-5 py-2.5 font-medium text-app">{row.voucher_number ?? '—'}</td>
                    <td className="px-5 py-2.5 text-muted">{row.particular ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">{row.debit > 0 ? fmtINR(row.debit) : '—'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">{row.credit > 0 ? fmtINR(row.credit) : '—'}</td>
                    <td className={`px-5 py-2.5 text-right whitespace-nowrap ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.profit !== 0 ? fmtINR(row.profit) : '—'}</td>
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
