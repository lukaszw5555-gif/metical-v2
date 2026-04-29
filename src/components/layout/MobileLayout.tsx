import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function MobileLayout() {
  return (
    <div className="flex flex-col min-h-dvh">
      {/* Page content rendered via Outlet */}
      <main className="flex-1 pb-safe-bottom">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
