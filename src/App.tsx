import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import MobileLayout from '@/components/layout/MobileLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Feature pages
import LoginPage from '@/features/auth/LoginPage';
import TasksPage from '@/features/tasks/TasksPage';
import TaskDetailPage from '@/features/tasks/TaskDetailPage';
import InvestmentsPage from '@/features/investments/InvestmentsPage';
import InvestmentDetailPage from '@/features/investments/InvestmentDetailPage';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import SettingsPage from '@/features/settings/SettingsPage';

// Placeholder pages
import ClientsPage from '@/pages/ClientsPage';
import SalesPage from '@/pages/SalesPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Login — standalone page, no bottom nav */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — require auth */}
          <Route element={<ProtectedRoute />}>
            {/* App shell with bottom navigation */}
            <Route element={<MobileLayout />}>
              {/* Tasks */}
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />

              {/* Investments */}
              <Route path="/investments" element={<InvestmentsPage />} />
              <Route path="/investments/:id" element={<InvestmentDetailPage />} />

              {/* Notifications */}
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Placeholders */}
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/sales" element={<SalesPage />} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/tasks" replace />} />
              <Route path="*" element={<Navigate to="/tasks" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
