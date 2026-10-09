// Composants d'interface réutilisables.
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { speak, stopSpeaking, ttsSupported } from '../services/speech';
import { useLearner } from '../state/store';

// ------------------------------------------------------------------ Toasts

interface Toast {
  id: number;
  text: string;
  kind?: 'info' | 'reward' | 'error';
}
let toasts: Toast[] = [];
let nextId = 1;
const toastListeners = new Set<() => void>();
const emitToasts = () => toastListeners.forEach((l) => l());

export function toast(text: string, kind: Toast['kind'] = 'info', ms = 4500) {
  const t = { id: nextId++, text, kind };
  toasts = [...toasts, t].slice(-4);
  emitToasts();
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emitToasts();
  }, ms);
}

export function Toasts() {
  const list = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
  );
  return (
    <div className="toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.kind ?? ''}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Modal

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn icon sm ghost" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Indicateurs

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({ value, size = 120, stroke = 10, children, label }: { value: number; size?: number; stroke?: number; children?: ReactNode; label: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="ring" role="img" aria-label={label} style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .6s ease' }}
        />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  );
}

export function Stat({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return (
    <div className="stat" title={hint}>
      <span className="value">{value}</span>
      <span className="label">{label}</span>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-head">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      {children}
    </header>
  );
}

// ------------------------------------------------------------------ Audio

/** Bouton pour écouter une phrase anglaise (synthèse vocale du navigateur). */
export function Listen({ text, label = 'Écouter', compact = false, slowOption = false }: { text: string; label?: string; compact?: boolean; slowOption?: boolean }) {
  const s = useLearner().settings;
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!ttsSupported())
    return (
      <span className="badge" title="La synthèse vocale n’est pas disponible dans ce navigateur.">
        🔇 Audio indisponible
      </span>
    );
  const play = (rate: number) => {
    setPlaying(true);
    speak(text, { accent: s.accent, voiceURI: s.voiceURI, rate, onEnd: () => setPlaying(false) });
  };
  return (
    <span className="row" style={{ gap: 6, display: 'inline-flex' }}>
      <button type="button" className={`btn ${compact ? 'icon sm' : 'sm'}`} onClick={() => play(s.speechRate)} aria-label={`${label} : ${text}`} title={label}>
        {playing ? '🔊' : '🔈'}
        {!compact && <span>{label}</span>}
      </button>
      {slowOption && (
        <button type="button" className="btn sm ghost" onClick={() => play(Math.max(0.5, s.speechRate - 0.3))} aria-label="Écouter lentement">
          🐢 Lent
        </button>
      )}
    </span>
  );
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeDue(iso: string, now = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  if (diff <= 0) return 'maintenant';
  const h = diff / 3_600_000;
  if (h < 1) return `dans ${Math.max(1, Math.round(diff / 60000))} min`;
  if (h < 24) return `dans ${Math.round(h)} h`;
  return `dans ${Math.round(h / 24)} j`;
}
