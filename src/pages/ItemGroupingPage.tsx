import { useEffect, useState, useMemo } from 'react';
import { Layers, AlertCircle, Search, X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Card, PageHeader, Spinner, EmptyState, Badge } from '../components/ui';
import { fetchAllSkusWithMappings, fetchAllGroups, createGroup, updateGroup, deleteGroup, assignSkuToGroup, bulkAssignSkusToGroup, type SkuMapping, type ItemGroup } from '../lib/queries';

type AssignFilter = 'all' | 'assigned' | 'unassigned';

export default function ItemGroupingPage() {
  const [skus, setSkus] = useState<SkuMapping[]>([]);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [assignFilter, setAssignFilter] = useState<AssignFilter>('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [bulkGroup, setBulkGroup] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [s, g] = await Promise.all([fetchAllSkusWithMappings(), fetchAllGroups()]);
      setSkus(s); setGroups(g);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return skus.filter(s => {
      // Text search: match SKU name, group name, or "unassigned" for items without a group
      if (q) {
        const matchesSku = s.skuName.toLowerCase().includes(q);
        const matchesGroup = (s.groupName ?? '').toLowerCase().includes(q);
        const matchesUnassigned = !s.groupName && ('unassigned'.includes(q) || 'no group'.includes(q) || 'without group'.includes(q));
        if (!matchesSku && !matchesGroup && !matchesUnassigned) return false;
      }
      // Assign filter dropdown
      if (assignFilter === 'assigned' && !s.groupName) return false;
      if (assignFilter === 'unassigned' && s.groupName) return false;
      return true;
    });
  }, [skus, search, assignFilter]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setBusy(true);
    try { await createGroup(newGroupName.trim()); setNewGroupName(''); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const handleUpdateGroup = async (id: string) => {
    if (!editName.trim()) return;
    setBusy(true);
    try { await updateGroup(id, editName.trim()); setEditingGroup(null); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this group? SKU mappings will be removed.')) return;
    setBusy(true);
    try { await deleteGroup(id); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const handleAssignSku = async (skuName: string, groupId: string) => {
    setBusy(true);
    try { await assignSkuToGroup(skuName, groupId || null); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const handleBulkAssign = async () => {
    if (selectedSkus.size === 0 || !bulkGroup) return;
    setBusy(true);
    try { await bulkAssignSkusToGroup(Array.from(selectedSkus), bulkGroup); setSelectedSkus(new Set()); setBulkGroup(''); await load(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const toggleSku = (sku: string) => {
    setSelectedSkus(prev => { const n = new Set(prev); if (n.has(sku)) n.delete(sku); else n.add(sku); return n; });
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;
  if (err) return <EmptyState title="Error" description={err} icon={<AlertCircle size={28} />} />;

  return (
    <div>
      <PageHeader title="Item Grouping" subtitle={`${skus.length} SKUs, ${groups.length} groups`} icon={<Layers size={20} />} />

      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus size={16} className="text-brand-600" />
          <span className="text-sm font-semibold text-app">Manage Groups</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {groups.map(g => (
            <div key={g.id} className="flex items-center gap-1 rounded-lg border border-app px-3 py-1.5">
              {editingGroup === g.id ? (
                <>
                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-32 rounded border border-app bg-[var(--surface)] px-2 py-1 text-sm text-app outline-none" />
                  <button onClick={() => handleUpdateGroup(g.id)} disabled={busy} className="text-emerald-600"><Save size={14} /></button>
                  <button onClick={() => setEditingGroup(null)} className="text-muted"><X size={14} /></button>
                </>
              ) : (
                <>
                  <Badge tone="brand">{g.name}</Badge>
                  <button onClick={() => { setEditingGroup(g.id); setEditName(g.name); }} className="text-muted hover:text-app"><Layers size={13} /></button>
                  <button onClick={() => handleDeleteGroup(g.id)} disabled={busy} className="text-muted hover:text-rose-500"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}
          <div className="flex items-center gap-1">
            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="New group name…" className="w-40 rounded-lg border border-app bg-[var(--surface)] px-3 py-1.5 text-sm text-app outline-none focus:border-brand-500" onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); }} />
            <button onClick={handleCreateGroup} disabled={busy || !newGroupName.trim()} className="btn-primary text-xs"><Plus size={14} /> Add</button>
          </div>
        </div>
      </Card>

      {selectedSkus.size > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-app">{selectedSkus.size} SKU(s) selected</span>
            <select value={bulkGroup} onChange={e => setBulkGroup(e.target.value)} className="input text-sm sm:w-48">
              <option value="">Select group…</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={handleBulkAssign} disabled={busy || !bulkGroup} className="btn-primary text-xs">Assign to Group</button>
            <button onClick={() => setSelectedSkus(new Set())} className="btn-secondary text-xs">Clear</button>
          </div>
        </Card>
      )}

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU, group, or 'unassigned'…" className="input pl-9 text-sm" />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-app"><X size={14} /></button>}
          </div>
          <select value={assignFilter} onChange={e => setAssignFilter(e.target.value as AssignFilter)} className="input text-sm sm:w-48">
            <option value="all">All Items</option>
            <option value="assigned">Assigned Only</option>
            <option value="unassigned">Unassigned Only</option>
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? <EmptyState title="No SKUs found" description="Try a different search or filter." icon={<Layers size={28} />} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="surface text-xs text-muted">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium w-8">
                    <input type="checkbox" checked={selectedSkus.size === filtered.length && filtered.length > 0} onChange={e => { if (e.target.checked) setSelectedSkus(new Set(filtered.map(s => s.skuName))); else setSelectedSkus(new Set()); }} className="h-4 w-4 cursor-pointer rounded" />
                  </th>
                  <th className="px-5 py-2.5 text-left font-medium">SKU Name</th>
                  <th className="px-5 py-2.5 text-left font-medium">Group</th>
                  <th className="px-5 py-2.5 text-left font-medium">Base Item</th>
                  <th className="px-5 py-2.5 text-center font-medium">Assign</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.skuName} className="border-t border-app transition hover:bg-[var(--surface-2)]">
                    <td className="px-5 py-2.5">
                      <input type="checkbox" checked={selectedSkus.has(s.skuName)} onChange={() => toggleSku(s.skuName)} className="h-4 w-4 cursor-pointer rounded" />
                    </td>
                    <td className="px-5 py-2.5 font-medium text-app">{s.skuName}</td>
                    <td className="px-5 py-2.5">{s.groupName ? <Badge tone="brand">{s.groupName}</Badge> : <Badge tone="warning">Unassigned</Badge>}</td>
                    <td className="px-5 py-2.5 text-muted">{s.baseItem ?? '—'}</td>
                    <td className="px-5 py-2.5 text-center">
                      <select value={s.groupId ?? ''} onChange={e => handleAssignSku(s.skuName, e.target.value)} disabled={busy} className="input text-xs sm:w-40">
                        <option value="">No group</option>
                        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
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
