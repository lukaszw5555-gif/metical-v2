import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';

export default function MobileLayout() {
  return (
    <div className="flex flex-col md:flex-row min-h-dvh">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Page content rendered via Outlet */}
      <main className="flex-1 pb-safe-bottom md:pb-0 md:ml-64">
        <Outlet />
      </main>

      {/* Bottom navigation — mobile only */}
      <BottomNav />
    </div>
  );
}
