import Router, { Route } from 'preact-router';
import { I18nProvider } from './i18n';
import { AuthProvider, useAuth } from './auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { SettingsPage } from './pages/Settings';
import { FirmwarePage } from './pages/Firmware';
import { DebugPage } from './pages/Debug';
import { LogPage } from './pages/Log';

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div class="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Router>
        <Route path="/" component={DashboardPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/firmware" component={FirmwarePage} />
        <Route path="/debug" component={DebugPage} />
        <Route path="/log" component={LogPage} />
        <Route default component={DashboardPage} />
      </Router>
    </Layout>
  );
}

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </I18nProvider>
  );
}
