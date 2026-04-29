import { NavLink } from 'react-router-dom';
import {
  ClipboardCheck,
  Building2,
  Users,
  TrendingUp,
  Settings,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    to: '/tasks',
    label: 'Zadania',
    icon: <ClipboardCheck size={22} />,
  },
  {
    to: '/investments',
    label: 'Inwestycje',
    icon: <Building2 size={22} />,
  },
  {
    to: '/clients',
    label: 'Klienci',
    icon: <Users size={22} />,
    disabled: true,
  },
  {
    to: '/sales',
    label: 'Sprzedaż',
    icon: <TrendingUp size={22} />,
    disabled: true,
  },
  {
    to: '/settings',
    label: 'Ustawienia',
    icon: <Settings size={22} />,
  },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-surface-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-lg flex items-center justify-around h-16">
        {navItems.map((item) => (
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
        ))}
      </div>
    </nav>
  );
}
