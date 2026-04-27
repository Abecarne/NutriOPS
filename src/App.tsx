import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AthletesPage } from '@/pages/AthletesPage';
import { AthletePage } from '@/pages/AthletePage';
import { PlansPage } from '@/pages/PlansPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { CheckinPage } from '@/pages/CheckinPage';
import { WeeklyCheckinPage } from '@/pages/WeeklyCheckinPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { DesignDashboard } from '@/pages/DesignDashboard';
import { OnboardingPage } from '@/pages/OnboardingPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/design" element={<DesignDashboard />} />
        <Route path="/checkin/:token" element={<CheckinPage />} />
        <Route path="/weekly-checkin/:token" element={<WeeklyCheckinPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/athletes"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AthletesPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/athletes/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AthletePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/athletes/:id/onboarding"
          element={
            <ProtectedRoute>
              <AppLayout>
                <OnboardingPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/plans"
          element={
            <ProtectedRoute>
              <AppLayout>
                <PlansPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ReportsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
