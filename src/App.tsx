import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import MobileLayout from '@/components/layout/MobileLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Feature pages
import LoginPage from '@/features/auth/LoginPage';
import TasksPage from '@/features/tasks/TasksPage';
import TaskDetailPage from '@/features/tasks/TaskDetailPage';
import ArchivedTasksPage from '@/features/tasks/ArchivedTasksPage';
import InvestmentsPage from '@/features/investments/InvestmentsPage';
import InvestmentDetailPage from '@/features/investments/InvestmentDetailPage';
import NotificationsPage from '@/features/notifications/NotificationsPage';
import SettingsPage from '@/features/settings/SettingsPage';

// Sales pages
import SalesDashboardPage from '@/features/sales/pages/SalesDashboardPage';
import LeadsPage from '@/features/sales/pages/LeadsPage';
import LeadDetailPage from '@/features/sales/pages/LeadDetailPage';
import FollowUpPage from '@/features/sales/pages/FollowUpPage';
import OffersPage from '@/features/sales/pages/OffersPage';

// Client pages
import ClientsPage from '@/features/clients/pages/ClientsPage';
import ClientDetailPage from '@/features/clients/pages/ClientDetailPage';

// PV Offer pages
import PvOffersPage from '@/features/offers/pv/pages/PvOffersPage';
import PvOfferFormPage from '@/features/offers/pv/pages/PvOfferFormPage';
import PvOfferDetailPage from '@/features/offers/pv/pages/PvOfferDetailPage';
import PvOfferPrintPage from '@/features/offers/pv/pages/PvOfferPrintPage';
import PvComponentsPage from '@/features/offers/pv/pages/PvComponentsPage';

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
              <Route path="/tasks/archived" element={<ArchivedTasksPage />} />
              <Route path="/tasks/:id" element={<TaskDetailPage />} />

              {/* Investments */}
              <Route path="/investments" element={<InvestmentsPage />} />
              <Route path="/investments/:id" element={<InvestmentDetailPage />} />

              {/* Notifications */}
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Clients */}
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />

              {/* Sales */}
              <Route path="/sales" element={<SalesDashboardPage />} />
              <Route path="/sales/leads" element={<LeadsPage />} />
              <Route path="/sales/leads/:id" element={<LeadDetailPage />} />
              <Route path="/sales/followup" element={<FollowUpPage />} />
              <Route path="/sales/offers" element={<OffersPage />} />

              {/* PV Offers */}
              <Route path="/sales/offers/pv" element={<PvOffersPage />} />
              <Route path="/sales/offers/pv/new" element={<PvOfferFormPage />} />
              <Route path="/sales/offers/pv/:id" element={<PvOfferDetailPage />} />
              <Route path="/sales/offers/pv/:id/edit" element={<PvOfferFormPage />} />
              <Route path="/sales/offers/pv/:id/print" element={<PvOfferPrintPage />} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/pv-components" element={<PvComponentsPage />} />

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
