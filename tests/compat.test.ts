// Compatibilité : récupération quand un fichier de page est introuvable (nouvelle version déployée)
// et règles du correcteur sans syntaxe trop récente pour les anciens Safari.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importWithRecovery, isChunkLoadError, shouldReloadForChunkError } from '../src/services/chunkRecovery';
import { detectIssues } from '../src/core/grammarRules';

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('fichier de page introuvable après une mise à jour', () => {
  it('reconnaît les erreurs de chargement de Chrome, Safari et Firefox (et pas les autres)', () => {
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/ConversationPage-abc.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true); // Safari
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true); // Firefox
    expect(isChunkLoadError(new TypeError('Cannot read properties of undefined'))).toBe(false);
  });

  it('recharge une seule fois (jamais de boucle de rechargements)', () => {
    const store = memoryStore();
    expect(shouldReloadForChunkError(1_000_000, store)).toBe(true);
    expect(shouldReloadForChunkError(1_010_000, store)).toBe(false); // 10 s plus tard : non
    expect(shouldReloadForChunkError(1_100_000, store)).toBe(true); // plus d'une minute après : oui
    expect(shouldReloadForChunkError(Date.now(), null)).toBe(false); // stockage indisponible : pas de rechargement automatique
  });

  it('une erreur qui n’est pas un problème de fichier est transmise telle quelle', async () => {
    await expect(importWithRecovery(() => Promise.reject(new Error('bug')))).rejects.toThrow('bug');
  });

  it('coupure passagère : une nouvelle tentative suffit', async () => {
    let n = 0;
    const mod = await importWithRecovery(() => (++n === 1 ? Promise.reject(new TypeError('Failed to fetch dynamically imported module: x')) : Promise.resolve({ default: 'page' })));
    expect(mod).toEqual({ default: 'page' });
  });
});

describe('compatibilité des anciens navigateurs', () => {
  it('aucune expression régulière « lookbehind » (erreur fatale avant Safari 16.4)', () => {
    const files: string[] = [];
    const walk = (d: string) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : /\.tsx?$/.test(e.name) && files.push(join(d, e.name))));
    walk('src');
    const offenders = files.filter((f) => /\(\?<[!=]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('la règle « doesn’t + verbe en -s » fonctionne toujours sans lookbehind', () => {
    const ids = (t: string) => detectIssues(t).map((i) => i.ruleId);
    expect(ids('She doesn’t works on Monday.'.replace('’', "'"))).toContain('doesnt-s');
    expect(ids("He doesn't goes to school.")).toContain('doesnt-s');
    expect(ids("I don't miss the bus.")).not.toContain('doesnt-s');
    expect(ids("She doesn't pass the exam.")).not.toContain('doesnt-s');
    expect(ids("He doesn't work.")).not.toContain('doesnt-s');
  });
});

describe('fonctions vocales déclarées mais absentes', () => {
  it('« speechSynthesis » présent mais vide : considéré comme indisponible (pas de plantage)', async () => {
    const { detectSpeechEnvironment } = await import('../src/services/speech');
    const env = detectSpeechEnvironment('Mozilla/5.0 (Linux; Android 13) Chrome/120.0', { isSecureContext: true, speechSynthesis: undefined, SpeechSynthesisUtterance: undefined } as never, 5);
    expect(env.ttsApi).toBe(false);
    expect(env.sttApi).toBe(false);
  });
});
