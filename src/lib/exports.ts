import * as XLSX from 'xlsx';

export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]): void {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(title: string, headers: string[], rows: (string | number)[][]): void {
  const win = window.open('', '_blank');
  if (!win) return;
  const html = `<html><head><title>${title}</title><style>
    body{font-family:sans-serif;padding:20px} h2{margin-bottom:16px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;font-size:12px}
    th{background:#f1f5f9}
  </style></head><body><h2>${title}</h2>
  <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <script>window.onload=()=>window.print()</script></body></html>`;
  win.document.write(html);
  win.document.close();
}

export function printDocument(title: string, headers: string[], rows: (string | number)[][]): void {
  exportToPDF(title, headers, rows);
}
