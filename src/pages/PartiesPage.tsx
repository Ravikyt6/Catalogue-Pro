import { useEffect, useState, useMemo } from 'react';
import { Users, Search, AlertCircle, ChevronRight, X } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import { fetchPartiesWithBalances, type PartyWithBalance } from '../lib/queries';
import { fmtINR } from '../lib/format';
import { useNavigate } from 'react-router-dom';

export default function PartiesPage() {
  const [parties, setParties] = useState<PartyWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try { setParties(await fetchPartiesWithBalances()); }
      catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return parties;
    return parties.filter(p => p.name.toLowerCase().includes(q) || (p.gstin ?? '').toLowerCase().includes(q) || (p.state ?? '').toLowerCase().includes(q));
  }, [parties, search]);

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;

  return (
    <div>
      <PageHeader title="Parties" subtitle={`${filtered.length} parties`} icon={<Users size={20} />} />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, GSTIN, or state…" className="input pl-9 text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={14} /></button>}
        </div>
      </Card>
      <Card className="overflow-hidden">
        {filtered.length === 0 ? <EmptyState title="No parties found" description="Import a Tally file or adjust your search." icon={<Users size={28} />} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="surface text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Name</th>
                  <th className="px-5 py-2.5 text-left font-medium">GSTIN</th>
                  <th className="px-5 py-2.5 text-left font-medium">State</th>
                  <th className="px-5 py-2.5 text-right font-medium">Total Sale</th>
                  <th className="px-5 py-2.5 text-right font-medium">Returned</th>
                  <th className="px-5 py-2.5 text-right font-medium">Outstanding</th>
                  <th className="px-5 py-2.5 text-center font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => navigate(`/parties/${p.id}`)} className="cursor-pointer border-t border-app transition hover:bg-[var(--surface-2)]">
                    <td className="px-5 py-2.5 font-medium text-app">{p.name}</td>
                    <td className="px-5 py-2.5 text-muted">{p.gstin ?? '—'}</td>
                    <td className="px-5 py-2.5 text-muted">{p.state ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-app whitespace-nowrap">{fmtINR(p.totalSale)}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">{p.totalReturned > 0 ? <span className="text-rose-600">{fmtINR(p.totalReturned)}</span> : '—'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">{p.balance > 0 ? <Badge tone="warning">{fmtINR(p.balance)}</Badge> : <Badge tone="success">Settled</Badge>}</td>
                    <td className="px-5 py-2.5 text-center text-muted"><ChevronRight size={16} /></td>
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
