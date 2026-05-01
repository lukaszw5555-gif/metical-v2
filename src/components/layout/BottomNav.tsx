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
  { to: '/tasks', label: 'Zadania', icon: <ClipboardCheck size={22} /> },
  { to: '/investments', label: 'Inwestycje', icon: <Building2 size={22} /> },
  { to: '/clients', label: 'Klienci', icon: <Users size={22} /> },
  { to: '/sales', label: 'Sprzedaż', icon: <TrendingUp size={22} /> },
  { to: '/settings', label: 'Ustawienia', icon: <Settings size={22} /> },
];

const salesNav: NavItem[] = [
  { to: '/sales/leads', label: 'Leady', icon: <UserPlus size={22} /> },
  { to: '/sales/followup', label: 'Follow-up', icon: <CalendarClock size={22} /> },
  { to: '/sales/offers', label: 'Oferty', icon: <FileText size={22} /> },
  { to: '/tasks', label: 'Powrót', icon: <ArrowLeft size={22} />, isBack: true },
  { to: '/settings', label: 'Ustawienia', icon: <Settings size={22} /> },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isSalesMode = location.pathname.startsWith('/sales');
  const navItems = isSalesMode ? salesNav : standardNav;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-surface-200 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-lg flex items-center justify-around h-16">
        {navItems.map((item) => {
          if (item.isBack) {
            return (
              <button
                key="back"
                onClick={() => navigate('/tasks')}
                className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[56px] text-muted-500 hover:text-primary-500"
              >
                {item.icon}
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors min-w-[56px] ${
                  item.disabled
                    ? 'text-muted-400 pointer-events-auto'
                    : isActive
                      ? 'text-primary-600'
                      : 'text-muted-500 hover:text-primary-500'
                }`
              }
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
