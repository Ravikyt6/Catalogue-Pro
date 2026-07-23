import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AppShell } from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import ImportPage from './pages/ImportPage';
import SalesPage from './pages/SalesPage';
import PartiesPage from './pages/PartiesPage';
import PartyDetailsPage from './pages/PartyDetailsPage';
import LedgerPage from './pages/LedgerPage';
import TransactionsPage from './pages/TransactionsPage';
import RtoReportPage from './pages/RtoReportPage';
import CostingPage from './pages/CostingPage';
import ItemGroupingPage from './pages/ItemGroupingPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/parties" element={<PartiesPage />} />
            <Route path="/parties/:id" element={<PartyDetailsPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/rto-report" element={<RtoReportPage />} />
            <Route path="/costing" element={<CostingPage />} />
            <Route path="/item-grouping" element={<ItemGroupingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
