import xlsx from 'xlsx';
import { writeFileSync } from 'fs';

const salesData = [
  { 'Party Name': 'Acme Industries Pvt Ltd', 'GSTIN': '27ABCDE1234F1Z5', 'Phone': '9876543210', 'Invoice No': 'INV-101', 'Invoice Date': '01-Jul-2024', 'Item': 'Steel Rods 12mm', 'HSN': '7213', 'Qty': 100, 'Rate': 150, 'Discount': 0, 'Tax': 2700, 'Shipping': 200, 'Round Off': 0, 'Grand Total': 17900, 'Billing Address': 'Plot 14, MIDC Pune', 'City': 'Pune', 'State': 'Maharashtra', 'Pincode': '411019' },
  { 'Party Name': 'Acme Industries Pvt Ltd', 'GSTIN': '27ABCDE1234F1Z5', 'Phone': '9876543210', 'Invoice No': 'INV-102', 'Invoice Date': '05-Jul-2024', 'Item': 'Steel Sheets', 'HSN': '7208', 'Qty': 50, 'Rate': 320, 'Discount': 500, 'Tax': 4320, 'Shipping': 0, 'Round Off': -20, 'Grand Total': 19800, 'Billing Address': 'Plot 14, MIDC Pune', 'City': 'Pune', 'State': 'Maharashtra', 'Pincode': '411019' },
  { 'Party Name': 'Bharat Traders', 'GSTIN': '29XYZAB5678C1Z9', 'Phone': '9123456780', 'Invoice No': 'INV-103', 'Invoice Date': '10-Jul-2024', 'Item': 'Cement Bags', 'HSN': '2523', 'Qty': 200, 'Rate': 350, 'Discount': 1000, 'Tax': 12600, 'Shipping': 500, 'Round Off': 0, 'Grand Total': 81600, 'Billing Address': 'MG Road Bangalore', 'City': 'Bangalore', 'State': 'Karnataka', 'Pincode': '560001' },
  { 'Party Name': 'Crescent Supplies', 'GSTIN': '33PQRST9012D1Z1', 'Phone': '9988776655', 'Invoice No': 'INV-104', 'Invoice Date': '15-Jul-2024', 'Item': 'PVC Pipes', 'HSN': '3917', 'Qty': 80, 'Rate': 180, 'Discount': 0, 'Tax': 2880, 'Shipping': 120, 'Round Off': 0, 'Grand Total': 17480, 'Billing Address': 'Anna Salai Chennai', 'City': 'Chennai', 'State': 'Tamil Nadu', 'Pincode': '600002' },
];
const ws = xlsx.utils.json_to_sheet(salesData);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, 'Sale Register');
writeFileSync('/tmp/cc-agent/69094916/project/public/sale_register_sample.xlsx', xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
console.log('Wrote sale_register_sample.xlsx');

const receipts = [
  { 'Party Name': 'Acme Industries Pvt Ltd', 'GSTIN': '27ABCDE1234F1Z5', 'Receipt No': 'RCPT-10', 'Date': '03-Jul-2024', 'Amount': 5000, 'Mode': 'Bank', 'Against': 'INV-101' },
  { 'Party Name': 'Acme Industries Pvt Ltd', 'GSTIN': '27ABCDE1234F1Z5', 'Receipt No': 'RCPT-11', 'Date': '06-Jul-2024', 'Amount': 12900, 'Mode': 'Cash', 'Against': 'INV-102' },
];
const ws2 = xlsx.utils.json_to_sheet(receipts);
const wb2 = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb2, ws2, 'Receipt');
writeFileSync('/tmp/cc-agent/69094916/project/public/receipt_sample.xlsx', xlsx.write(wb2, { type: 'buffer', bookType: 'xlsx' }));
console.log('Wrote receipt_sample.xlsx');

const cns = [
  { 'Party Name': 'Bharat Traders', 'GSTIN': '29XYZAB5678C1Z9', 'Credit Note No': 'CN-12', 'Date': '05-Jul-2024', 'Amount': 1000, 'Against': 'INV-103', 'Reason': 'Damaged goods return' },
];
const ws3 = xlsx.utils.json_to_sheet(cns);
const wb3 = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb3, ws3, 'Credit Note');
writeFileSync('/tmp/cc-agent/69094916/project/public/credit_note_sample.xlsx', xlsx.write(wb3, { type: 'buffer', bookType: 'xlsx' }));
console.log('Wrote credit_note_sample.xlsx');
