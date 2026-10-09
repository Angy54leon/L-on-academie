// Comptes utilisateurs (Supabase Auth, facultatif).
import { getSupabase } from './supabase';
import { appUrl } from './config';

export interface AuthResult {
  ok: boolean;
  message: string;
}

const FR_ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-mail ou mot de passe incorrect.'],
  [/email not confirmed/i, 'Confirmez d’abord votre adresse e-mail (lien reçu par e-mail).'],
  [/user already registered/i, 'Un compte existe déjà avec cet e-mail.'],
  [/password should be at least/i, 'Le mot de passe doit contenir au moins 8 caractères.'],
  [/rate limit|too many/i, 'Trop de tentatives. Réessayez dans quelques minutes.'],
  [/network|fetch/i, 'Connexion au serveur impossible. Vérifiez votre connexion Internet.'],
];

function fr(message: string): string {
  for (const [re, txt] of FR_ERRORS) if (re.test(message)) return txt;
  return `Erreur : ${message}`;
}

async function client() {
  const sb = await getSupabase();
  if (!sb) throw new Error('Les comptes ne sont pas configurés sur cette installation.');
  return sb;
}

export async function signUp(email: string, password: string, displayName: string): Promise<AuthResult> {
  try {
    if (password.length < 8) return { ok: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' };
    const sb = await client();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.slice(0, 40) }, emailRedirectTo: appUrl() },
    });
    if (error) return { ok: false, message: fr(error.message) };
    if (!data.session) return { ok: true, message: 'Compte créé ! Ouvrez l’e-mail de confirmation pour activer votre compte, puis connectez-vous.' };
    return { ok: true, message: 'Compte créé et connecté.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur inconnue.' };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const sb = await client();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: fr(error.message) };
    return { ok: true, message: 'Connecté.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur inconnue.' };
  }
}

export async function signOut(): Promise<void> {
  const sb = await getSupabase();
  await sb?.auth.signOut();
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  try {
    const sb = await client();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${appUrl()}#/compte?reinitialiser=1` });
    if (error) return { ok: false, message: fr(error.message) };
    return { ok: true, message: 'Si un compte existe pour cet e-mail, un lien de réinitialisation vient d’être envoyé.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur inconnue.' };
  }
}

export async function updatePassword(password: string): Promise<AuthResult> {
  try {
    if (password.length < 8) return { ok: false, message: 'Le mot de passe doit contenir au moins 8 caractères.' };
    const sb = await client();
    const { error } = await sb.auth.updateUser({ password });
    if (error) return { ok: false, message: fr(error.message) };
    return { ok: true, message: 'Mot de passe modifié.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur inconnue.' };
  }
}

/** Supprime le compte et toutes les données distantes (fonction serveur « delete-account »). */
export async function deleteAccount(): Promise<AuthResult> {
  try {
    const sb = await client();
    const { error } = await sb.functions.invoke('delete-account', { method: 'POST' });
    if (error) return { ok: false, message: `Suppression impossible : ${error.message}` };
    await sb.auth.signOut();
    return { ok: true, message: 'Votre compte et vos données distantes ont été supprimés.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur inconnue.' };
  }
}

/** Supprime seulement les données distantes (progression, statistiques publiques), en gardant le compte. */
export async function deleteRemoteData(): Promise<AuthResult> {
  try {
    const sb = await client();
    const { error } = await sb.rpc('delete_my_data');
    if (error) return { ok: false, message: fr(error.message) };
    return { ok: true, message: 'Vos données distantes ont été supprimées. Vos données locales restent sur cet appareil.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Erreur inconnue.' };
  }
}
