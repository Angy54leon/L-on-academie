import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { GOALS, createInitialState, type GoalId, type Settings } from '../core/state';
import { updateProfile, updateSettings } from '../core/learner';
import { today } from '../core/progress';
import { checkAi, type AiStatus } from '../services/ai';
import { requestReset, useSaveState } from '../services/autosave';
import { supabaseConfigured } from '../services/config';
import { loadVoices, recorderSupported, speak, sttSupported, ttsSupported, type VoiceInfo } from '../services/speech';
import { addBackup, clearAllLocalData, clearBackups, exportState, importState, listBackups } from '../services/storage';
import { formatMinutes, PageHead, toast } from '../components/ui';
import { useAccount } from '../state/account';
import { getScope, getState, replaceState, update, useLearner } from '../state/store';
import type { LearnerState } from '../core/state';

/**
 * Remplace la progression (import, restauration, remise à zéro) en conservant les informations
 * techniques de l'espace courant (compte, révision en ligne) pour que la sauvegarde en ligne suive.
 */
function adopt(next: LearnerState) {
  const cur = getState();
  replaceState({ ...next, revision: Math.max(cur.revision, next.revision) + 1, updatedAt: new Date().toISOString(), meta: { ...cur.meta, dirty: true } });
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card" style={{ scrollMarginTop: 80 }}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const s = useLearner();
  const location = useLocation();
  const set = (patch: Partial<Settings>) => update((st, now) => updateSettings(st, patch, now));
  useEffect(() => {
    const hash = location.hash.replace('#', '') || (location.pathname === '/compte' ? 'compte' : '');
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [location]);

  return (
    <div style={{ maxWidth: 860 }}>
      <PageHead eyebrow="Paramètres" title="Réglages" />

      <Section id="profil" title="Profil et objectif">
        <div className="grid grid-2">
          <label className="field">
            <span>Pseudo (visible par vos groupes si vous en rejoignez)</span>
            <input type="text" value={s.profile.displayName} maxLength={40} onChange={(e) => update((st) => updateProfile(st, { displayName: e.target.value }))} />
          </label>
          <label className="field">
            <span>Objectif principal</span>
            <select value={s.profile.goal} onChange={(e) => update((st) => updateProfile(st, { goal: e.target.value as GoalId }))}>
              {(Object.entries(GOALS) as [GoalId, string][]).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Objectif quotidien : {formatMinutes(s.profile.dailyMinutes * 60)}</span>
          <input type="range" min={15} max={300} step={15} value={s.profile.dailyMinutes} onChange={(e) => update((st) => updateProfile(st, { dailyMinutes: Number(e.target.value) }))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
        </label>
        <p className="small muted">Par défaut 1 h par jour. Vous pouvez répartir ce temps en sessions express (15 min) et longues.</p>
      </Section>

      <VoiceSection />

      <Section id="apprentissage" title="Apprentissage">
        <label className="field">
          <span>Immersion (part d’anglais dans les consignes)</span>
          <select value={String(s.settings.immersion)} onChange={(e) => set({ immersion: e.target.value === 'auto' ? 'auto' : Number(e.target.value) })}>
            <option value="auto">Automatique (augmente avec le parcours et vos résultats)</option>
            <option value="0">0 — Consignes en français</option>
            <option value="1">1 — Bilingue</option>
            <option value="2">2 — Anglais, français sur demande</option>
            <option value="3">3 — Immersion complète (aide FR sur demande)</option>
          </select>
        </label>
        <label className="field">
          <span>Indices</span>
          <select value={s.settings.showHints} onChange={(e) => set({ showHints: e.target.value as Settings['showHints'] })}>
            <option value="auto">Automatiques (affichés en mode soutien)</option>
            <option value="always">Toujours afficher</option>
            <option value="never">Ne jamais afficher d’emblée</option>
          </select>
        </label>
      </Section>

      <Section id="apparence" title="Apparence et accessibilité">
        <div className="grid grid-2">
          <label className="field">
            <span>Thème</span>
            <select value={s.settings.theme} onChange={(e) => set({ theme: e.target.value as Settings['theme'] })}>
              <option value="dark">Sombre (futuriste)</option>
              <option value="light">Clair</option>
              <option value="system">Selon l’appareil</option>
            </select>
          </label>
          <label className="check" style={{ marginTop: 24 }}>
            <input type="checkbox" checked={s.settings.reducedMotion} onChange={(e) => set({ reducedMotion: e.target.checked })} />
            <span>Réduire les animations</span>
          </label>
        </div>
      </Section>

      <Section id="confidentialite" title="Confidentialité">
        <p className="small">Par défaut, rien n’est partagé. Ces choix ne s’appliquent qu’aux membres de vos groupes (si un compte est configuré).</p>
        <label className="check">
          <input type="checkbox" checked={s.settings.privacy.shareProgress} onChange={(e) => set({ privacy: { ...s.settings.privacy, shareProgress: e.target.checked } })} />
          <span>Partager ma progression (XP de la semaine, jours validés, mots maîtrisés)</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.settings.privacy.shareStreak} onChange={(e) => set({ privacy: { ...s.settings.privacy, shareStreak: e.target.checked } })} />
          <span>Partager ma série de jours consécutifs</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={s.settings.privacy.shareBadges} onChange={(e) => set({ privacy: { ...s.settings.privacy, shareBadges: e.target.checked } })} />
          <span>Partager mon nombre de badges</span>
        </label>
        <div className="notice small" style={{ marginTop: 10 }}>
          <strong>Données vocales :</strong> LÉON ACADÉMIE n’enregistre ni ne conserve votre voix. La reconnaissance vocale est assurée par votre navigateur (dans Chrome, l’audio est transmis à un service de Google pour la transcription). La fonction « s’enregistrer » garde l’audio en mémoire uniquement, le temps de l’exercice. Seul le texte des conversations est conservé (sur cet appareil, et sur votre compte si vous êtes connecté).
        </div>
      </Section>

      <AccountSection />
      <AiSection />
      <DataSection />

      <Section id="apropos" title="À propos">
        <p className="small">
          LÉON ACADÉMIE — version 1.0. Les niveaux affichés (A1 à C1) sont des estimations pédagogiques inspirées du CECRL, pas une certification officielle. Aucun niveau bilingue n’est garanti en 14 ou 24 jours : l’application mesure vos progrès réels.
        </p>
        <p className="small muted">
          Fonctions de ce navigateur : synthèse vocale {ttsSupported() ? '✅' : '❌'} · reconnaissance vocale {sttSupported() ? '✅' : '❌'} · enregistrement {recorderSupported() ? '✅' : '❌'}
        </p>
      </Section>
    </div>
  );
}

function VoiceSection() {
  const s = useLearner();
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  useEffect(() => {
    void loadVoices().then(setVoices);
  }, []);
  const set = (patch: Partial<Settings>) => update((st, now) => updateSettings(st, patch, now));
  const filtered = voices.filter((v) => v.lang.replace('_', '-').startsWith(s.settings.accent.slice(0, 5)) || v.lang.startsWith('en'));
  return (
    <Section id="voix" title="Voix et audio">
      {!ttsSupported() && <div className="notice warn small">La synthèse vocale n’est pas disponible dans ce navigateur. Les textes à écouter seront affichés.</div>}
      <div className="grid grid-2">
        <label className="field">
          <span>Accent</span>
          <select value={s.settings.accent} onChange={(e) => set({ accent: e.target.value as Settings['accent'], voiceURI: undefined })}>
            <option value="en-US">Américain (en-US)</option>
            <option value="en-GB">Britannique (en-GB)</option>
          </select>
        </label>
        <label className="field">
          <span>Voix ({filtered.length} disponible(s) sur cet appareil)</span>
          <select value={s.settings.voiceURI ?? ''} onChange={(e) => set({ voiceURI: e.target.value || undefined })}>
            <option value="">Automatique (meilleure voix pour l’accent choisi)</option>
            {filtered.map((v) => (
              <option key={v.uri} value={v.uri}>
                {v.name} ({v.lang}){v.local ? '' : ' · en ligne'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Vitesse de lecture : {s.settings.speechRate.toFixed(2)}×</span>
        <input type="range" min={0.5} max={1.3} step={0.05} value={s.settings.speechRate} onChange={(e) => set({ speechRate: Number(e.target.value) })} style={{ width: '100%', accentColor: 'var(--accent)' }} />
      </label>
      <button type="button" className="btn sm" onClick={() => speak('Hello! This is how I sound. Nice to meet you.', { accent: s.settings.accent, voiceURI: s.settings.voiceURI, rate: s.settings.speechRate })} disabled={!ttsSupported()}>
        🔈 Tester la voix
      </button>
      <p className="small muted" style={{ marginTop: 8 }}>
        Astuce : les voix « naturelles » (Edge, Chrome, Safari) sont les plus claires. Les voix marquées « en ligne » nécessitent Internet.
      </p>
    </Section>
  );
}

function AccountSection() {
  const account = useAccount();
  const save = useSaveState();
  if (!supabaseConfigured()) {
    return (
      <Section id="compte" title="Compte et sauvegarde">
        <p>
          <strong>Mode local :</strong> vos données sont enregistrées dans ce navigateur, sans compte. Pour les transférer sur un autre appareil, utilisez l’export / import ci-dessous.
        </p>
        <p className="small muted">Les comptes, la sauvegarde en ligne et l’espace social partagé deviennent disponibles quand le propriétaire de l’installation configure Supabase (gratuit, voir le README).</p>
      </Section>
    );
  }
  if (account.status === 'signed-in') {
    return (
      <Section id="compte" title="Compte et sauvegarde">
        <p>
          Connecté : <strong>{account.user?.email}</strong>
        </p>
        <p className="small muted">
          Sauvegarde automatique en ligne activée.{' '}
          {save.lastSavedAt ? `Dernière sauvegarde confirmée : ${new Date(save.lastSavedAt).toLocaleString('fr-FR')}.` : ''}
        </p>
        <Link to="/compte" className="btn sm">
          Gérer mon compte
        </Link>
      </Section>
    );
  }
  return (
    <Section id="compte" title="Compte et sauvegarde">
      <p className="small">
        Vous utilisez l’application sans compte : votre progression est enregistrée uniquement sur cet appareil. Avec un compte gratuit, elle est sauvegardée automatiquement en ligne et vous la retrouvez sur tous vos appareils. Votre progression actuelle sera transférée dans le compte.
      </p>
      <div className="row">
        <Link to="/inscription" className="btn primary sm">
          Créer un compte
        </Link>
        <Link to="/connexion" className="btn sm">
          Se connecter
        </Link>
      </div>
    </Section>
  );
}

function AiSection() {
  const s = useLearner();
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    void checkAi(true).then(setStatus);
  }, []);
  return (
    <Section id="ia" title="Professeur IA">
      <p className={`notice small ${status?.available ? 'good' : ''}`}>{status ? status.reason : 'Vérification…'}</p>
      <label className="field" style={{ marginTop: 10 }}>
        <span>Limite quotidienne d’échanges avec l’IA (protège les quotas gratuits) : {s.settings.aiDailyLimit}</span>
        <input type="range" min={0} max={200} step={10} value={s.settings.aiDailyLimit} onChange={(e) => update((st, now) => updateSettings(st, { aiDailyLimit: Number(e.target.value) }, now))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
      </label>
      <p className="small muted">Utilisés aujourd’hui : {today(s, new Date()).aiCalls}. Sans professeur IA, la conversation fonctionne avec le partenaire local (scénarios préparés).</p>
    </Section>
  );
}

function DataSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState(() => listBackups(getScope()));
  const download = () => {
    const blob = exportState(getState());
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leon-academie-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Section id="donnees" title="Données et sauvegardes">
      <p className="small">{getScope() === 'guest' ? 'Vos données d’apprentissage sont stockées dans ce navigateur. Exportez-les régulièrement si vous n’utilisez pas de compte.' : 'Votre progression est sauvegardée en ligne automatiquement ; une copie est aussi gardée sur cet appareil. L’export reste possible pour vos archives.'}</p>
      <div className="row">
        <button type="button" className="btn sm" onClick={download}>
          ⬇ Exporter mes données
        </button>
        <button type="button" className="btn sm" onClick={() => fileRef.current?.click()}>
          ⬆ Importer un export
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = importState(await f.text());
            if (!r.ok) {
              toast(r.error, 'error');
              return;
            }
            if (!confirm('Remplacer vos données actuelles par ce fichier ? Une sauvegarde des données actuelles sera conservée.')) return;
            addBackup(getScope(), { at: new Date().toISOString(), reason: 'Avant import', state: getState() });
            adopt(r.state);
            setBackups(listBackups(getScope()));
            toast('Données importées.');
          }}
        />
      </div>
      <h3 style={{ marginTop: 18 }}>Sauvegardes automatiques</h3>
      <p className="small muted">Créées avant une fusion de synchronisation, un import ou une réinitialisation (5 au maximum).</p>
      {backups.length === 0 ? (
        <p className="small muted">Aucune sauvegarde.</p>
      ) : (
        <ul className="list">
          {backups.map((b, i) => (
            <li key={i} className="row between">
              <span className="small">
                {new Date(b.at).toLocaleString('fr-FR')} — {b.reason}
              </span>
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  if (!confirm('Restaurer cette sauvegarde ? Vos données actuelles seront elles-mêmes sauvegardées.')) return;
                  addBackup(getScope(), { at: new Date().toISOString(), reason: 'Avant restauration', state: getState() });
                  adopt(b.state);
                  setBackups(listBackups(getScope()));
                  toast('Sauvegarde restaurée.');
                }}
              >
                Restaurer
              </button>
            </li>
          ))}
        </ul>
      )}
      {backups.length > 0 && (
        <button
          type="button"
          className="btn sm ghost"
          onClick={() => {
            clearBackups(getScope());
            setBackups([]);
          }}
        >
          Effacer les sauvegardes
        </button>
      )}
      <hr className="sep" />
      <h3>Réinitialiser</h3>
      <div className="row">
        <button
          type="button"
          className="btn sm danger"
          onClick={() => {
            if (!confirm('Recommencer à zéro ? Une sauvegarde de vos données actuelles sera conservée dans « Sauvegardes ».')) return;
            addBackup(getScope(), { at: new Date().toISOString(), reason: 'Avant réinitialisation', state: getState() });
            // Connecté : on autorise explicitement le serveur à remplacer la progression en ligne.
            if (getScope() !== 'guest') requestReset();
            adopt(createInitialState());
            setBackups(listBackups(getScope()));
            toast(getScope() !== 'guest' ? 'Progression réinitialisée (aussi en ligne).' : 'Progression réinitialisée.');
          }}
        >
          Recommencer le parcours
        </button>
        <button
          type="button"
          className="btn sm danger"
          onClick={() => {
            if (getScope() !== 'guest') {
              toast('Déconnectez-vous d’abord (Mon compte) : vos données en ligne ne sont pas concernées par cette action.', 'error', 8000);
              return;
            }
            if (!confirm('Effacer DÉFINITIVEMENT toutes les données de LÉON ACADÉMIE de ce navigateur (sauvegardes comprises) ? Les progressions déjà sauvegardées en ligne dans un compte ne sont pas supprimées.')) return;
            clearAllLocalData();
            replaceState(createInitialState());
            setBackups([]);
            toast('Toutes les données locales ont été effacées.');
          }}
        >
          Effacer toutes mes données locales
        </button>
      </div>
    </Section>
  );
}
