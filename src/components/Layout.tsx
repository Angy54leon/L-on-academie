import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Link, useLocation } from 'react-router';
import { unreadCount } from '../core/notifications';
import { useAccount } from '../state/account';
import { onBadges, useLearner } from '../state/store';
import { SaveIndicator } from './AccountGate';
import { Modal, toast, Toasts, useOnline } from './ui';

const NAV = [
  { to: '/dashboard', label: 'Tableau de bord', ico: '◎' },
  { to: '/parcours', label: 'Parcours', ico: '🗺️' },
  { to: '/conversation', label: 'Conversation', ico: '💬' },
  { to: '/revision', label: 'Révision', ico: '🧠' },
  { to: '/stats', label: 'Statistiques', ico: '📈' },
  { to: '/social', label: 'Social', ico: '👥' },
  { to: '/parametres', label: 'Paramètres', ico: '⚙️' },
];

const MOBILE = [
  { to: '/dashboard', label: 'Accueil', ico: '◎' },
  { to: '/parcours', label: 'Parcours', ico: '🗺️' },
  { to: '/revision', label: 'Révision', ico: '🧠' },
  { to: '/conversation', label: 'Parler', ico: '💬' },
];

export function Layout({ children }: { children: ReactNode }) {
  const state = useLearner();
  const account = useAccount();
  const online = useOnline();
  const unread = unreadCount(state);
  const [more, setMore] = useState(false);
  const location = useLocation();

  useEffect(() => onBadges((badges) => badges.forEach((b) => toast(`${b.icon} Badge obtenu : ${b.title}`, 'reward', 6000))), []);
  useEffect(() => {
    setMore(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="app">
      <a href="#contenu" className="sr-only">
        Aller au contenu
      </a>
      <aside className="sidebar" aria-label="Navigation principale">
        <Link to="/" className="brand">
          <img src="./icons/icon.svg" alt="" />
          <div>
            <strong>LÉON</strong>
            <span>ACADÉMIE</span>
          </div>
        </Link>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className="nav-link">
              <span className="ico" aria-hidden>
                {n.ico}
              </span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {!account.configured ? (
            'Mode local · données sur cet appareil'
          ) : account.user && account.status !== 'signed-out' ? (
            <Link to="/compte" className="account-link" title="Mon compte">
              <span className="avatar" aria-hidden>
                {(account.user?.email ?? '?').charAt(0).toUpperCase()}
              </span>
              <span className="account-email">{account.user?.email}</span>
            </Link>
          ) : (
            <>
              <span>Sans compte · données sur cet appareil</span>
              <Link to="/connexion" className="btn sm block" style={{ marginTop: 8 }}>
                Se connecter
              </Link>
            </>
          )}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <Link to="/" className="brand-mobile">
            <img src="./icons/icon.svg" alt="" />
            LÉON
          </Link>
          <div className="topbar-spacer" />
          {!online && (
            <span className="badge warn" title="Les leçons, révisions et exercices restent disponibles. L’IA et la synchronisation reprendront au retour de la connexion.">
              ⚡ Hors ligne
            </span>
          )}
          <SaveIndicator />
          <span className="badge accent" title="Points d’expérience gagnés en réussissant des exercices">
            ✦ {state.xp} XP
          </span>
          {account.configured && account.status === 'signed-in' && (
            <Link to="/compte" className="btn icon sm ghost account-btn" aria-label={`Mon compte (${account.user?.email})`} title={account.user?.email}>
              <span className="avatar sm" aria-hidden>
                {(account.user?.email ?? '?').charAt(0).toUpperCase()}
              </span>
            </Link>
          )}
          {account.configured && account.status === 'signed-out' && (
            <Link to="/connexion" className="btn sm ghost">
              Se connecter
            </Link>
          )}
          <Link to="/notifications" className="btn icon sm ghost" style={{ position: 'relative' }} aria-label={`Notifications (${unread} non lues)`}>
            🔔
            {unread > 0 && (
              <span className="badge bad" style={{ position: 'absolute', top: -4, right: -6, padding: '0 6px' }}>
                {unread}
              </span>
            )}
          </Link>
        </header>
        <main id="contenu" className="content">
          {children}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navigation">
        {MOBILE.map((n) => (
          <NavLink key={n.to} to={n.to}>
            <span className="ico" aria-hidden>
              {n.ico}
            </span>
            {n.label}
          </NavLink>
        ))}
        <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog">
          <span className="ico" aria-hidden>
            ☰
          </span>
          Plus
        </button>
      </nav>
      {more && (
        <Modal title="Menu" onClose={() => setMore(false)}>
          <div className="grid grid-2">
            {[...NAV.filter((n) => !MOBILE.some((m) => m.to === n.to)), { to: '/notifications', label: 'Notifications', ico: '🔔' }, ...(account.configured ? [account.status === 'signed-in' ? { to: '/compte', label: 'Mon compte', ico: '👤' } : { to: '/connexion', label: 'Se connecter', ico: '👤' }] : []), { to: '/', label: 'Page d’accueil', ico: '🏠' }].map((n) => (
              <Link key={n.to} to={n.to} className="btn">
                {n.ico} {n.label}
              </Link>
            ))}
          </div>
        </Modal>
      )}
      <Toasts />
    </div>
  );
}
