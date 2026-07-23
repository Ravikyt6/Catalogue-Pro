import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, UserPlus, AlertCircle, CheckCircle, Loader2, FileUp } from 'lucide-react';
import { Card, PageHeader, Badge } from '../components/ui';
import { importExcelFile, type ImportResult } from '../lib/importEngine';
import { fetchSalesWithoutPerson, bulkAssignSalesPerson, type SalesPersonTemplateRow, type BulkSalesPersonResult } from '../lib/queries';
import { exportToExcel } from '../lib/exports';
import { fmtDate } from '../lib/format';
import * as XLSX from 'xlsx';

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importErr, setImportErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateRows, setTemplateRows] = useState<SalesPersonTemplateRow[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkSalesPersonResult | null>(null);
  const [bulkErr, setBulkErr] = useState('');
  const bulkFileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    setImporting(true); setImportErr(''); setImportResult(null);
    try { setImportResult(await importExcelFile(file)); }
    catch (e) { setImportErr(e instanceof Error ? e.message : String(e)); }
    finally { setImporting(false); }
  };

  const downloadTemplate = async () => {
    setTemplateLoading(true); setBulkErr('');
    try {
      const rows = await fetchSalesWithoutPerson();
      setTemplateRows(rows);
      if (rows.length === 0) { setBulkErr('All invoices already have a sales person assigned.'); return; }
      exportToExcel('sales_person_template', ['Invoice Number', 'Invoice Date', 'Party Name', 'GST', 'Sales Person', 'Grand Total'],
        rows.map(r => [r.invoice_number, fmtDate(r.invoice_date), r.party_name, r.party_gstin, '', r.grand_total]));
    } catch (e) { setBulkErr(e instanceof Error ? e.message : String(e)); }
    finally { setTemplateLoading(false); }
  };

  const handleBulkUpload = async (file: File) => {
    setBulkUploading(true); setBulkErr(''); setBulkResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const updateRows = rows.map(r => ({ invoice_number: String(r['Invoice Number'] ?? r['invoice_number'] ?? '').trim(), sales_person: String(r['Sales Person'] ?? r['sales_person'] ?? '').trim() })).filter(r => r.invoice_number && r.sales_person);
      if (updateRows.length === 0) { setBulkErr('No valid rows found. Ensure the file has Invoice Number and Sales Person columns.'); setBulkUploading(false); return; }
      setBulkResult(await bulkAssignSalesPerson(updateRows));
    } catch (e) { setBulkErr(e instanceof Error ? e.message : String(e)); }
    finally { setBulkUploading(false); }
  };

  return (
    <div>
      <PageHeader title="Import" subtitle="Upload Tally Excel files and bulk-assign sales persons" icon={<Upload size={20} />} />
      <Card className="mb-6 p-6">
        <div className="mb-4 flex items-center gap-2"><FileSpreadsheet size={20} className="text-brand-600" /><h2 className="text-base font-semibold text-app">Import Tally Excel</h2></div>
        <p className="mb-4 text-sm text-muted">Upload a sales Excel file exported from Tally. The system will parse invoices, parties, items, and ledger entries automatically.</p>
        <div onClick={() => fileRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-app p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10">
          {importing ? <Loader2 size={32} className="animate-spin text-brand-600" /> : <FileUp size={32} className="text-muted" />}
          <p className="mt-3 text-sm font-medium text-app">{importing ? 'Importing…' : 'Click to select an Excel file'}</p>
          <p className="mt-1 text-xs text-muted">.xlsx, .xls formats supported</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ''; }} />
        </div>
        {importErr && <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"><AlertCircle size={16} className="mt-0.5 shrink-0" />{importErr}</div>}
        {importResult && (
          <div className="mt-4 rounded-xl border border-app bg-[var(--surface-2)] p-4">
            <div className="mb-3 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-600" /><span className="text-sm font-semibold text-app">Import Complete</span></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <ResultStat label="Total" value={importResult.totalRows} />
              <ResultStat label="Imported" value={importResult.imported} tone="success" />
              <ResultStat label="Skipped" value={importResult.skipped} tone="warning" />
              <ResultStat label="Duplicates" value={importResult.duplicates} tone="warning" />
              <ResultStat label="Cancelled" value={importResult.cancelled} />
              <ResultStat label="Failed" value={importResult.failed} tone="danger" />
            </div>
          </div>
        )}
      </Card>
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-2"><UserPlus size={20} className="text-brand-600" /><h2 className="text-base font-semibold text-app">Bulk Assign Sales Person</h2></div>
        <p className="mb-4 text-sm text-muted">Download a template containing only invoices without a sales person. Fill in the Sales Person column, then upload the file to assign them in bulk. Only the Sales Person field is updated — no other data is modified.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-app p-5">
            <div className="mb-3 flex items-center gap-2"><Badge tone="brand">Step 1</Badge><span className="text-sm font-medium text-app">Download Template</span></div>
            <p className="mb-4 text-xs text-muted">Generates an Excel file with all invoices that don't have a sales person assigned yet.</p>
            <button onClick={downloadTemplate} disabled={templateLoading} className="btn-secondary w-full justify-center">{templateLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}{templateLoading ? 'Generating…' : 'Download Sales Person Template'}</button>
            {templateRows.length > 0 && !templateLoading && <p className="mt-2 text-xs text-emerald-600">{templateRows.length} invoices without sales person ready in template.</p>}
          </div>
          <div className="rounded-xl border border-app p-5">
            <div className="mb-3 flex items-center gap-2"><Badge tone="brand">Step 2</Badge><span className="text-sm font-medium text-app"> Upload Filled Template</span></div>
            <p className="mb-4 text-xs text-muted">Upload the Excel file after filling the Sales Person column. The system matches by Invoice Number and updates only the Sales Person field.</p>
            <div onClick={() => bulkFileRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-app p-6 text-center transition hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-900/10">
              {bulkUploading ? <Loader2 size={24} className="animate-spin text-brand-600" /> : <Upload size={24} className="text-muted" />}
              <p className="mt-2 text-xs font-medium text-app">{bulkUploading ? 'Processing…' : 'Click to upload filled Excel'}</p>
              <input ref={bulkFileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleBulkUpload(f); e.target.value = ''; }} />
            </div>
          </div>
        </div>
        {bulkErr && <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"><AlertCircle size={16} className="mt-0.5 shrink-0" />{bulkErr}</div>}
        {bulkResult && (
          <div className="mt-4 rounded-xl border border-app bg-[var(--surface-2)] p-4">
            <div className="mb-3 flex items-center gap-2"><CheckCircle size={18} className="text-emerald-600" /><span className="text-sm font-semibold text-app">Bulk Assign Complete</span></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ResultStat label="Total Rows" value={bulkResult.total} />
              <ResultStat label="Updated" value={bulkResult.updated} tone="success" />
              <ResultStat label="Skipped" value={bulkResult.skipped} tone="warning" />
              <ResultStat label="Failed" value={bulkResult.failed} tone="danger" />
            </div>
            <p className="mt-3 text-xs text-muted">
              {bulkResult.updated > 0 && <span className="text-emerald-600">{bulkResult.updated} invoice(s) updated successfully. </span>}
              {bulkResult.skipped > 0 && <span className="text-amber-600">{bulkResult.skipped} row(s) skipped (invoice not found or empty sales person). </span>}
              {bulkResult.failed > 0 && <span className="text-rose-600">{bulkResult.failed} row(s) failed to update. </span>}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function ResultStat({ label, value, tone = 'ink' }: { label: string; value: number; tone?: string }) {
  const tones: Record<string, string> = { success: 'text-emerald-600', warning: 'text-amber-600', danger: 'text-rose-600', ink: 'text-app' };
  return <div className="rounded-lg border border-app bg-[var(--surface)] p-3 text-center"><p className="text-xs text-muted">{label}</p><p className={`mt-1 text-lg font-bold ${tones[tone] ?? tones.ink}`}>{value}</p></div>;
}
