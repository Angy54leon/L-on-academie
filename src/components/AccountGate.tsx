// Écrans affichés pendant la vérification de la session et la restauration de la progression,
// pour ne jamais montrer un tableau de bord vide ou périmé à la place de la vraie progression.
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { useSaveState, saveNow } from '../services/autosave';
import { continueWithCache, resolveGuestChoice, retryRestore, signOutFlow } from '../services/session';
import { useAccount } from '../state/account';

function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="auth-wrap" role="status" aria-live="polite">
      <div className="card glow auth-card center">
        <img src="./icons/icon.svg" alt="" width={56} height={56} className="float" />
        <h1 style={{ fontSize: '1.4rem', marginTop: 12 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function AccountGate({ children }: { children: ReactNode }) {
  const account = useAccount();
  if (account.status === 'loading') return <Screen title="Connexion…" />;
  if (account.status === 'restoring')
    return (
      <Screen title="Récupération de votre progression…">
        <p className="muted small">{account.user?.email}</p>
        <div className="progress" style={{ marginTop: 12 }}>
          <div className="indeterminate" />
        </div>
      </Screen>
    );
  if (account.status === 'restore-error')
    return (
      <Screen title="Impossible de récupérer votre progression">
        <p className="small">{account.restoreError}</p>
        <p className="small muted">Votre progression en ligne n’a pas été modifiée. Réessayez dans un instant.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn primary" onClick={retryRestore}>
            Réessayer
          </button>
          {account.canUseCache && (
            <button type="button" className="btn" onClick={() => continueWithCache()}>
              Continuer avec la copie de cet appareil
            </button>
          )}
          <button type="button" className="btn ghost" onClick={() => void signOutFlow()}>
            Se déconnecter
          </button>
        </div>
      </Screen>
    );
  if (account.status === 'choice' && account.choice) {
    const c = account.choice;
    return (
      <Screen title="Des données existent déjà sur cet appareil">
        <p className="small">
          Votre compte contient déjà une progression ({c.accountDays} jour(s) validé(s), {c.accountAnswers} réponses). Cet appareil contient aussi une progression faite sans compte ({c.deviceDays} jour(s), {c.deviceAnswers} réponses).
        </p>
        <div className="stack" style={{ textAlign: 'left' }}>
          <button type="button" className="btn primary block" onClick={() => resolveGuestChoice('merge')}>
            Réunir les deux progressions dans mon compte (recommandé)
          </button>
          <button type="button" className="btn block" onClick={() => resolveGuestChoice('ignore')}>
            Garder seulement la progression du compte
          </button>
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          Rien n’est supprimé : si vous choisissez de garder seulement le compte, les données sans compte restent sur cet appareil.
        </p>
      </Screen>
    );
  }
  return <>{children}</>;
}

/** Indicateur discret de l'état de la sauvegarde (barre du haut). */
export function SaveIndicator() {
  const account = useAccount();
  const save = useSaveState();
  const location = useLocation();
  if (account.status === 'signed-out' && account.configured && account.guestMode) {
    return (
      <Link to={`/inscription?suite=${encodeURIComponent(location.pathname)}`} className="badge warn save-pill" title="Vos données restent sur cet appareil. Créez un compte pour les sauvegarder en ligne.">
        💾 <span className="save-text">Sans compte · sauvegarder en ligne</span>
      </Link>
    );
  }
  if (account.status !== 'signed-in' || save.status === 'disabled') return null;
  const map = {
    pending: { cls: '', icon: '●', text: 'Modifications en attente…' },
    saving: { cls: '', icon: '⟳', text: 'Sauvegarde en cours…' },
    saved: { cls: 'good', icon: '✓', text: 'Progression sauvegardée' },
    offline: { cls: 'warn', icon: '⚡', text: 'Hors ligne — en attente' },
    error: { cls: 'bad', icon: '⚠', text: 'Problème de sauvegarde — nouvelle tentative…' },
  } as const;
  const m = map[save.status];
  const title = [save.message, save.lastSavedAt ? `Dernière sauvegarde : ${new Date(save.lastSavedAt).toLocaleTimeString('fr-FR')}` : ''].filter(Boolean).join(' · ');
  return (
    <button
      type="button"
      className={`badge ${m.cls} save-pill`}
      title={title || m.text}
      aria-label={`${m.text}${save.message ? `. ${save.message}` : ''}`}
      onClick={() => (save.status === 'error' || save.status === 'pending' ? void saveNow() : undefined)}
      data-save-status={save.status}
    >
      <span aria-hidden className={save.status === 'saving' ? 'spin' : ''}>
        {m.icon}
      </span>{' '}
      <span className="save-text">{m.text}</span>
    </button>
  );
}
