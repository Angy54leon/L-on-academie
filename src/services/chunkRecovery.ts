// Récupération quand un morceau de l'application (page chargée à la demande) est introuvable.
//
// Cas typique (tablette dont l'onglet est resté ouvert) : la page tourne encore avec l'ancienne version, puis un
// nouveau déploiement remplace les fichiers. En ouvrant « Conversation », l'ancienne version réclame un fichier
// qui n'existe plus (404) → sans traitement, toute l'interface disparaît (page blanche).
// Solution : recharger UNE fois la page pour obtenir la nouvelle version ; si cela ne suffit pas, afficher un
// message clair (voir PageErrorBoundary) au lieu d'une page blanche.

const KEY = 'leon-academie:chunk-reload';
const WINDOW_MS = 60_000;

/** L'erreur indique-t-elle un fichier de page introuvable ou illisible (et non un bug de rendu) ? */
export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err ?? '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk .* failed|dynamically imported module/i.test(msg);
}

interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

function storage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Faut-il recharger la page ? Oui, sauf si on vient déjà de le faire (évite une boucle de rechargements
 * si le fichier manque vraiment). Mémorise la tentative.
 */
export function shouldReloadForChunkError(now = Date.now(), store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  let last = 0;
  try {
    last = Number(store.getItem(KEY) || 0);
  } catch {
    return false;
  }
  if (now - last < WINDOW_MS) return false;
  try {
    store.setItem(KEY, String(now));
  } catch {
    return false;
  }
  return true;
}

/** Recharge la page une seule fois pour récupérer la dernière version ; renvoie false si ce n'est pas possible. */
export function reloadOnceForNewVersion(): boolean {
  if (typeof window === 'undefined' || !shouldReloadForChunkError()) return false;
  window.location.reload();
  return true;
}

/**
 * Remplace `import()` pour les pages chargées à la demande : une nouvelle tentative réseau, puis rechargement
 * unique de la page si le fichier est introuvable (nouvelle version déployée).
 */
export function importWithRecovery<T>(importer: () => Promise<T>): Promise<T> {
  return importer().catch(async (err) => {
    if (!isChunkLoadError(err)) throw err;
    // Nouvelle tentative (coupure réseau passagère sur mobile).
    try {
      return await importer();
    } catch (err2) {
      if (reloadOnceForNewVersion()) return new Promise<T>(() => undefined); // la page se recharge
      throw err2;
    }
  });
}

/** Vite signale l'échec de préchargement d'un fichier : même traitement. */
export function installChunkRecovery(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnceForNewVersion()) event.preventDefault();
  });
}
