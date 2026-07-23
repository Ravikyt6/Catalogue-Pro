import { useEffect, useState, useMemo } from 'react';
import { History, AlertCircle, Search, X, RotateCcw, Loader2 } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import { supabase, type ImportHistory } from '../lib/supabase';
import { fmtDateTime } from '../lib/format';

export default function HistoryPage() {
  const [history, setHistory] = useState<ImportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('import_history').select('*').order('imported_at', { ascending: false });
        if (error) throw error;
        setHistory((data ?? []) as ImportHistory[]);
      } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return history;
    return history.filter(h => h.file_name.toLowerCase().includes(q) || (h.voucher_type ?? '').toLowerCase().includes(q) || (h.batch_id ?? '').toLowerCase().includes(q));
  }, [history, search]);

  const handleRollback = async (batchId: string, id: string) => {
    if (!confirm('Rollback this import? This will delete all sales, items, and ledger entries created during this import. This cannot be undone.')) return;
    setRollingBack(id);
    try {
      const { data: sales } = await supabase.from('sales').select('id').eq('import_batch_id', batchId);
      const saleIds = (sales ?? []).map((s: { id: string }) => s.id);
      if (saleIds.length > 0) {
        await supabase.from('sale_items').delete().in('sale_id', saleIds);
        await supabase.from('rto_entries').delete().in('sale_id', saleIds);
        await supabase.from('ledger_entries').delete().eq('import_batch_id', batchId);
        await supabase.from('sales').delete().in('id', saleIds);
      }
      await supabase.from('import_history').update({ rolled_back: true }).eq('id', id);
      setHistory(prev => prev.map(h => h.id === id ? { ...h, rolled_back: true } : h));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setRollingBack(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;

  return (
    <div>
      <PageHeader title="Import History" subtitle={`${filtered.length} imports`} icon={<History size={20} />} />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by file name or batch ID…" className="input pl-9 text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={14} /></button>}
        </div>
      </Card>
      <Card className="overflow-hidden">
        {filtered.length === 0 ? <EmptyState title="No imports yet" description="Import a Tally Excel file to see history." icon={<History size={28} />} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="surface text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">File Name</th>
                  <th className="px-5 py-2.5 text-left font-medium">Imported At</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total</th>
                  <th className="px-5 py-2.5 text-right font-medium">Imported</th>
                  <th className="px-5 py-2.5 text-right font-medium">Skipped</th>
                  <th className="px-5 py-2.5 text-right font-medium">Failed</th>
                  <th className="px-5 py-2.5 text-center font-medium">Status</th>
                  <th className="px-5 py-2.5 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.id} className="border-t border-app">
                    <td className="px-5 py-2.5 font-medium text-app">{h.file_name}</td>
                    <td className="px-5 py-2.5 text-muted whitespace-nowrap">{fmtDateTime(h.imported_at)}</td>
                    <td className="px-5 py-2.5 text-right text-muted">{h.rows_total ?? 0}</td>
                    <td className="px-5 py-2.5 text-right text-emerald-600">{h.rows_imported ?? 0}</td>
                    <td className="px-5 py-2.5 text-right text-amber-600">{h.rows_skipped ?? 0}</td>
                    <td className="px-5 py-2.5 text-right text-rose-600">{h.rows_failed ?? 0}</td>
                    <td className="px-5 py-2.5 text-center">{h.rolled_back ? <Badge tone="danger">Rolled Back</Badge> : <Badge tone="success">Active</Badge>}</td>
                    <td className="px-5 py-2.5 text-center">
                      {!h.rolled_back && <button onClick={() => handleRollback(h.batch_id ?? '', h.id)} disabled={rollingBack === h.id} className="btn text-xs border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-900/30">{rollingBack === h.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Rollback</button>}
                    </td>
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
