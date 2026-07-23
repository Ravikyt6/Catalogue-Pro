import { useState, useEffect } from 'react';
import { X, Loader2, RotateCcw, FileText, TrendingUp, DollarSign, Save, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { supabase, type Sale, type SaleItem, type Party, EXPENSE_TYPES, type ExpenseType } from '../lib/supabase';
import { fetchSaleItems, updateSaleExpense, updateSalePerson } from '../lib/queries';
import { fmtINR, fmtDate } from '../lib/format';
import { RtoModal } from './RtoModal';

interface Props { voucherType: string | null; voucherId: string | null; onClose: () => void; }

export function VoucherDrawer({ voucherType, voucherId, onClose }: Props) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [party, setParty] = useState<Party | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [rtoOpen, setRtoOpen] = useState(false);
  const [itemsExpanded, setItemsExpanded] = useState(true);
  const [expenses, setExpenses] = useState<Record<string, number>>({});
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseFlash, setExpenseFlash] = useState(false);
  const [salesPerson, setSalesPerson] = useState('');
  const [savingPerson, setSavingPerson] = useState(false);
  const [personFlash, setPersonFlash] = useState(false);

  useEffect(() => {
    if (!voucherId || !voucherType) { setSale(null); setItems([]); setParty(null); return; }
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.from('sales').select('*').eq('id', voucherId).maybeSingle();
        if (error) throw error;
        const saleData = data as Sale;
        setSale(saleData);
        setSalesPerson(saleData?.sales_person ?? '');
        const breakdown = (saleData?.expense_breakdown as Record<string, number> | null) ?? {};
        setExpenses(Object.keys(breakdown).length > 0 ? breakdown : {});
        if (saleData) {
          setItems(await fetchSaleItems(voucherId));
          if (saleData.party_id) {
            const { data: partyData } = await supabase.from('parties').select('*').eq('id', saleData.party_id).maybeSingle();
            setParty(partyData as Party);
          }
        }
      } catch { setSale(null); }
      finally { setLoading(false); }
    })();
  }, [voucherId, voucherType]);

  const totalCost = items.reduce((s, it) => { const n = (it.quantity ?? 0) - (it.returned_qty ?? 0); return s + n * (it.cost_price ?? 0); }, 0);
  const grandTotal = sale?.grand_total ?? 0;
  const totalExpense = Object.values(expenses).reduce((s, v) => s + (v || 0), 0);
  const grossProfit = grandTotal - totalCost;
  const netProfit = grossProfit - totalExpense;

  const saveExpense = async () => {
    if (!sale) return;
    setSavingExpense(true);
    try {
      const clean: Record<string, number> = {};
      for (const [k, v] of Object.entries(expenses)) { if (v && v > 0) clean[k] = v; }
      await updateSaleExpense(sale.id, clean);
      setSale(prev => prev ? { ...prev, expense_breakdown: clean, expense: totalExpense } : prev);
      setExpenses(clean);
      setExpenseFlash(true); setTimeout(() => setExpenseFlash(false), 2000);
    } catch { /* ignore */ } finally { setSavingExpense(false); }
  };

  const saveSalesPerson = async () => {
    if (!sale) return;
    setSavingPerson(true);
    try {
      const person = salesPerson.trim() || null;
      await updateSalePerson(sale.id, person);
      setSale(prev => prev ? { ...prev, sales_person: person } : prev);
      setPersonFlash(true); setTimeout(() => setPersonFlash(false), 2000);
    } catch { /* ignore */ } finally { setSavingPerson(false); }
  };

  const addExpenseType = (type: ExpenseType) => { if (expenses[type] === undefined) setExpenses(prev => ({ ...prev, [type]: 0 })); };
  const removeExpenseType = (type: string) => setExpenses(prev => { const n = { ...prev }; delete n[type]; return n; });
  const updateExpenseValue = (type: string, value: string) => setExpenses(prev => ({ ...prev, [type]: parseFloat(value) || 0 }));
  const availableTypes = EXPENSE_TYPES.filter(t => expenses[t] === undefined);

  if (!voucherType || !voucherId) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-app bg-[var(--surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-app px-5 py-4">
            <div className="flex items-center gap-2"><FileText size={18} className="text-brand-600" /><h3 className="text-base font-semibold text-app">Voucher Details</h3></div>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
          </div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center"><Loader2 size={24} className="animate-spin text-brand-600" /></div>
          ) : sale ? (
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="mb-5 rounded-xl border border-app bg-[var(--surface-2)] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Invoice Number</p>
                <p className="mt-1 text-lg font-bold text-app">{sale.invoice_number}</p>
              </div>
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Party</p>
                <div className="rounded-xl border border-app p-4">
                  <p className="text-sm font-semibold text-app">{party?.name ?? '—'}</p>
                  {party?.gstin && <p className="mt-0.5 text-xs text-muted">GSTIN: {party.gstin}</p>}
                  {party?.state && <p className="mt-0.5 text-xs text-muted">State: {party.state}</p>}
                  {sale.buyer_address && <p className="mt-1 text-xs text-muted">{sale.buyer_address}</p>}
                  {sale.consignee && <p className="mt-1 text-xs text-muted">Consignee: {sale.consignee}</p>}
                </div>
              </div>
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Sales Person</p>
                <div className="flex items-center gap-2">
                  <input value={salesPerson} onChange={e => setSalesPerson(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveSalesPerson(); }} placeholder="Assign sales person…" className="input text-sm" />
                  <button onClick={saveSalesPerson} disabled={savingPerson || salesPerson.trim() === (sale.sales_person ?? '').trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40">
                    {savingPerson ? <Loader2 size={15} className="animate-spin" /> : personFlash ? <span className="text-xs">✓</span> : <Save size={15} />}
                  </button>
                </div>
              </div>
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Invoice Summary</p>
                <div className="rounded-xl border border-app overflow-hidden">
                  <div className="grid grid-cols-2 text-sm">
                    <SummaryRow label="Invoice Date" value={fmtDate(sale.invoice_date)} />
                    <SummaryRow label="Status" value={sale.status} />
                    <SummaryRow label="Financial Year" value={sale.financial_year} />
                    <SummaryRow label="Taxable Value" value={fmtINR(sale.taxable_value ?? 0)} />
                    <SummaryRow label="Subtotal" value={fmtINR(sale.subtotal)} />
                    <SummaryRow label="Discount" value={fmtINR(sale.discount)} />
                    <SummaryRow label="Packing Charges" value={fmtINR(sale.packing_charges ?? 0)} />
                    <SummaryRow label="Sale Amount" value={fmtINR(sale.sale_amount ?? 0)} />
                    <SummaryRow label="Gross Invoice Total" value={fmtINR(sale.gross_invoice_total ?? 0)} />
                    <SummaryRow label="CGST" value={fmtINR(sale.cgst ?? 0)} />
                    <SummaryRow label="SGST" value={fmtINR(sale.sgst ?? 0)} />
                    <SummaryRow label="IGST" value={fmtINR(sale.igst ?? 0)} />
                    <SummaryRow label="Shipping" value={fmtINR(sale.shipping)} />
                    <SummaryRow label="Round Off" value={fmtINR(sale.round_off)} />
                  </div>
                  <div className="border-t-2 border-app bg-[var(--surface-2)]"><SummaryRow label="Grand Total" value={fmtINR(sale.grand_total)} bold /></div>
                  <div className="border-t border-app">
                    <SummaryRow label="Outstanding" value={fmtINR(sale.outstanding ?? 0)} />
                    <SummaryRow label="Received" value={fmtINR(sale.received ?? 0)} />
                    <SummaryRow label="Due" value={fmtINR(sale.due ?? 0)} bold />
                  </div>
                </div>
              </div>
              <div className="mb-5">
                <button onClick={() => setItemsExpanded(!itemsExpanded)} className="mb-2 flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted transition hover:text-app">
                  {itemsExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}Items ({items.length})
                </button>
                {itemsExpanded && (
                  <div className="space-y-2">
                    {items.map(it => {
                      const netQty = (it.quantity ?? 0) - (it.returned_qty ?? 0);
                      return (
                        <div key={it.id} className="rounded-lg border border-app p-3">
                          <p className="text-sm font-medium text-app">{it.name}</p>
                          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
                            <span>Qty: {it.quantity}</span><span>Rate: {fmtINR(it.rate)}</span>
                            <span>Returned: {it.returned_qty ?? 0}</span><span>Net Qty: {netQty}</span>
                            <span>Amount: {fmtINR(it.amount)}</span><span>Cost: {fmtINR(it.cost_price ?? 0)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mb-5 rounded-xl border border-app overflow-hidden">
                <div className="border-b border-app bg-[var(--surface-2)] px-4 py-2.5"><p className="text-xs font-semibold uppercase tracking-wide text-muted">Profit & Expense</p></div>
                <div className="px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted">Grand Total</span><span className="text-sm font-bold text-app">{fmtINR(grandTotal)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted">Total Cost (items)</span><span className="text-sm font-medium text-rose-600">- {fmtINR(totalCost)}</span></div>
                  <div className="flex items-center justify-between border-t border-app pt-3"><span className="text-sm font-medium text-app">Gross Profit</span><span className={`text-sm font-bold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtINR(grossProfit)}</span></div>
                  <div className="border-t border-app pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2"><DollarSign size={15} className="text-amber-500" /><span className="text-sm font-medium text-app">Expenses</span></div>
                      {availableTypes.length > 0 && (
                        <div className="flex items-center gap-1">
                          {availableTypes.map(type => (
                            <button key={type} onClick={() => addExpenseType(type)} className="flex items-center gap-1 rounded-lg border border-app px-2 py-1 text-xs text-muted transition hover:bg-[var(--surface-2)] hover:text-app"><Plus size={11} /> {type}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {Object.keys(expenses).length === 0 ? (
                      <p className="text-xs text-muted">Click an expense type above to add it.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(expenses).map(([type, value]) => (
                          <div key={type} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2"><span className="text-sm text-muted">{type}</span><button onClick={() => removeExpenseType(type)} className="text-muted transition hover:text-rose-500"><Trash2 size={12} /></button></div>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">₹</span>
                              <input type="number" step="0.01" min="0" value={value || ''} onChange={e => updateExpenseValue(type, e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveExpense(); }} placeholder="0" className="w-32 rounded-lg border border-app bg-[var(--surface)] px-3 py-2 pl-7 text-right text-sm text-app outline-none focus:border-brand-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {Object.keys(expenses).length > 0 && (
                      <div className="mt-2 flex items-center justify-between border-t border-app pt-2"><span className="text-sm text-muted">Total Expense</span><span className="text-sm font-medium text-amber-600">- {fmtINR(totalExpense)}</span></div>
                    )}
                  </div>
                  {Object.keys(expenses).length > 0 && (
                    <div className="flex justify-end"><button onClick={saveExpense} disabled={savingExpense} className="btn-primary text-xs">{savingExpense ? <Loader2 size={14} className="animate-spin" /> : expenseFlash ? <span className="text-xs">Saved</span> : <Save size={14} />}{savingExpense ? 'Saving…' : expenseFlash ? 'Saved!' : 'Save Expenses'}</button></div>
                  )}
                  <div className="flex items-center justify-between border-t-2 border-app pt-3">
                    <div className="flex items-center gap-2"><TrendingUp size={16} className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} /><span className="text-sm font-semibold text-app">Net Profit (after expense)</span></div>
                    <span className={`text-lg font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtINR(netProfit)}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setRtoOpen(true)} className="btn w-full justify-center border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:hover:bg-rose-900/30"><RotateCcw size={16} /> Mark RTO</button>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">Voucher not found.</div>
          )}
        </div>
      </div>
      {rtoOpen && sale && <RtoModal sale={sale} party={party} onClose={() => setRtoOpen(false)} onSuccess={() => { setRtoOpen(false); onClose(); }} />}
    </>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-app px-4 py-2.5 last:border-b-0">
      <span className={`text-xs ${bold ? 'font-semibold text-app' : 'text-muted'}`}>{label}</span>
      <span className={`text-xs ${bold ? 'font-bold text-app' : 'font-medium text-app'}`}>{value}</span>
    </div>
  );
}
