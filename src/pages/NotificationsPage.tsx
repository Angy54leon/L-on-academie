import { useNavigate } from 'react-router';
import { markNotificationsRead } from '../core/learner';
import { PageHead } from '../components/ui';
import { update, useLearner } from '../state/store';

const ICON: Record<string, string> = { info: 'ℹ️', reward: '🏅', review: '🧠', streak: '🔥', program: '🗺️', sync: '🔄', warning: '⚠️' };

export function NotificationsPage() {
  const s = useLearner();
  const nav = useNavigate();
  const unread = s.notifications.filter((n) => !n.read).length;
  return (
    <div style={{ maxWidth: 760 }}>
      <PageHead eyebrow="Notifications" title="Vos rappels">
        <p>Rappels internes à l’application, générés à partir de votre progression. Aucune notification n’est envoyée en dehors de l’application.</p>
      </PageHead>
      <div className="row" style={{ marginBottom: 12 }}>
        <button type="button" className="btn sm" disabled={!unread} onClick={() => update((st) => markNotificationsRead(st))}>
          Tout marquer comme lu
        </button>
        <button type="button" className="btn sm ghost" disabled={!s.notifications.length} onClick={() => update((st) => ({ ...st, notifications: [] }))}>
          Tout effacer
        </button>
      </div>
      {s.notifications.length === 0 && <p className="muted">Aucune notification.</p>}
      <ul className="list card">
        {s.notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className="btn ghost block"
              style={{ justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: 10, borderRadius: 10, fontWeight: n.read ? 400 : 600 }}
              onClick={() => {
                update((st) => markNotificationsRead(st, [n.id]));
                if (n.link) nav(n.link);
              }}
            >
              <span style={{ fontSize: '1.3rem' }} aria-hidden>
                {ICON[n.kind]}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block' }}>
                  {n.title} {!n.read && <span className="badge accent">nouveau</span>}
                </span>
                <span className="small muted" style={{ display: 'block', fontWeight: 400 }}>
                  {n.body}
                </span>
                <span className="tiny muted">{new Date(n.at).toLocaleString('fr-FR')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
