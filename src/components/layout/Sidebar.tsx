import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Building2,
  Users,
  TrendingUp,
  Settings,
  ArrowLeft,
  UserPlus,
  CalendarClock,
  FileText,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  isBack?: boolean;
}

const standardNav: NavItem[] = [
  { to: '/tasks', label: 'Zadania', icon: <ClipboardCheck size={20} /> },
  { to: '/investments', label: 'Inwestycje', icon: <Building2 size={20} /> },
  { to: '/clients', label: 'Klienci', icon: <Users size={20} /> },
  { to: '/sales', label: 'Sprzedaż', icon: <TrendingUp size={20} /> },
  { to: '/settings', label: 'Ustawienia', icon: <Settings size={20} /> },
];

const salesNav: NavItem[] = [
  { to: '/sales/leads', label: 'Leady', icon: <UserPlus size={20} /> },
  { to: '/sales/followup', label: 'Follow-up', icon: <CalendarClock size={20} /> },
  { to: '/sales/offers', label: 'Oferty', icon: <FileText size={20} /> },
  { to: '/tasks', label: 'Powrót', icon: <ArrowLeft size={20} />, isBack: true },
  { to: '/settings', label: 'Ustawienia', icon: <Settings size={20} /> },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isSalesMode = location.pathname.startsWith('/sales');
  const navItems = isSalesMode ? salesNav : standardNav;

  const linkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-primary-50 text-primary-700 font-semibold border-l-[3px] border-primary-600 ml-0 pl-[13px]'
        : 'text-muted-600 hover:bg-surface-50 hover:text-gray-900'
    }`;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-white border-r border-surface-200 z-40">
      {/* Logo / App name */}
      <div className="h-16 flex items-center px-6 border-b border-surface-100">
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">
          METICAL<span className="text-primary-600">.</span>
        </h2>
        {isSalesMode && (
          <span className="ml-2 px-2 py-0.5 rounded-md bg-primary-50 text-primary-600 text-[10px] font-bold uppercase tracking-wider">
            Sprzedaż
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.isBack) {
            return (
              <button
                key="back"
                onClick={() => navigate('/tasks')}
                className={linkClass(false) + ' w-full'}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => linkClass(isActive)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="px-4 py-3 border-t border-surface-100">
        <p className="text-[10px] text-muted-400 text-center">METICAL V2</p>
      </div>
    </aside>
  );
}
