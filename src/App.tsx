import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { Layout } from './components/Layout';
import { toast } from './components/ui';
import { consumeStartupWarning, useLearner } from './state/store';
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PathPage, DayPage } from './pages/PathPage';
import { ActivityPage } from './pages/ActivityPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { ReviewPage } from './pages/ReviewPage';
import { NotificationsPage } from './pages/NotificationsPage';

// Pages moins fréquentes chargées à la demande.
const ConversationPage = lazy(() => import('./pages/ConversationPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const SocialPage = lazy(() => import('./pages/SocialPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));

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
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'normal';
  }, [reducedMotion]);
}

/** Remonte la page quand l'URL change (évite de garder l'état d'une activité précédente). */
function Keyed({ children }: { children: React.ReactElement }) {
  const { pathname } = useLocation();
  return <div key={pathname}>{children}</div>;
}

function RequireOnboarding({ children }: { children: React.ReactElement }) {
  const onboarded = useLearner().profile.onboarded;
  return onboarded ? children : <Navigate to="/bienvenue" replace />;
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
        <Suspense fallback={<p className="muted">Chargement…</p>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bienvenue" element={<OnboardingPage />} />
            <Route path="/evaluation/:kind" element={<Keyed><AssessmentPage /></Keyed>} />
            <Route path="/dashboard" element={<RequireOnboarding><DashboardPage /></RequireOnboarding>} />
            <Route path="/parcours" element={<RequireOnboarding><PathPage /></RequireOnboarding>} />
            <Route path="/parcours/jour/:day" element={<RequireOnboarding><DayPage /></RequireOnboarding>} />
            <Route path="/activite/:id" element={<RequireOnboarding><Keyed><ActivityPage /></Keyed></RequireOnboarding>} />
            <Route path="/revision" element={<RequireOnboarding><ReviewPage /></RequireOnboarding>} />
            <Route path="/conversation" element={<RequireOnboarding><ConversationPage /></RequireOnboarding>} />
            <Route path="/stats" element={<RequireOnboarding><StatsPage /></RequireOnboarding>} />
            <Route path="/social" element={<SocialPage />} />
            <Route path="/parametres" element={<SettingsPage />} />
            <Route path="/compte" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/rapport" element={<RequireOnboarding><ReportPage /></RequireOnboarding>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </HashRouter>
  );
}
