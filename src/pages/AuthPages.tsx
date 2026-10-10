// Pages de compte : inscription, connexion, mot de passe oublié, nouveau mot de passe, mon compte.
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import {
  deleteAccount,
  deleteRemoteData,
  PASSWORD_MIN,
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signUp,
  updatePassword,
  validateEmail,
  validatePassword,
} from '../services/auth';
import { checkRemote, saveNow, useSaveState } from '../services/autosave';
import { afterAccountDeleted, chooseGuestMode, signOutFlow } from '../services/session';
import { useAccount } from '../state/account';
import { useLearner } from '../state/store';

// ------------------------------------------------------------------ Éléments communs

function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="auth-wrap">
      <div className="card glow auth-card">
        <div className="auth-brand">
          <img src="./icons/icon.svg" alt="" width={44} height={44} />
          <div>
            <strong>LÉON</strong>
            <span>ACADÉMIE</span>
          </div>
        </div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
        {children}
      </div>
      {footer && <div className="auth-footer">{footer}</div>}
    </div>
  );
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  hint,
  autoFocus,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  autoComplete?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
        />
        {isPassword && (
          <button type="button" className="btn ghost sm reveal" onClick={() => setVisible(!visible)} aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
            {visible ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {error ? (
        <div className="field-error" id={`${id}-err`} role="alert">
          {error}
        </div>
      ) : hint ? (
        <div className="field-hint" id={`${id}-hint`}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function NotConfigured() {
  return (
    <AuthCard title="Comptes non configurés" subtitle="Cette installation fonctionne en mode local : vos données restent sur cet appareil.">
      <p className="small">
        Pour activer les comptes et la sauvegarde en ligne, le propriétaire du site doit renseigner les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> (voir le README).
      </p>
      <Link to="/dashboard" className="btn primary block">
        Continuer en mode local
      </Link>
    </AuthCard>
  );
}

/** Redirige vers la page demandée une fois la progression restaurée. */
function useRedirectWhenSignedIn() {
  const account = useAccount();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('suite') || '/dashboard';
  useEffect(() => {
    if (account.status === 'signed-in') nav(next.startsWith('/') ? next : '/dashboard', { replace: true });
  }, [account.status, nav, next]);
}

// ------------------------------------------------------------------ Connexion

export function LoginPage() {
  const account = useAccount();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const nav = useNavigate();
  useRedirectWhenSignedIn();
  if (!account.configured) return <NotConfigured />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = { email: validateEmail(email), password: password ? null : 'Indiquez votre mot de passe.' };
    setErrors(errs);
    if (errs.email || errs.password) return;
    setBusy(true);
    setMsg(null);
    const r = await signIn(email, password);
    setBusy(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.message });
      setUnconfirmed(/confirmée/.test(r.message));
    }
  };

  return (
    <AuthCard
      title="Connexion"
      subtitle="Retrouvez votre progression sur tous vos appareils."
      footer={
        <>
          Pas encore de compte ? <Link to={`/inscription${params.get('suite') ? `?suite=${encodeURIComponent(params.get('suite')!)}` : ''}`}>Créer un compte</Link>
        </>
      }
    >
      {account.notice && <div className="notice info small" style={{ marginBottom: 12 }}>{account.notice}</div>}
      <form onSubmit={submit} noValidate>
        <Field label="Adresse e-mail" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" autoFocus />
        <Field label="Mot de passe" type="password" value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
        <div className="row between" style={{ margin: '4px 0 16px' }}>
          <Link to={`/mot-de-passe-oublie${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="small">
            Mot de passe oublié ?
          </Link>
        </div>
        {msg && (
          <div className={`notice small ${msg.ok ? 'good' : 'bad'}`} role="alert" style={{ marginBottom: 12 }}>
            {msg.text}
            {unconfirmed && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn sm" onClick={async () => {
                    const r = await resendConfirmation(email);
                    setMsg({ ok: r.ok, text: r.message });
                  }}>
                  Renvoyer l’e-mail de confirmation
                </button>
              </div>
            )}
          </div>
        )}
        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <hr className="sep" />
      <button
        type="button"
        className="btn ghost block"
        onClick={() => {
          chooseGuestMode();
          nav('/dashboard');
        }}
      >
        Continuer sans compte (données sur cet appareil uniquement)
      </button>
    </AuthCard>
  );
}

// ------------------------------------------------------------------ Inscription

export function SignupPage() {
  const account = useAccount();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null; confirm?: string | null }>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useRedirectWhenSignedIn();
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  if (!account.configured) return <NotConfigured />;

  if (sentTo) {
    return (
      <AuthCard title="Vérifiez votre boîte mail 📬" subtitle={`Un e-mail de confirmation a été envoyé à ${sentTo}.`}>
        <ol className="small">
          <li>Ouvrez l’e-mail « Confirm your signup » (pensez aux courriers indésirables).</li>
          <li>Cliquez sur le lien <strong>depuis ce navigateur</strong> : vous serez connecté automatiquement.</li>
          <li>Si vous ouvrez le lien sur un autre appareil, revenez ici et connectez-vous.</li>
        </ol>
        {msg && <div className="notice small" style={{ marginBottom: 10 }}>{msg}</div>}
        <div className="row">
          <button
            type="button"
            className="btn"
            disabled={cooldown > 0}
            onClick={async () => {
              const r = await resendConfirmation(sentTo);
              setMsg(r.message);
              setCooldown(60);
            }}
          >
            {cooldown ? `Renvoyer (${cooldown} s)` : 'Renvoyer l’e-mail'}
          </button>
          <Link to={`/connexion?email=${encodeURIComponent(sentTo)}`} className="btn primary">
            J’ai confirmé : me connecter
          </Link>
        </div>
      </AuthCard>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: !confirm ? 'Confirmez votre mot de passe.' : confirm !== password ? 'Les deux mots de passe ne correspondent pas.' : null,
    };
    setErrors(errs);
    if (errs.email || errs.password || errs.confirm) return;
    setBusy(true);
    setMsg(null);
    const r = await signUp(email, password);
    setBusy(false);
    if (!r.ok) setMsg(r.message);
    else if (r.needsConfirmation) {
      setSentTo(email.trim());
      setCooldown(60);
    }
  };

  return (
    <AuthCard
      title="Créer un compte"
      subtitle="Gratuit. Votre progression sera sauvegardée automatiquement et retrouvée sur tous vos appareils."
      footer={
        <>
          Déjà inscrit ? <Link to={`/connexion${params.get('suite') ? `?suite=${encodeURIComponent(params.get('suite')!)}` : ''}`}>Se connecter</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field label="Adresse e-mail" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="email" autoFocus />
        <Field label="Mot de passe" type="password" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" hint={`Au moins ${PASSWORD_MIN} caractères, avec une lettre et un chiffre.`} />
        <Field label="Confirmation du mot de passe" type="password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
        {msg && (
          <div className="notice bad small" role="alert" style={{ marginBottom: 12 }}>
            {msg}
          </div>
        )}
        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? 'Création du compte…' : 'Créer mon compte'}
        </button>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          Si vous avez déjà commencé sans compte sur cet appareil, votre progression sera transférée dans votre nouveau compte.
        </p>
      </form>
    </AuthCard>
  );
}

// ------------------------------------------------------------------ Mot de passe oublié

export function ForgotPasswordPage() {
  const account = useAccount();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!account.configured) return <NotConfigured />;
  return (
    <AuthCard title="Mot de passe oublié" subtitle="Indiquez votre adresse : nous vous enverrons un lien pour choisir un nouveau mot de passe." footer={<Link to="/connexion">← Retour à la connexion</Link>}>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const err = validateEmail(email);
          setError(err);
          if (err) return;
          setBusy(true);
          const r = await requestPasswordReset(email);
          setMsg({ ok: r.ok, text: r.message });
          setBusy(false);
        }}
      >
        <Field label="Adresse e-mail" type="email" value={email} onChange={setEmail} error={error} autoComplete="email" autoFocus />
        {msg && (
          <div className={`notice small ${msg.ok ? 'good' : 'bad'}`} role="status" style={{ marginBottom: 12 }}>
            {msg.text}
          </div>
        )}
        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? 'Envoi…' : 'Recevoir le lien'}
        </button>
      </form>
    </AuthCard>
  );
}

// ------------------------------------------------------------------ Nouveau mot de passe (après le lien e-mail)

export function NewPasswordPage() {
  const account = useAccount();
  const nav = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!account.configured) return <NotConfigured />;
  if (account.status !== 'signed-in') {
    return (
      <AuthCard title="Lien expiré" subtitle="Pour choisir un nouveau mot de passe, ouvrez le lien reçu par e-mail dans ce navigateur, ou demandez-en un nouveau.">
        <Link to="/mot-de-passe-oublie" className="btn primary block">
          Demander un nouveau lien
        </Link>
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Nouveau mot de passe" subtitle={`Compte : ${account.user?.email}`}>
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const errs = { password: validatePassword(password), confirm: confirm !== password ? 'Les deux mots de passe ne correspondent pas.' : null };
          setErrors(errs);
          if (errs.password || errs.confirm) return;
          setBusy(true);
          const r = await updatePassword(password);
          setBusy(false);
          setMsg({ ok: r.ok, text: r.message });
          if (r.ok) setTimeout(() => nav('/dashboard'), 1200);
        }}
      >
        <Field label="Nouveau mot de passe" type="password" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" hint={`Au moins ${PASSWORD_MIN} caractères, avec une lettre et un chiffre.`} autoFocus />
        <Field label="Confirmation" type="password" value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
        {msg && (
          <div className={`notice small ${msg.ok ? 'good' : 'bad'}`} role="status" style={{ marginBottom: 12 }}>
            {msg.text}
          </div>
        )}
        <button type="submit" className="btn primary block" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
        </button>
      </form>
    </AuthCard>
  );
}

// ------------------------------------------------------------------ Mon compte

const STATUS_TEXT: Record<string, string> = {
  disabled: 'Sauvegarde en ligne inactive',
  pending: 'Modifications en attente d’envoi',
  saving: 'Sauvegarde en cours…',
  saved: 'Progression sauvegardée en ligne',
  offline: 'Hors ligne — modifications en attente',
  error: 'Problème de sauvegarde',
};

export function AccountPage() {
  const account = useAccount();
  const save = useSaveState();
  const s = useLearner();
  const nav = useNavigate();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwErrors, setPwErrors] = useState<{ password?: string | null; confirm?: string | null }>({});
  if (!account.configured) return <NotConfigured />;
  if (account.status !== 'signed-in') return <Navigate to="/connexion?suite=/compte" replace />;
  const run = async (fn: () => Promise<{ ok: boolean; message: string }>) => {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setMsg({ ok: r.ok, text: r.message });
    setBusy(false);
    return r;
  };
  return (
    <div style={{ maxWidth: 760 }}>
      <header className="page-head">
        <div className="eyebrow">Mon compte</div>
        <h1>{account.user?.email}</h1>
        <p className="muted">Votre progression est enregistrée automatiquement en ligne après chaque action. Vous la retrouverez en vous connectant depuis n’importe quel appareil.</p>
      </header>

      <section className="card">
        <h2>Sauvegarde</h2>
        <p>
          <span className={`badge ${save.status === 'saved' ? 'good' : save.status === 'error' ? 'bad' : save.status === 'offline' ? 'warn' : ''}`}>{STATUS_TEXT[save.status]}</span>
        </p>
        {save.message && <p className="small">{save.message}</p>}
        <p className="small muted">
          {save.lastSavedAt ? `Dernière sauvegarde confirmée : ${new Date(save.lastSavedAt).toLocaleString('fr-FR')}` : 'Aucune sauvegarde confirmée pendant cette visite.'}
          {' · '}
          {s.attempts.length} réponses, {Object.values(s.activities).filter((a) => a.status === 'done').length} activités terminées, {s.xp} XP.
        </p>
        <div className="row">
          <button type="button" className="btn sm" onClick={() => void saveNow()} disabled={save.status === 'saving'}>
            Sauvegarder maintenant
          </button>
          <button type="button" className="btn sm ghost" onClick={() => void checkRemote(true)}>
            Récupérer les changements d’un autre appareil
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Changer de mot de passe</h2>
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const errs = { password: validatePassword(password), confirm: confirmPw !== password ? 'Les deux mots de passe ne correspondent pas.' : null };
            setPwErrors(errs);
            if (errs.password || errs.confirm) return;
            const r = await run(() => updatePassword(password));
            if (r.ok) {
              setPassword('');
              setConfirmPw('');
            }
          }}
        >
          <div className="grid grid-2">
            <Field label="Nouveau mot de passe" type="password" value={password} onChange={setPassword} error={pwErrors.password} autoComplete="new-password" />
            <Field label="Confirmation" type="password" value={confirmPw} onChange={setConfirmPw} error={pwErrors.confirm} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn sm" disabled={busy}>
            Modifier le mot de passe
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Session</h2>
        <p className="small muted">Vous restez connecté sur cet appareil jusqu’à votre déconnexion. Avant de vous déconnecter, les modifications en attente sont envoyées.</p>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await signOutFlow();
            setBusy(false);
            nav('/connexion');
          }}
        >
          Se déconnecter
        </button>
      </section>

      <section className="card">
        <h2>Supprimer mes données</h2>
        <div className="row">
          <button
            type="button"
            className="btn sm danger"
            disabled={busy}
            onClick={() => {
              if (window.confirm('Supprimer vos données en ligne (progression, statistiques partagées, groupes) ? La copie sur cet appareil sera renvoyée en ligne à la prochaine modification, sauf si vous recommencez le parcours depuis les Paramètres.')) void run(deleteRemoteData);
            }}
          >
            Supprimer mes données en ligne
          </button>
          <button
            type="button"
            className="btn sm danger"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm('Supprimer définitivement votre compte et toutes vos données en ligne ? Cette action est irréversible.')) return;
              const r = await run(deleteAccount);
              if (r.ok) {
                await afterAccountDeleted();
                nav('/');
              }
            }}
          >
            Supprimer mon compte
          </button>
        </div>
      </section>
      {msg && (
        <div className={`notice small ${msg.ok ? 'good' : 'bad'}`} role="status" style={{ marginTop: 12 }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
