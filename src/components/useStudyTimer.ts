// Mesure du temps d'étude ACTIF : on compte seulement quand la page est visible
// et que l'utilisateur a interagi dans les 90 dernières secondes.
import { useEffect, useRef } from 'react';
import { addStudyTime } from '../core/learner';
import { update } from '../state/store';

export function useStudyTimer(active = true) {
  const seconds = useRef(0);
  const pending = useRef(0);
  const lastInteraction = useRef(Date.now());

  useEffect(() => {
    if (!active) return;
    const mark = () => (lastInteraction.current = Date.now());
    const events = ['keydown', 'pointerdown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastInteraction.current < 90_000) {
        seconds.current++;
        pending.current++;
      }
      if (pending.current >= 30) flush();
    }, 1000);
    const flush = () => {
      const p = pending.current;
      pending.current = 0;
      if (p > 0) update((s, now) => addStudyTime(s, p, now), { silent: false });
    };
    return () => {
      clearInterval(tick);
      events.forEach((e) => window.removeEventListener(e, mark));
      flush();
    };
  }, [active]);

  return seconds;
}
