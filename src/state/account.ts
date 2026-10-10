// État du compte (Supabase Auth). La logique (connexion, restauration…) est dans services/session.ts.
import { useSyncExternalStore } from 'react';
import { supabaseConfigured } from '../services/config';
import { isGuestModeChosen } from '../services/storage';

export type AccountStatus =
  | 'local' // Supabase non configuré : mode local uniquement
  | 'loading' // vérification de la session au démarrage
  | 'signed-out'
  | 'restoring' // récupération de la progression en ligne
  | 'choice' // l'utilisateur doit décider du sort des données utilisées sans compte
  | 'restore-error' // impossible de récupérer la progression (réseau…)
  | 'signed-in';

export interface AccountState {
  configured: boolean;
  status: AccountStatus;
  user: { id: string; email: string } | null;
  /** L'utilisateur a choisi d'utiliser l'application sans compte. */
  guestMode: boolean;
  /** Message affiché sur l'écran de connexion (session expirée, lien invalide…). */
  notice?: string;
  restoreError?: string;
  /** Résumé des deux progressions à départager (statut « choice »). */
  choice?: { accountDays: number; accountAnswers: number; deviceDays: number; deviceAnswers: number };
  /** La copie locale peut être utilisée si la restauration échoue. */
  canUseCache?: boolean;
}

let account: AccountState = {
  configured: supabaseConfigured(),
  status: supabaseConfigured() ? 'loading' : 'local',
  user: null,
  guestMode: isGuestModeChosen(),
};
const listeners = new Set<() => void>();

export function setAccount(patch: Partial<AccountState>) {
  account = { ...account, ...patch };
  for (const l of listeners) l();
}

export function getAccount(): AccountState {
  return account;
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => account,
    () => account,
  );
}

/** L'application peut-elle afficher les pages d'apprentissage ? */
export function canUseApp(a: AccountState): boolean {
  return a.status === 'local' || a.status === 'signed-in' || (a.status === 'signed-out' && a.guestMode);
}
