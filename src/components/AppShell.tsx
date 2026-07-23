import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, ShoppingBag, Users, BookOpen, ArrowLeftRight, RotateCcw, Calculator, Layers, History, Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/import', label: 'Import', icon: Upload },
  { to: '/sales', label: 'Sales', icon: ShoppingBag },
  { to: '/parties', label: 'Parties', icon: Users },
  { to: '/ledger', label: 'Ledger', icon: BookOpen },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/rto-report', label: 'RTO Report', icon: RotateCcw },
  { to: '/costing', label: 'Costing', icon: Calculator },
  { to: '/item-grouping', label: 'Item Grouping', icon: Layers },
  { to: '/history', label: 'History', icon: History },
];

export function AppShell() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  return (
    <div className="flex min-h-screen bg-[var(--surface-2)]">
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-app bg-[var(--surface)] md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">T</div>
          <span className="text-lg font-bold text-app">Tally ERP</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <NavLink key={to} to={to} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-muted hover:bg-[var(--surface-2)] hover:text-app'}`}>
                <Icon size={18} />{label}
              </NavLink>
            );
          })}
        </nav>
        <button onClick={toggle} className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-[var(--surface-2)] hover:text-app">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}{theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        </button>
      </aside>
      <div className="flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-app bg-[var(--surface)] px-4 py-3 md:px-6 md:hidden">
          <span className="text-base font-bold text-app">Tally ERP</span>
          <button onClick={toggle} className="btn-ghost p-2">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
        </header>
        <main className="p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
