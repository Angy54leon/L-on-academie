import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initAccount } from './state/account';
import { startAutoSync } from './services/sync';
import { loadVoices } from './services/speech';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Services facultatifs : sans configuration, ils ne font rien.
void initAccount();
startAutoSync();
void loadVoices();

// Mode hors ligne (PWA) : uniquement sur la version compilée.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* le mode hors ligne ne sera simplement pas disponible */
    });
  });
}
