// Comptes utilisateurs (Supabase Auth : e-mail + mot de passe).
// Les mots de passe ne transitent que vers Supabase Auth (HTTPS), qui les stocke hachés (bcrypt) :
// l'application ne les conserve jamais.
import { appUrl } from './config';
import { getSupabase } from './supabase';

export interface AuthResult {
  ok: boolean;
  message: string;
  /** Inscription réussie mais adresse à confirmer par e-mail. */
  needsConfirmation?: boolean;
}

export const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Indiquez votre adresse e-mail.';
  if (!EMAIL_RE.test(email.trim())) return 'Cette adresse e-mail ne semble pas valide (exemple : prenom@exemple.fr).';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Choisissez un mot de passe.';
  if (password.length < PASSWORD_MIN) return `Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères.`;
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/[0-9]/.test(password)) return 'Utilisez au moins une lettre et un chiffre.';
  return null;
}

const FR_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou mot de passe incorrect.'],
  [/email not confirmed/i, 'Votre adresse n’est pas encore confirmée : cliquez sur le lien reçu par e-mail (pensez aux courriers indésirables).'],
  [/user already registered|already been registered/i, 'Un compte existe déjà avec cette adresse. Connectez-vous ou utilisez « Mot de passe oublié ».'],
  [/password should be at least|password is too short/i, `Le mot de passe est trop court (${PASSWORD_MIN} caractères minimum).`],
  [/weak password|password should contain|pwned|known to be weak/i, 'Ce mot de passe est trop faible ou trop connu. Choisissez-en un plus original.'],
  [/new password should be different|same password/i, 'Le nouveau mot de passe doit être différent de l’ancien.'],
  [/unable to validate email|invalid format|email address .* is invalid|email_address_invalid/i, 'Cette adresse e-mail n’est pas acceptée.'],
  [/signups? not allowed|signup is disabled/i, 'Les inscriptions sont désactivées sur cette installation.'],
  [/for security purposes, you can only request this after (\d+) seconds?/i, 'Pour des raisons de sécurité, patientez quelques secondes avant de redemander un e-mail.'],
  [/email rate limit exceeded|over_email_send_rate_limit/i, 'Trop d’e-mails envoyés récemment. Réessayez plus tard (limite du service d’envoi).'],
  [/rate limit|too many requests/i, 'Trop de tentatives. Réessayez dans quelques minutes.'],
  [/token has expired|link is invalid|otp_expired|invalid flow state|code verifier/i, 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.'],
  [/auth session missing|session not found|not authenticated/i, 'Votre session a expiré. Reconnectez-vous.'],
  [/failed to fetch|networkerror|network request failed|fetch failed|load failed/i, 'Connexion au serveur impossible. Vérifiez votre connexion Internet puis réessayez.'],
  [/error sending|smtp|mail/i, 'L’e-mail n’a pas pu être envoyé (service d’envoi non configuré ou limité). Voir le README.'],
];

export function frenchAuthError(message: string): string {
  for (const [re, txt] of FR_ERRORS) if (re.test(message)) return txt;
  return `Erreur : ${message}`;
}

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error('Les comptes ne sont pas configurés sur cette installation.');
  return sb;
}

function wrap(fn: () => Promise<AuthResult>): Promise<AuthResult> {
  return fn().catch((e: unknown) => ({ ok: false, message: frenchAuthError(e instanceof Error ? e.message : String(e)) }));
}

/** Adresse de retour des liens e-mail (sans « # » pour rester compatible avec la navigation de l'application). */
function redirectUrl(marker: string): string {
  const base = appUrl().split('#')[0].split('?')[0];
  return `${base}?${marker}=1`;
}

export function signUp(email: string, password: string): Promise<AuthResult> {
  return wrap(async () => {
    const sb = await client();
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: redirectUrl('confirmation') } });
    if (error) return { ok: false, message: frenchAuthError(error.message) };
    // Supabase ne révèle pas si l'adresse existe déjà : identities vide = compte existant.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
      return { ok: false, message: frenchAuthError('User already registered') };
    if (!data.session) return { ok: true, needsConfirmation: true, message: 'Compte créé ! Ouvrez l’e-mail de confirmation que nous venons d’envoyer, puis cliquez sur le lien.' };
    return { ok: true, message: 'Compte créé et connecté.' };
  });
}

export function resendConfirmation(email: string): Promise<AuthResult> {
  return wrap(async () => {
    const sb = await client();
    const { error } = await sb.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectUrl('confirmation') } });
    if (error) return { ok: false, message: frenchAuthError(error.message) };
    return { ok: true, message: 'E-mail de confirmation renvoyé.' };
  });
}

export function signIn(email: string, password: string): Promise<AuthResult> {
  return wrap(async () => {
    const sb = await client();
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, message: frenchAuthError(error.message) };
    return { ok: true, message: 'Connecté.' };
  });
}

export function requestPasswordReset(email: string): Promise<AuthResult> {
  return wrap(async () => {
    const sb = await client();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl('reinitialisation') });
    if (error) return { ok: false, message: frenchAuthError(error.message) };
    // Message identique que le compte existe ou non (on ne divulgue pas quelles adresses sont inscrites).
    return { ok: true, message: 'Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé. Ouvrez le lien depuis ce même navigateur.' };
  });
}

export function updatePassword(password: string): Promise<AuthResult> {
  return wrap(async () => {
    const sb = await client();
    const { error } = await sb.auth.updateUser({ password });
    if (error) return { ok: false, message: frenchAuthError(error.message) };
    return { ok: true, message: 'Votre mot de passe a été modifié.' };
  });
}

/** Supprime le compte et toutes les données en ligne (fonction serveur « delete-account »). */
export function deleteAccount(): Promise<AuthResult> {
  return wrap(async () => {
    const sb = await client();
    const { error } = await sb.functions.invoke('delete-account', { method: 'POST' });
    if (error) return { ok: false, message: `Suppression impossible : ${error.message}. Vérifiez que la fonction « delete-account » est déployée (README).` };
    return { ok: true, message: 'Votre compte et vos données en ligne ont été supprimés.' };
  });
}

/** Supprime seulement les données en ligne (progression, statistiques partagées), en gardant le compte. */
export function deleteRemoteData(): Promise<AuthResult> {
  return wrap(async () => {
    const sb = await client();
    const { error } = await sb.rpc('delete_my_data');
    if (error) return { ok: false, message: frenchAuthError(error.message) };
    return { ok: true, message: 'Vos données en ligne ont été supprimées.' };
  });
}
