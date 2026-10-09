import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DIFFICULTIES, GOALS, PREFERENCES, THEMES, type GoalId } from '../core/state';
import { updateProfile } from '../core/learner';
import { ProgressBar } from '../components/ui';
import { update, useLearner } from '../state/store';

const TIME_OPTIONS = [
  { v: 30, l: '30 min', d: 'Rythme léger' },
  { v: 60, l: '1 h', d: 'Recommandé (par défaut)' },
  { v: 90, l: '1 h 30', d: 'Intensif' },
  { v: 120, l: '2 h', d: 'Très intensif' },
  { v: 180, l: '3 h', d: 'Immersion' },
  { v: 240, l: '4 h et +', d: 'Plein temps' },
];

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export function OnboardingPage() {
  const p = useLearner().profile;
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(p.displayName);
  const [goal, setGoal] = useState<GoalId>(p.goal);
  const [minutes, setMinutes] = useState(p.dailyMinutes);
  const [difficulties, setDifficulties] = useState<string[]>(p.difficulties);
  const [prefs, setPrefs] = useState<string[]>(p.preferences);
  const [themes, setThemes] = useState<string[]>(p.themes);
  const steps = 5;

  const finish = (toTest: boolean) => {
    update((s) => updateProfile(s, { displayName: name.trim().slice(0, 40), goal, dailyMinutes: minutes, difficulties, preferences: prefs, themes, onboarded: true }));
    nav(toTest ? '/evaluation/placement' : '/dashboard');
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="eyebrow">Bienvenue · étape {step + 1} / {steps}</div>
      <ProgressBar value={(step + 1) / steps} label="Progression de la configuration" />
      <div className="card" style={{ marginTop: 16 }}>
        {step === 0 && (
          <>
            <h1>Faisons connaissance 👋</h1>
            <p className="muted">Quelques questions (2 minutes) pour personnaliser votre parcours. Tout reste sur cet appareil.</p>
            <label className="field">
              <span>Comment voulez-vous qu’on vous appelle ? (facultatif)</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Votre prénom ou un pseudo" />
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Quel est votre objectif principal ?</h2>
            <div className="choice-grid" role="radiogroup">
              {(Object.entries(GOALS) as [GoalId, string][]).map(([id, label]) => (
                <button key={id} type="button" className="choice" role="radio" aria-checked={goal === id} aria-pressed={goal === id} onClick={() => setGoal(id)}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Combien de temps par jour ?</h2>
            <p className="muted small">Vous pourrez répartir ce temps en sessions courtes (15 min) ou longues, et le modifier à tout moment.</p>
            <div className="choice-grid">
              {TIME_OPTIONS.map((o) => (
                <button key={o.v} type="button" className="choice" aria-pressed={minutes === o.v} onClick={() => setMinutes(o.v)}>
                  <strong>{o.l}</strong>
                  <div className="small muted">{o.d}</div>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Qu’est-ce qui vous pose le plus de difficultés ?</h2>
            <p className="muted small">Plusieurs choix possibles.</p>
            <div className="choice-grid">
              {Object.entries(DIFFICULTIES).map(([id, label]) => (
                <button key={id} type="button" className="choice" aria-pressed={difficulties.includes(id)} onClick={() => setDifficulties(toggle(difficulties, id))}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h2>Vos préférences</h2>
            <h3 style={{ marginTop: 12 }}>Comment aimez-vous apprendre ?</h3>
            <div className="choice-grid">
              {Object.entries(PREFERENCES).map(([id, label]) => (
                <button key={id} type="button" className="choice" aria-pressed={prefs.includes(id)} onClick={() => setPrefs(toggle(prefs, id))}>
                  {label}
                </button>
              ))}
            </div>
            <h3 style={{ marginTop: 18 }}>Quels thèmes voulez-vous pratiquer ?</h3>
            <div className="choice-grid">
              {Object.entries(THEMES).map(([id, label]) => (
                <button key={id} type="button" className="choice" aria-pressed={themes.includes(id)} onClick={() => setThemes(toggle(themes, id))}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="row between" style={{ marginTop: 24 }}>
          <button type="button" className="btn ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
            ← Retour
          </button>
          {step < steps - 1 ? (
            <button type="button" className="btn primary" onClick={() => setStep(step + 1)}>
              Suivant →
            </button>
          ) : (
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => finish(false)}>
                Passer le test plus tard
              </button>
              <button type="button" className="btn primary" onClick={() => finish(true)}>
                Lancer le test de positionnement →
              </button>
            </div>
          )}
        </div>
      </div>
      {step === steps - 1 && (
        <p className="small muted" style={{ marginTop: 12 }}>
          Le test dure environ 25 minutes. Il estime votre niveau dans chaque compétence (estimation pédagogique, pas une certification) et adapte le parcours.
        </p>
      )}
    </div>
  );
}
