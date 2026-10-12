// Barrière d'erreur : si une page échoue (fichier introuvable après une mise à jour, navigateur incompatible…),
// on affiche un message clair à la place de la page, sans faire disparaître le reste de l'application.
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { isChunkLoadError } from '../services/chunkRecovery';

interface Props {
  children: ReactNode;
  /** Variante plein écran (dernier recours, autour de toute l'application). */
  fullScreen?: boolean;
}

interface State {
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Journal technique uniquement (pas de données personnelles).
    console.error('[LÉON ACADÉMIE] Erreur d’affichage :', error?.name, error?.message, info.componentStack?.split('\n').slice(0, 4).join(' '));
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkLoadError(error);
    const details = `${error.name}: ${error.message}\n${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`;
    const box = (
      <div className="card" role="alert" style={{ maxWidth: 640, margin: this.props.fullScreen ? '40px auto' : '0 auto' }}>
        <h1 style={{ fontSize: '1.3rem' }}>{chunk ? 'Une nouvelle version de LÉON ACADÉMIE est disponible' : 'Cette page n’a pas pu s’afficher'}</h1>
        <p>
          {chunk
            ? 'Cette page n’a pas pu être chargée, probablement parce que l’application a été mise à jour pendant qu’elle était ouverte, ou à cause d’une coupure réseau. Rechargez la page pour obtenir la dernière version : votre progression est conservée.'
            : 'Un problème est survenu sur cet appareil. Votre progression n’est pas perdue. Rechargez la page ; si le problème revient, mettez à jour le navigateur ou utilisez Chrome (Android) ou Safari (iPad).'}
        </p>
        <div className="row">
          <button type="button" className="btn primary" onClick={() => window.location.reload()}>
            ↻ Recharger la page
          </button>
          <a className="btn" href="#/dashboard" onClick={() => this.setState({ error: null })}>
            Retour au tableau de bord
          </a>
        </div>
        <details style={{ marginTop: 12 }}>
          <summary className="small muted" style={{ cursor: 'pointer' }}>
            Détails techniques (à transmettre en cas de problème)
          </summary>
          <pre className="diag-log">{details}</pre>
          <button type="button" className="btn sm ghost" onClick={() => void navigator.clipboard?.writeText(details).catch(() => undefined)}>
            📋 Copier
          </button>
        </details>
      </div>
    );
    return this.props.fullScreen ? <div style={{ padding: 16 }}>{box}</div> : box;
  }
}
