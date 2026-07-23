import { useState, useEffect } from 'react';
import { X, RotateCcw, Loader2, Check } from 'lucide-react';
import type { Sale, SaleItem, Party } from '../lib/supabase';
import { fetchSaleItems, processRto, type RtoItemInput } from '../lib/queries';
import { fmtINR } from '../lib/format';

interface Props { sale: Sale; party: Party | null; onClose: () => void; onSuccess: () => void; }

export function RtoModal({ sale, party, onClose, onSuccess }: Props) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Damaged in transit');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { setItems(await fetchSaleItems(sale.id)); }
      catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
      finally { setLoading(false); }
    })();
  }, [sale.id]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); setReturnQtys(p => { const c = { ...p }; delete c[id]; return c; }); }
      else { n.add(id); const it = items.find(i => i.id === id); if (it) setReturnQtys(p => ({ ...p, [id]: (it.quantity ?? 0) - (it.returned_qty ?? 0) })); }
      return n;
    });
  };

  const totalReturnValue = items.filter(i => selected.has(i.id)).reduce((s, i) => s + (returnQtys[i.id] ?? 0) * (i.rate ?? 0), 0);

  const handleSubmit = async () => {
    setSaving(true); setErr('');
    try {
      const rtoItems: RtoItemInput[] = items.filter(i => selected.has(i.id) && (returnQtys[i.id] ?? 0) > 0).map(i => ({ sale_item_id: i.id, item_name: i.name, returned_qty: returnQtys[i.id] ?? 0, reason, return_date: returnDate, remarks }));
      if (rtoItems.length === 0) { setErr('Select at least one item with return qty > 0'); setSaving(false); return; }
      await processRto(sale.id, rtoItems);
      onSuccess();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-app bg-[var(--surface)] shadow-xl">
        <div className="flex items-center justify-between border-b border-app px-5 py-4">
          <div className="flex items-center gap-2"><RotateCcw size={18} className="text-rose-600" /><h3 className="text-base font-semibold text-app">RTO — {sale.invoice_number}</h3></div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-brand-600" /></div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
            {err && <div className="mb-3 rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{err}</div>}
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-[var(--surface-2)] px-4 py-2.5"><span className="text-sm text-muted">Party:</span><span className="text-sm font-medium text-app">{party?.name ?? '—'}</span></div>
            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-app">Select items to return:</p>
              <div className="space-y-2">
                {items.map(it => {
                  const maxQty = (it.quantity ?? 0) - (it.returned_qty ?? 0);
                  const isSel = selected.has(it.id);
                  return (
                    <div key={it.id} className={`flex items-center gap-3 rounded-lg border p-3 transition ${isSel ? 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/20' : 'border-app'}`}>
                      <input type="checkbox" checked={isSel} onChange={() => toggle(it.id)} disabled={maxQty <= 0} className="h-4 w-4 cursor-pointer rounded" />
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-app">{it.name}</p><p className="text-xs text-muted">Sold: {it.quantity} · Already returned: {it.returned_qty ?? 0} · Rate: {fmtINR(it.rate)}</p></div>
                      {isSel && <div className="flex items-center gap-2"><span className="text-xs text-muted">Return:</span><input type="number" min={1} max={maxQty} value={returnQtys[it.id] ?? 0} onChange={e => setReturnQtys(p => ({ ...p, [it.id]: Math.min(Math.max(0, parseInt(e.target.value) || 0), maxQty) }))} className="w-20 rounded-lg border border-app bg-[var(--surface)] px-2 py-1.5 text-right text-sm text-app outline-none focus:border-rose-500" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-medium text-muted">Reason</label><select value={reason} onChange={e => setReason(e.target.value)} className="input text-sm"><option>Damaged in transit</option><option>Wrong item shipped</option><option>Customer cancelled</option><option>Quality issue</option><option>Other</option></select></div>
              <div><label className="mb-1 block text-xs font-medium text-muted">Return Date</label><input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="input text-sm" /></div>
              <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-muted">Remarks</label><input value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes…" className="input text-sm" /></div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-4 py-3">
              <div><p className="text-xs text-muted">Total Return Value</p><p className="text-lg font-bold text-rose-600">{fmtINR(totalReturnValue)}</p></div>
              <div className="text-right"><p className="text-xs text-muted">Net after RTO</p><p className="text-lg font-bold text-app">{fmtINR((sale.sale_amount ?? sale.grand_total ?? 0) - totalReturnValue)}</p></div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 border-t border-app px-5 py-4">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || selected.size === 0} className="btn-primary">{saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}{saving ? 'Processing…' : 'Confirm RTO'}</button>
        </div>
      </div>
    </div>
  );
}
