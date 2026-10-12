import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { Layout } from './components/Layout';
import { PageErrorBoundary } from './components/PageErrorBoundary';
import { importWithRecovery } from './services/chunkRecovery';
import { toast } from './components/ui';
import { AccountGate } from './components/AccountGate';
import { canUseApp, useAccount } from './state/account';
import { consumeStartupWarning, useLearner } from './state/store';
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PathPage, DayPage } from './pages/PathPage';
import { ActivityPage } from './pages/ActivityPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { ReviewPage } from './pages/ReviewPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AccountPage, ForgotPasswordPage, LoginPage, NewPasswordPage, SignupPage } from './pages/AuthPages';

// Pages moins fréquentes chargées à la demande.
const ConversationPage = lazy(() => importWithRecovery(() => import('./pages/ConversationPage')));
const StatsPage = lazy(() => importWithRecovery(() => import('./pages/StatsPage')));
const SocialPage = lazy(() => importWithRecovery(() => import('./pages/SocialPage')));
const SettingsPage = lazy(() => importWithRecovery(() => import('./pages/SettingsPage')));
const ReportPage = lazy(() => importWithRecovery(() => import('./pages/ReportPage')));

function useTheme() {
  const { theme, reducedMotion } = useLearner().settings;
  useEffect(() => {
    const apply = () => {
      const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f4f6ff' : '#0b0f1f');
    };
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    // Anciens Safari (iOS ≤ 13) : seule l'ancienne méthode addListener existe.
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener?.(apply);
    return () => (mq.removeEventListener ? mq.removeEventListener('change', apply) : mq.removeListener?.(apply));
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'normal';
  }, [reducedMotion]);
}

/** Une erreur dans une page n'efface plus toute l'application ; changer de page réinitialise la barrière. */
function RouteBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <PageErrorBoundary key={pathname}>{children}</PageErrorBoundary>;
}

/** Remonte la page quand l'URL change (évite de garder l'état d'une activité précédente). */
function Keyed({ children }: { children: React.ReactElement }) {
  const { pathname } = useLocation();
  return <div key={pathname}>{children}</div>;
}

/** Avec les comptes activés : il faut être connecté ou avoir choisi de continuer sans compte. */
function RequireAccess({ children }: { children: React.ReactElement }) {
  const account = useAccount();
  const { pathname } = useLocation();
  return canUseApp(account) ? children : <Navigate to={`/connexion?suite=${encodeURIComponent(pathname)}`} replace />;
}

function RequireOnboarding({ children }: { children: React.ReactElement }) {
  const onboarded = useLearner().profile.onboarded;
  return <RequireAccess>{onboarded ? children : <Navigate to="/bienvenue" replace />}</RequireAccess>;
}

export function App() {
  useTheme();
  useEffect(() => {
    const w = consumeStartupWarning();
    if (w) toast(w, 'error', 10000);
  }, []);
  return (
    <HashRouter>
      <Layout>
        <AccountGate>
        <RouteBoundary>
        <Suspense fallback={<p className="muted" role="status">Chargement…</p>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/inscription" element={<SignupPage />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
            <Route path="/nouveau-mot-de-passe" element={<NewPasswordPage />} />
            <Route path="/compte" element={<AccountPage />} />
            <Route path="/bienvenue" element={<RequireAccess><OnboardingPage /></RequireAccess>} />
            <Route path="/evaluation/:kind" element={<RequireAccess><Keyed><AssessmentPage /></Keyed></RequireAccess>} />
            <Route path="/dashboard" element={<RequireOnboarding><DashboardPage /></RequireOnboarding>} />
            <Route path="/parcours" element={<RequireOnboarding><PathPage /></RequireOnboarding>} />
            <Route path="/parcours/jour/:day" element={<RequireOnboarding><DayPage /></RequireOnboarding>} />
            <Route path="/activite/:id" element={<RequireOnboarding><Keyed><ActivityPage /></Keyed></RequireOnboarding>} />
            <Route path="/revision" element={<RequireOnboarding><ReviewPage /></RequireOnboarding>} />
            <Route path="/conversation" element={<RequireOnboarding><ConversationPage /></RequireOnboarding>} />
            <Route path="/stats" element={<RequireOnboarding><StatsPage /></RequireOnboarding>} />
            <Route path="/social" element={<RequireAccess><SocialPage /></RequireAccess>} />
            <Route path="/parametres" element={<RequireAccess><SettingsPage /></RequireAccess>} />
            <Route path="/notifications" element={<RequireAccess><NotificationsPage /></RequireAccess>} />
            <Route path="/rapport" element={<RequireOnboarding><ReportPage /></RequireOnboarding>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </RouteBoundary>
        </AccountGate>
      </Layout>
    </HashRouter>
  );
}
