// Graphiques SVG légers (aucune bibliothèque). Palette validée pour le daltonisme,
// étiquettes directes + vue tableau accessible pour chaque graphique.
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Largeur réelle du conteneur : le graphique est dessiné à taille réelle (texte lisible sur mobile). */
function useWidth(fallback = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(280, Math.round(el.clientWidth)));
    update();
    if (typeof ResizeObserver === 'undefined') {
      // Navigateurs anciens : on suit simplement le redimensionnement de la fenêtre.
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Barre avec coins arrondis (4 px) uniquement à l'extrémité « données ». */
function roundedBar(x: number, y: number, w: number, h: number, dir: 'up' | 'right'): string {
  const r = Math.min(4, dir === 'up' ? w / 2 : h / 2, dir === 'up' ? h : w);
  if (h <= 0 || w <= 0) return '';
  if (dir === 'up')
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
}

function TableToggle({ children, table }: { children: ReactNode; table: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {show ? table : children}
      <button type="button" className="btn ghost sm" onClick={() => setShow(!show)} style={{ marginTop: 6 }}>
        {show ? '📊 Voir le graphique' : '📋 Voir le tableau'}
      </button>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  /** Texte de l'infobulle. */
  title?: string;
}

/** Histogramme vertical (une série). */
export function VBarChart({ data, unit = '', height = 180, color = 'var(--series-1)', ariaLabel }: { data: BarDatum[]; unit?: string; height?: number; color?: string; ariaLabel: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [ref, W] = useWidth();
  const H = height;
  const pad = { l: 34, r: 8, t: 14, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const bw = (W - pad.l - pad.r) / data.length;
  const barW = Math.max(4, Math.min(28, bw - 6));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / nice);
  const ticks = [0, nice / 2, nice];
  const labelEvery = Math.max(1, Math.ceil((data.length * 44) / (W - pad.l)));
  return (
    <TableToggle
      table={
        <table className="data">
          <thead>
            <tr>
              <th>Jour</th>
              <th className="num">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.title ?? d.label}</td>
                <td className="num">
                  {d.value} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="chart" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid-line" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.l + i * bw + (bw - barW) / 2;
            const top = y(d.value);
            return (
              <g key={d.label + i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
                <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
                <path d={roundedBar(x, top, barW, H - pad.b - top, 'up')} fill={color} opacity={hover === null || hover === i ? 1 : 0.55} />
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={H - 6} textAnchor="middle">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className="chart-tooltip" style={{ left: `${Math.min(80, Math.max(20, ((pad.l + hover * bw + bw / 2) / W) * 100))}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
            <strong>{data[hover].title ?? data[hover].label}</strong> · {data[hover].value} {unit}
          </div>
        )}
      </div>
    </TableToggle>
  );
}

function niceMax(v: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** Barres horizontales de 0 à 100 (une série), étiquettes directes. */
export function HBarChart({ data, ariaLabel, color = 'var(--series-1)' }: { data: { label: string; value: number | null; note?: string }[]; ariaLabel: string; color?: string }) {
  const [ref, W] = useWidth();
  const rowH = 30;
  const labelW = Math.min(190, Math.round(W * 0.42));
  const H = data.length * rowH + 4;
  const scale = (v: number) => ((W - labelW - 56) * v) / 100;
  return (
    <TableToggle
      table={
        <table className="data">
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td className="num">{d.value === null ? 'non évalué' : `${d.value} %`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="chart" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
          {data.map((d, i) => {
            const yy = i * rowH + 6;
            return (
              <g key={d.label}>
                <title>{`${d.label} : ${d.value === null ? 'non évalué' : `${d.value} %`}`}</title>
                <text x={0} y={yy + 13} style={{ fontSize: 12 }}>
                  {d.label}
                </text>
                <rect x={labelW} y={yy + 3} width={scale(100)} height={14} rx={4} fill="var(--surface-3)" />
                {d.value !== null && d.value > 0 && <path d={roundedBar(labelW, yy + 3, Math.max(4, scale(d.value)), 14, 'right')} fill={color} />}
                <text className="value-label" x={labelW + scale(d.value ?? 0) + 8} y={yy + 14}>
                  {d.value === null ? '—' : `${d.value} %`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </TableToggle>
  );
}

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** Barre empilée unique (répartition), avec légende et étiquettes. */
export function StackedBar({ segments, ariaLabel }: { segments: Segment[]; ariaLabel: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const [ref, W] = useWidth();
  const H = 30;
  let x = 0;
  return (
    <TableToggle
      table={
        <table className="data">
          <tbody>
            {segments.map((s) => (
              <tr key={s.label}>
                <td>{s.label}</td>
                <td className="num">{s.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="legend">
        {segments.map((s) => (
          <span key={s.label}>
            <span className="sw" style={{ background: s.color }} />
            {s.label} : <strong>{s.value}</strong>
          </span>
        ))}
      </div>
      <div className="chart" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
          <rect x={0} y={4} width={W} height={22} rx={6} fill="var(--surface-3)" />
          {total > 0 &&
            segments.map((s) => {
              const w = (W * s.value) / total;
              const seg = (
                <g key={s.label}>
                  <title>{`${s.label} : ${s.value}`}</title>
                  {w > 0 && <rect x={x + (x > 0 ? 1 : 0)} y={4} width={Math.max(0, w - (x > 0 ? 2 : 0))} height={22} rx={4} fill={s.color} />}
                </g>
              );
              x += w;
              return seg;
            })}
        </svg>
      </div>
    </TableToggle>
  );
}

/** Comparaison avant / après par compétence (barres horizontales groupées). */
export function CompareBars({ rows, series, ariaLabel }: { rows: { label: string; values: (number | null)[] }[]; series: { label: string; color: string }[]; ariaLabel: string }) {
  const [ref, W] = useWidth();
  const labelW = Math.min(190, Math.round(W * 0.42));
  const barH = 10;
  const groupH = series.length * (barH + 2) + 14;
  const H = rows.length * groupH;
  const scale = (v: number) => ((W - labelW - 50) * v) / 100;
  return (
    <TableToggle
      table={
        <table className="data">
          <thead>
            <tr>
              <th>Compétence</th>
              {series.map((s) => (
                <th key={s.label} className="num">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                {r.values.map((v, i) => (
                  <td key={i} className="num">
                    {v === null ? '—' : v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="legend">
        {series.map((s) => (
          <span key={s.label}>
            <span className="sw" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="chart" ref={ref}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
          {rows.map((r, i) => {
            const y0 = i * groupH + 4;
            return (
              <g key={r.label}>
                <text x={0} y={y0 + groupH / 2 - 2} style={{ fontSize: 12 }}>
                  {r.label}
                </text>
                {r.values.map((v, j) => {
                  const yy = y0 + j * (barH + 2);
                  return (
                    <g key={j}>
                      <title>{`${r.label} — ${series[j].label} : ${v === null ? 'non évalué' : v}`}</title>
                      {v !== null && v > 0 && <path d={roundedBar(labelW, yy, Math.max(4, scale(v)), barH, 'right')} fill={series[j].color} />}
                      <text className="value-label" x={labelW + scale(v ?? 0) + 6} y={yy + barH - 1} style={{ fontSize: 10 }}>
                        {v === null ? '—' : v}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </TableToggle>
  );
}
