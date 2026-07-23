export function fmtINR(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return d; }
}

export function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

export function getFinancialYear(d?: Date): string {
  const date = d ?? new Date();
  const y = date.getFullYear();
  const m = date.getMonth();
  if (m >= 3) return `FY ${y}-${String(y + 1).slice(2)}`;
  return `FY ${y - 1}-${String(y).slice(2)}`;
}
