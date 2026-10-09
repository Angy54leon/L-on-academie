// État du compte (connexion Supabase facultative).
import { useSyncExternalStore } from 'react';
import { supabaseConfigured } from '../services/config';
import { getSupabase } from '../services/supabase';

export interface AccountState {
  configured: boolean;
  ready: boolean;
  user: { id: string; email: string } | null;
  syncing: boolean;
  lastSync?: string;
  syncError?: string;
}

let account: AccountState = { configured: supabaseConfigured(), ready: !supabaseConfigured(), user: null, syncing: false };
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

let initialized = false;
const loginListeners = new Set<() => void>();

export function onLogin(l: () => void) {
  loginListeners.add(l);
  return () => loginListeners.delete(l);
}

/** Initialise l'écoute de la session (appelé une fois au démarrage). */
export async function initAccount(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const sb = await getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.auth.getSession();
    const u = data.session?.user;
    setAccount({ ready: true, user: u ? { id: u.id, email: u.email ?? '' } : null });
    if (u) for (const l of loginListeners) l();
  } catch {
    setAccount({ ready: true, user: null, syncError: 'Impossible de contacter le serveur de comptes.' });
  }
  sb.auth.onAuthStateChange((event, session) => {
    const u = session?.user;
    const wasLogged = !!account.user;
    setAccount({ user: u ? { id: u.id, email: u.email ?? '' } : null });
    if (u && !wasLogged && event === 'SIGNED_IN') for (const l of loginListeners) l();
  });
}
