import React, { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import { getDocsFromServer } from 'firebase/firestore';
import { appInstallsRef } from '../config/firebase';
import { getAllUsers } from '../services/analyticsService';
import { DateRangeSelector } from './DateRangeSelector';
import type { User, DateRange, PresetRange } from '../types';
import type { ChartOptions } from 'chart.js';
import './Acquisition.css';

const DOW_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);

interface RawEvent {
  date: Date;
  platform: 'ios' | 'android';
}

interface AcquisitionData {
  source: 'installs' | 'accounts';
  total: number;
  ios: number;
  android: number;
  heatmap: number[][];
  heatmapIOS: number[][];
  heatmapAndroid: number[][];
  byHour: number[];
  byHourIOS: number[];
  byHourAndroid: number[];
  byDow: number[];
  byDowIOS: number[];
  byDowAndroid: number[];
  topSlots: { dow: number; hour: number; count: number }[];
}

const parseUserDate = (d: any): Date | null => {
  if (!d) return null;
  if (typeof d === 'object' && 'toDate' in d) return d.toDate();
  const p = new Date(d);
  return isNaN(p.getTime()) ? null : p;
};

const heatmapColor = (value: number, max: number): { bg: string; text: string } => {
  if (max === 0 || value === 0) return { bg: '#f7fafc', text: '#a0aec0' };
  const t = value / max;
  const r = Math.round(247 + (199 - 247) * t);
  const g = Math.round(250 + (91 - 250) * t);
  const b = Math.round(252 + (74 - 252) * t);
  return { bg: `rgb(${r},${g},${b})`, text: t > 0.55 ? 'white' : '#2d3748' };
};

const compute = (events: RawEvent[]): AcquisitionData => {
  const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  const heatmapIOS = Array.from({ length: 7 }, () => Array(24).fill(0));
  const heatmapAndroid = Array.from({ length: 7 }, () => Array(24).fill(0));
  let total = 0, ios = 0, android = 0;

  events.forEach(({ date, platform }) => {
    const dow = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const hour = date.getHours();
    heatmap[dow][hour]++;
    total++;
    if (platform === 'ios') { heatmapIOS[dow][hour]++; ios++; }
    else { heatmapAndroid[dow][hour]++; android++; }
  });

  const byHour = Array(24).fill(0);
  const byHourIOS = Array(24).fill(0);
  const byHourAndroid = Array(24).fill(0);
  const byDow = Array(7).fill(0);
  const byDowIOS = Array(7).fill(0);
  const byDowAndroid = Array(7).fill(0);

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      byHour[h] += heatmap[d][h];
      byHourIOS[h] += heatmapIOS[d][h];
      byHourAndroid[h] += heatmapAndroid[d][h];
      byDow[d] += heatmap[d][h];
      byDowIOS[d] += heatmapIOS[d][h];
      byDowAndroid[d] += heatmapAndroid[d][h];
    }
  }

  const slots: { dow: number; hour: number; count: number }[] = [];
  for (let d = 0; d < 7; d++)
    for (let h = 0; h < 24; h++)
      if (heatmap[d][h] > 0) slots.push({ dow: d, hour: h, count: heatmap[d][h] });
  slots.sort((a, b) => b.count - a.count);

  // Infer source from whether events look like installs or accounts
  const source: 'installs' | 'accounts' = 'installs'; // set by caller
  return { source, total, ios, android, heatmap, heatmapIOS, heatmapAndroid, byHour, byHourIOS, byHourAndroid, byDow, byDowIOS, byDowAndroid, topSlots: slots.slice(0, 5) };
};

const Info: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="info-tooltip" style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6 }}>
    <span className="info-icon" style={{ fontSize: 13 }}>ℹ️</span>
    <div className="tooltip-content">{children}</div>
  </span>
);

const getTopWindows = (heatmap: number[][], windowSize: number, top = 5) => {
  const slots: { dow: number; hour: number; count: number }[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h <= 24 - windowSize; h++) {
      let count = 0;
      for (let w = 0; w < windowSize; w++) count += heatmap[d][h + w];
      if (count > 0) slots.push({ dow: d, hour: h, count });
    }
  }
  slots.sort((a, b) => b.count - a.count);
  return slots.slice(0, top);
};

export const Acquisition: React.FC = () => {
  const [rawEvents, setRawEvents] = useState<RawEvent[]>([]);
  const [sourceType, setSourceType] = useState<'installs' | 'accounts'>('accounts');
  const [data, setData] = useState<AcquisitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [osFilter, setOsFilter] = useState<'all' | 'ios' | 'android'>('all');
  const [slotWindow, setSlotWindow] = useState<1 | 2 | 3>(2);
  const [preset, setPreset] = useState<PresetRange>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });

  useEffect(() => { loadRawData(); }, []);

  useEffect(() => {
    if (rawEvents.length > 0 || !loading) applyFilter(rawEvents, dateRange);
  }, [dateRange, rawEvents]);

  const loadRawData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [installsSnap, users] = await Promise.all([
        getDocsFromServer(appInstallsRef).catch(() => ({ docs: [] as any[] })),
        getAllUsers(),
      ]);

      const installs = (installsSnap as any).docs.map((d: any) => d.data());
      const useInstalls = installs.length >= 10;
      setSourceType(useInstalls ? 'installs' : 'accounts');

      const events: RawEvent[] = [];

      if (useInstalls) {
        installs.forEach((install: any) => {
          if (!install.timestamp) return;
          const d = install.timestamp.toDate ? install.timestamp.toDate() : new Date(install.timestamp);
          if (isNaN(d.getTime())) return;
          events.push({ date: d, platform: install.platform === 'ios' ? 'ios' : 'android' });
        });
      } else {
        users.forEach((u: User) => {
          const d = parseUserDate(u.creationDate);
          if (!d) return;
          events.push({ date: d, platform: u.provider === 'apple' ? 'ios' : 'android' });
        });
      }

      setRawEvents(events);
      const computed = compute(events);
      computed.source = useInstalls ? 'installs' : 'accounts';
      setData(computed);
    } catch (err: any) {
      setError(err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = useCallback((events: RawEvent[], range: DateRange) => {
    const filtered = (range.start && range.end)
      ? events.filter(e => e.date >= range.start! && e.date <= range.end!)
      : events;
    const computed = compute(filtered);
    computed.source = sourceType;
    setData(computed);
  }, [sourceType]);

  if (loading) return <div className="acquisition"><h2>📥 Acquisition</h2><div className="acq-loading">Chargement...</div></div>;
  if (error) return <div className="acquisition"><h2>📥 Acquisition</h2><div className="acq-error">{error}</div></div>;
  if (!data) return null;

  const activeHeatmap = osFilter === 'ios' ? data.heatmapIOS : osFilter === 'android' ? data.heatmapAndroid : data.heatmap;
  const activeByHour = osFilter === 'ios' ? data.byHourIOS : osFilter === 'android' ? data.byHourAndroid : data.byHour;
  const activeByDow = osFilter === 'ios' ? data.byDowIOS : osFilter === 'android' ? data.byDowAndroid : data.byDow;
  const heatmapMax = Math.max(...activeHeatmap.flat());
  const pct = (n: number) => data.total > 0 ? `${Math.round(n / data.total * 100)}%` : '—';

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  const barOptionsStacked: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' } },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
  };

  return (
    <div className="acquisition">
      <div className="acq-header">
        <h2>📥 Acquisition</h2>
        <span className={`source-badge ${data.source}`}>
          {data.source === 'installs' ? '📊 Source : AppInstalls' : '⚠️ Proxy : créations de compte'}
        </span>
        <button className="acq-refresh-btn" onClick={loadRawData}>🔄 Actualiser</button>
      </div>

      {data.source === 'accounts' && (
        <div className="acq-notice">
          La collection AppInstalls ne contient pas assez de données. Les graphiques utilisent la date de création de compte comme proxy.
          L'OS est approximé via le provider (Apple Sign-in → iOS, autres → Android/inconnu).
        </div>
      )}

      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      {/* ── Vue globale ── */}
      <div className="acq-global">
        <div className="acq-stat-card">
          <div className="acq-stat-value">{data.total.toLocaleString()}</div>
          <div className="acq-stat-label">{data.source === 'installs' ? 'Téléchargements' : 'Inscriptions'}</div>
          {(dateRange.start && dateRange.end) && (
            <div className="acq-stat-pct">
              {dateRange.start.toLocaleDateString('fr-FR')} → {dateRange.end.toLocaleDateString('fr-FR')}
            </div>
          )}
        </div>
        <div className="acq-stat-card ios">
          <div className="acq-stat-value">{data.ios.toLocaleString()}</div>
          <div className="acq-stat-label"> iOS</div>
          <div className="acq-stat-pct">{pct(data.ios)}</div>
        </div>
        <div className="acq-stat-card android">
          <div className="acq-stat-value">{data.android.toLocaleString()}</div>
          <div className="acq-stat-label"> Android</div>
          <div className="acq-stat-pct">{pct(data.android)}</div>
        </div>
        <div className="acq-stat-card best">
          {(() => {
            const best = getTopWindows(activeHeatmap, slotWindow, 1)[0];
            return <>
              <div className="acq-stat-value">
                {best ? `${DOW_LABELS[best.dow]} ${String(best.hour).padStart(2,'0')}h` : '—'}
              </div>
              <div className="acq-stat-label">Meilleur créneau ({slotWindow}h)</div>
              <div className="acq-stat-pct">{best ? `${best.count} événements` : ''}</div>
            </>;
          })()}
        </div>
      </div>

      {/* ── Filtres OS ── */}
      <div className="acq-os-filters">
        {(['all', 'ios', 'android'] as const).map(f => (
          <button key={f} className={`acq-os-btn ${osFilter === f ? 'active' : ''}`} onClick={() => setOsFilter(f)}>
            {f === 'all' ? '🌐 Tous' : f === 'ios' ? ' iOS' : ' Android'}
          </button>
        ))}
      </div>

      {data.total === 0 ? (
        <div className="acq-card" style={{ textAlign: 'center', color: '#718096', padding: 40 }}>
          Aucune donnée sur cette période.
        </div>
      ) : (
        <>
          {/* ── Heatmap ── */}
          <div className="acq-card">
            <h3>
              🗓️ Heatmap — Jour × Heure
              <Info>
                <strong>Lire la heatmap</strong>
                <ul>
                  <li>Chaque cellule = nb de téléchargements à ce créneau précis (ex : dimanche 18h)</li>
                  <li>Plus la cellule est foncée, plus le créneau est performant</li>
                  <li>Survole une cellule pour voir le chiffre exact</li>
                  <li>Utilise les filtres iOS / Android pour comparer les deux OS</li>
                  <li>Ex : cellule rouge foncée = créneau idéal pour lancer une pub ou un post</li>
                </ul>
              </Info>
            </h3>
            <div className="heatmap-wrap">
              <table className="heatmap-table">
                <thead>
                  <tr>
                    <th></th>
                    {HOUR_LABELS.map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {DOW_LABELS.map((day, d) => (
                    <tr key={day}>
                      <td className="heatmap-day-label">{day}</td>
                      {Array.from({ length: 24 }, (_, h) => {
                        const val = activeHeatmap[d][h];
                        const { bg, text } = heatmapColor(val, heatmapMax);
                        return (
                          <td key={h} className="heatmap-cell" style={{ background: bg, color: text }} title={`${day} ${String(h).padStart(2,'0')}h : ${val}`}>
                            {val > 0 ? val : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Top créneaux ── */}
          <div className="acq-card">
            <h3>
              🏆 Top 5 créneaux de la semaine
              <Info>
                <strong>Meilleurs créneaux pour acquérir des utilisateurs</strong>
                <ul>
                  <li>Classés par volume sur la période sélectionnée</li>
                  <li>La fenêtre cumule les téléchargements sur 1h, 2h ou 3h consécutives</li>
                  <li>Ex : Dim 17h–20h → planifier le post Instagram le dimanche vers 16h30</li>
                </ul>
              </Info>
            </h3>
            <div className="acq-window-selector">
              {([1, 2, 3] as const).map(w => (
                <button key={w} className={`acq-os-btn ${slotWindow === w ? 'active' : ''}`} onClick={() => setSlotWindow(w)}>
                  Fenêtre {w}h
                </button>
              ))}
            </div>
            <div className="top-slots-grid">
              {getTopWindows(activeHeatmap, slotWindow).map((slot, i, arr) => {
                const maxCount = arr[0]?.count || 1;
                return (
                  <div key={i} className="top-slot-card">
                    <div className="top-slot-rank">#{i + 1}</div>
                    <div className="top-slot-time">
                      <span className="top-slot-day">{DOW_LABELS[slot.dow]}</span>
                      <span className="top-slot-hour">{String(slot.hour).padStart(2,'0')}h – {String(slot.hour + slotWindow).padStart(2,'0')}h</span>
                    </div>
                    <div className="top-slot-bar-wrap">
                      <div className="top-slot-bar" style={{ width: `${Math.round(slot.count / maxCount * 100)}%` }} />
                    </div>
                    <div className="top-slot-count">{slot.count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="acq-charts-row">
            {/* ── Par heure ── */}
            <div className="acq-card acq-card-half">
              <h3>
                🕐 Par heure du jour
                <Info>
                  <strong>Volume cumulé par heure (tous jours confondus)</strong>
                  <ul>
                    <li>Somme de tous les téléchargements à chaque heure sur la période</li>
                    <li>Ex : pic à 20h → les parents regardent l'App Store le soir</li>
                  </ul>
                </Info>
              </h3>
              <div style={{ height: 240 }}>
                <Bar
                  data={{ labels: HOUR_LABELS, datasets: [{ label: 'Téléchargements', data: activeByHour, backgroundColor: 'rgba(199,91,74,0.75)', borderRadius: 3 }] }}
                  options={{ ...barOptions, scales: { ...barOptions.scales, x: { ticks: { font: { size: 9 } } } } }}
                />
              </div>
            </div>

            {/* ── Par jour ── */}
            <div className="acq-card acq-card-half">
              <h3>
                📅 Par jour de la semaine
                <Info>
                  <strong>Volume total par jour sur la période</strong>
                  <ul>
                    <li>Ex : pic le week-end → audience de parents avec du temps libre</li>
                    <li>Ex : pic en semaine → acquisition via recommandation médicale</li>
                  </ul>
                </Info>
              </h3>
              <div style={{ height: 240 }}>
                <Bar
                  data={{ labels: DOW_LABELS, datasets: [{ label: 'Téléchargements', data: activeByDow, backgroundColor: 'rgba(88,86,214,0.75)', borderRadius: 3 }] }}
                  options={barOptions}
                />
              </div>
            </div>
          </div>

          {/* ── iOS vs Android par jour ── */}
          <div className="acq-card">
            <h3>
              📊 iOS vs Android par jour de la semaine
              <Info>
                <strong>Comportement d'acquisition par OS</strong>
                <ul>
                  <li>Permet de voir si iOS et Android arrivent les mêmes jours</li>
                  {data.source === 'accounts' && <li>⚠️ Mode proxy : iOS = Sign in with Apple, Android = Google/Email</li>}
                  <li>Ex : iOS dominant le week-end → familles Apple consultent l'App Store le dimanche</li>
                </ul>
              </Info>
            </h3>
            <div style={{ height: 260 }}>
              <Bar
                data={{ labels: DOW_LABELS, datasets: [{ label: ' iOS', data: data.byDowIOS, backgroundColor: 'rgba(90,200,250,0.8)', borderRadius: 3 }, { label: ' Android', data: data.byDowAndroid, backgroundColor: 'rgba(52,199,89,0.8)', borderRadius: 3 }] }}
                options={barOptionsStacked}
              />
            </div>
          </div>

          {/* ── iOS vs Android par heure ── */}
          <div className="acq-card">
            <h3>
              🕐 iOS vs Android par heure du jour
              <Info>
                <strong>Décalage horaire entre les deux OS</strong>
                <ul>
                  <li>Certains OS ont des pics à des heures différentes</li>
                  <li>Utile pour cibler les pubs au bon moment selon la plateforme</li>
                  {data.source === 'accounts' && <li>⚠️ Mode proxy : iOS = Apple Sign-in, Android = Google/Email</li>}
                </ul>
              </Info>
            </h3>
            <div style={{ height: 260 }}>
              <Bar
                data={{ labels: HOUR_LABELS, datasets: [{ label: ' iOS', data: data.byHourIOS, backgroundColor: 'rgba(90,200,250,0.8)', borderRadius: 3 }, { label: ' Android', data: data.byHourAndroid, backgroundColor: 'rgba(52,199,89,0.8)', borderRadius: 3 }] }}
                options={{ ...barOptionsStacked, scales: { ...barOptionsStacked.scales, x: { ...(barOptionsStacked.scales?.x || {}), stacked: true, ticks: { font: { size: 9 } } } } }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
