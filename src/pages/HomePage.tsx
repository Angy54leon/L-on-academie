import { Link } from 'react-router';
import { PROGRAM_DAYS, VOCAB, programItems } from '../content';
import { useLearner } from '../state/store';

export function HomePage() {
  const s = useLearner();
  const itemCount = programItems().filter((i) => i.day <= 14).length;
  return (
    <div>
      <section className="hero">
        <div>
          <div className="eyebrow">Anglais intensif pour francophones</div>
          <h1>
            Passez de « je comprends un peu » à <span className="gradient-text">je parle avec aisance</span>.
          </h1>
          <p className="lead">
            LÉON ACADÉMIE est un entraînement intensif de 14 jours (+10 jours facultatifs) qui s’adapte à vos résultats réels : leçons, exercices corrigés et expliqués, vocabulaire en répétition espacée, oral et conversation.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            {s.profile.onboarded ? (
              <Link to="/dashboard" className="btn primary">
                Continuer mon parcours →
              </Link>
            ) : (
              <Link to="/bienvenue" className="btn primary">
                Commencer gratuitement →
              </Link>
            )}
            <Link to="/parametres" className="btn ghost">
              Paramètres
            </Link>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            Sans compte, sans abonnement : vos données restent sur cet appareil. Installable sur téléphone et utilisable hors ligne.
          </p>
        </div>
        <div className="orb float" aria-hidden>
          <img src="./icons/icon.svg" alt="" style={{ width: '38%', opacity: 0.95 }} />
        </div>
      </section>

      <section className="grid grid-3">
        <div className="card">
          <div className="stat">
            <span className="value gradient-text">{PROGRAM_DAYS.length} jours</span>
            <span className="label">de parcours progressif, puis 10 jours personnalisés si utile</span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="value gradient-text">{itemCount}+</span>
            <span className="label">exercices originaux corrigés et expliqués en français</span>
          </div>
        </div>
        <div className="card">
          <div className="stat">
            <span className="value gradient-text">{VOCAB.length}</span>
            <span className="label">mots et expressions en répétition espacée</span>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Ce que vous allez travailler</h2>
        <div className="grid grid-2" style={{ marginTop: 12 }}>
          {[
            ['🎯', 'Un parcours adaptatif', 'La difficulté, les indices et les révisions s’ajustent à vos réponses réellement enregistrées.'],
            ['🗣️', 'L’oral, vraiment', 'Synthèse vocale, répétition, reconnaissance vocale quand votre navigateur la permet, conversations guidées.'],
            ['🧠', 'Une mémoire durable', 'Répétition espacée : les mots oubliés reviennent plus souvent, les mots maîtrisés s’espacent.'],
            ['🤖', 'Un professeur IA (facultatif)', 'Si un service est configuré. Sinon, un partenaire local clairement identifié, avec des scénarios préparés.'],
            ['📈', 'Des progrès mesurés', 'Test de positionnement, bilan intermédiaire et évaluation finale comparable, compétence par compétence.'],
            ['👥', 'À plusieurs (facultatif)', 'Groupes, défis et classements entre amis, avec des données privées par défaut.'],
          ].map(([ico, title, text]) => (
            <div key={title} className="feature">
              <div className="ico" aria-hidden>
                {ico}
              </div>
              <div>
                <h3 style={{ marginBottom: 4 }}>{title}</h3>
                <p className="small muted" style={{ margin: 0 }}>
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="notice info" style={{ marginTop: 16 }}>
        <strong>Notre engagement d’honnêteté :</strong> aucune application ne peut garantir un niveau bilingue en 14 ou 24 jours. LÉON ACADÉMIE mesure vos progrès réels, vous montre ce qui reste à travailler, et présente les niveaux comme des estimations pédagogiques — pas comme une certification officielle.
      </section>
    </div>
  );
}
