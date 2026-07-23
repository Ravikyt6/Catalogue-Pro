import { useEffect, useState, useMemo } from 'react';
import { BookOpen, AlertCircle, Search, X } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import { VoucherDrawer } from '../components/VoucherDrawer';
import { supabase, type Party } from '../lib/supabase';
import { fetchPartyLedger, type LedgerRow } from '../lib/queries';
import { fmtINR, fmtDate } from '../lib/format';

interface PartyLedgerGroup { party: Party; rows: LedgerRow[]; }

export default function LedgerPage() {
  const [groups, setGroups] = useState<PartyLedgerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<{ type: string; id: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: parties, error } = await supabase.from('parties').select('*').order('name');
        if (error) throw error;
        const partyList = (parties ?? []) as Party[];
        const results: PartyLedgerGroup[] = [];
        for (const p of partyList) {
          const rows = await fetchPartyLedger(p.id);
          if (rows.length > 0) results.push({ party: p, rows });
        }
        setGroups(results);
      } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groups;
    return groups.map(g => ({ ...g, rows: g.rows.filter(r => (r.voucher_number ?? '').toLowerCase().includes(q) || (r.particular ?? '').toLowerCase().includes(q) || r.voucher_type.toLowerCase().includes(q)) })).filter(g => g.party.name.toLowerCase().includes(q) || g.rows.length > 0);
  }, [groups, search]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;

  return (
    <div>
      <PageHeader title="Ledger" subtitle="Party-wise ledger entries" icon={<BookOpen size={20} />} />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by party, voucher, or particular…" className="input pl-9 text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={14} /></button>}
        </div>
      </Card>
      {filtered.length === 0 ? <EmptyState title="No ledger entries" description="Import a Tally file to see ledger data." icon={<BookOpen size={28} />} /> : (
        <div className="space-y-4">
          {filtered.map(g => (
            <Card key={g.party.id} className="overflow-hidden">
              <div className="border-b border-app bg-[var(--surface-2)] px-5 py-3"><p className="text-sm font-semibold text-app">{g.party.name}</p>{g.party.gstin && <p className="text-xs text-muted">{g.party.gstin}</p>}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="surface text-xs text-muted">
                    <tr>
                      <th className="px-5 py-2.5 text-left font-medium">Date</th>
                      <th className="px-5 py-2.5 text-left font-medium">Type</th>
                      <th className="px-5 py-2.5 text-left font-medium">Voucher</th>
                      <th className="px-5 py-2.5 text-right font-medium">Debit</th>
                      <th className="px-5 py-2.5 text-right font-medium">Credit</th>
                      <th className="px-5 py-2.5 text-right font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(row => (
                      <tr key={row.id} onClick={() => row.voucher_id && setDrawer({ type: row.voucher_type, id: row.voucher_id })} className={`border-t border-app transition hover:bg-[var(--surface-2)] ${row.voucher_id ? 'cursor-pointer' : ''}`}>
                        <td className="px-5 py-2.5 text-muted whitespace-nowrap">{fmtDate(row.entry_date)}</td>
                        <td className="px-5 py-2.5"><Badge tone={row.voucher_type === 'sale' ? 'brand' : 'ink'}>{row.voucher_type}</Badge></td>
                        <td className="px-5 py-2.5 font-medium text-app">{row.voucher_number ?? '—'}</td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">{row.debit > 0 ? fmtINR(row.debit) : '—'}</td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">{row.credit > 0 ? fmtINR(row.credit) : '—'}</td>
                        <td className={`px-5 py-2.5 text-right whitespace-nowrap ${row.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{row.profit !== 0 ? fmtINR(row.profit) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
      <VoucherDrawer voucherType={drawer?.type ?? null} voucherId={drawer?.id ?? null} onClose={() => setDrawer(null)} />
    </div>
  );
}
