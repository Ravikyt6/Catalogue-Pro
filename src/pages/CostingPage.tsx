import { useEffect, useState, useMemo } from 'react';
import { Calculator, AlertCircle, Search, X, Save, Loader2, Check } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState } from '../components/ui';
import { fetchGroupCostRows, saveGroupCostPrice, type GroupCostRow } from '../lib/queries';
import { fmtINR } from '../lib/format';

export default function CostingPage() {
  const [rows, setRows] = useState<GroupCostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try { setRows(await fetchGroupCostRows()); }
      catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r => r.groupName.toLowerCase().includes(q));
  }, [rows, search]);

  const saveCost = async (groupId: string, groupName: string) => {
    setSaving(groupId);
    try {
      const costPrice = parseFloat(editValues[groupId] ?? '0') || 0;
      await saveGroupCostPrice(groupId, groupName, costPrice);
      setRows(prev => prev.map(r => r.groupId === groupId ? { ...r, costPrice } : r));
      setSavedFlash(groupId); setTimeout(() => setSavedFlash(null), 2000);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;

  return (
    <div>
      <PageHeader title="Costing" subtitle="Manage cost prices for item groups" icon={<Calculator size={20} />} />
      <Card className="mb-4 p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search groups…" className="input pl-9 text-sm" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={14} /></button>}
        </div>
      </Card>
      <Card className="overflow-hidden">
        {filtered.length === 0 ? <EmptyState title="No item groups" description="Create groups in the Item Grouping page first." icon={<Calculator size={28} />} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="surface text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">Group Name</th>
                  <th className="px-5 py-2.5 text-right font-medium">SKUs</th>
                  <th className="px-5 py-2.5 text-right font-medium">Current Cost Price</th>
                  <th className="px-5 py-2.5 text-right font-medium">New Cost Price</th>
                  <th className="px-5 py-2.5 text-center font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.groupId} className="border-t border-app">
                    <td className="px-5 py-2.5 font-medium text-app">{r.groupName}</td>
                    <td className="px-5 py-2.5 text-right text-muted">{r.skuCount}</td>
                    <td className="px-5 py-2.5 text-right font-medium text-app whitespace-nowrap">{fmtINR(r.costPrice)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="relative inline-block">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
                        <input type="number" step="0.01" min="0" value={editValues[r.groupId] ?? r.costPrice.toString()} onChange={e => setEditValues(prev => ({ ...prev, [r.groupId]: e.target.value }))} className="w-28 rounded-lg border border-app bg-[var(--surface)] px-2 py-1.5 pl-6 text-right text-sm text-app outline-none focus:border-brand-500" />
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <button onClick={() => saveCost(r.groupId, r.groupName)} disabled={saving === r.groupId} className="btn-primary text-xs">{saving === r.groupId ? <Loader2 size={14} className="animate-spin" /> : savedFlash === r.groupId ? <Check size={14} /> : <Save size={14} />}{saving === r.groupId ? '' : savedFlash === r.groupId ? 'Saved' : 'Save'}</button>
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
