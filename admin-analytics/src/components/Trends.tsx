import React, { useState, useEffect, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';

const Info: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="info-tooltip" style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 6 }}>
    <span className="info-icon" style={{ fontSize: 13 }}>ℹ️</span>
    <div className="tooltip-content">{children}</div>
  </span>
);
import { getAllBabies, getAllUsers } from '../services/analyticsService';
import { getDocsFromServer } from 'firebase/firestore';
import { appInstallsRef } from '../config/firebase';
import type { Baby, User } from '../types';
import { parseBabyDate } from '../types';
import type { ChartOptions } from 'chart.js';
import './Trends.css';

type Period = 'day' | 'week' | 'month' | 'year';

interface TimeSeriesData {
  labels: string[];
  downloads: number[];
  accounts: number[];
  babies: number[];
  babiesWith10Plus: number[];
  tasks: number[];
}

interface LoginFreqData {
  today: number;
  thisWeek: number;
  thisMonth: number;
  older: number;
  noData: number;
}

interface HeatmapData {
  byHour: number[]; // 24 values
  byDayOfWeek: number[]; // 7 values Mon=0..Sun=6
}

interface CohortRow {
  label: string;
  size: number;
  w1: number;
  w2: number;
  w4: number;
  w8: number;
}

const parseUserDate = (d: any): Date | null => {
  if (!d) return null;
  if (typeof d === 'object' && 'toDate' in d) return d.toDate();
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const getISOWeekKey = (d: Date): string => {
  // Use ISO week: Mon-Sun, week containing first Thursday
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayOfWeek = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const getWeekStart = (d: Date): Date => {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const retentionColor = (pct: number): string => {
  if (pct >= 60) return '#22c55e';
  if (pct >= 40) return '#84cc16';
  if (pct >= 20) return '#f59e0b';
  if (pct > 0) return '#ef4444';
  return '#e2e8f0';
};

export const Trends: React.FC = () => {
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData | null>(null);
  const [loginFreq, setLoginFreq] = useState<LoginFreqData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [allBabies, setAllBabies] = useState<Baby[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allInstalls, setAllInstalls] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [visibleCurves, setVisibleCurves] = useState({
    downloads: true,
    accounts: true,
    babies: true,
    babiesWith10Plus: true,
    tasks: true,
  });

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (dataLoaded) computeTimeSeries(allBabies, allUsers, allInstalls);
  }, [period, dataLoaded]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [babies, users, installsSnapshot] = await Promise.all([
        getAllBabies(),
        getAllUsers(),
        getDocsFromServer(appInstallsRef).catch(() => ({ docs: [] as any[] })),
      ]);
      const installs = (installsSnapshot as any).docs.map((doc: any) => doc.data());

      setAllBabies(babies);
      setAllUsers(users);
      setAllInstalls(installs);

      // Login frequency
      const now = new Date();
      const nowMs = now.getTime();
      const freq: LoginFreqData = { today: 0, thisWeek: 0, thisMonth: 0, older: 0, noData: 0 };
      users.forEach((u: User) => {
        if (!u.lastLoginDate) { freq.noData++; return; }
        const d = new Date(u.lastLoginDate);
        if (isNaN(d.getTime())) { freq.noData++; return; }
        const diff = nowMs - d.getTime();
        if (diff < 86400000) freq.today++;
        else if (diff < 7 * 86400000) freq.thisWeek++;
        else if (diff < 30 * 86400000) freq.thisMonth++;
        else freq.older++;
      });
      setLoginFreq(freq);

      // Heatmap: tasks by hour of day and day of week
      const byHour = Array(24).fill(0);
      const byDayOfWeek = Array(7).fill(0); // Mon=0..Sun=6
      babies.forEach((baby: Baby) => {
        baby.tasks?.forEach(task => {
          if (!task.date) return;
          const d = new Date(task.date);
          if (isNaN(d.getTime())) return;
          byHour[d.getHours()]++;
          const dow = d.getDay();
          byDayOfWeek[dow === 0 ? 6 : dow - 1]++;
        });
      });
      setHeatmap({ byHour, byDayOfWeek });

      // Cohort retention (by ISO week)
      const userBabyMap = new Map<string, Baby>();
      babies.forEach((baby: Baby) => {
        if (baby.admin) userBabyMap.set(baby.admin, baby);
      });

      const cohortMap = new Map<string, { users: User[]; weekStart: Date }>();
      users.forEach((u: User) => {
        const d = parseUserDate(u.creationDate);
        if (!d) return;
        const key = getISOWeekKey(d);
        const ws = getWeekStart(d);
        if (!cohortMap.has(key)) cohortMap.set(key, { users: [], weekStart: ws });
        cohortMap.get(key)!.users.push(u);
      });

      const sortedCohorts = Array.from(cohortMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14);

      const cohortRows: CohortRow[] = sortedCohorts.map(([label, { users: cu, weekStart }]) => {
        const checkWeek = (offset: number) => {
          const start = new Date(weekStart.getTime() + offset * 7 * 86400000);
          const end = new Date(start.getTime() + 7 * 86400000);
          const active = cu.filter(u => {
            const baby = userBabyMap.get(u.userId);
            if (!baby?.tasks) return false;
            return baby.tasks.some(t => {
              const d = new Date(t.date);
              return !isNaN(d.getTime()) && d >= start && d < end;
            });
          }).length;
          return cu.length > 0 ? Math.round((active / cu.length) * 100) : 0;
        };
        return { label, size: cu.length, w1: checkWeek(1), w2: checkWeek(2), w4: checkWeek(4), w8: checkWeek(8) };
      });
      setCohorts(cohortRows);

      setDataLoaded(true);
    } catch (err: any) {
      console.error('Error loading trends data:', err);
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const computeTimeSeries = useCallback((babies: Baby[], users: User[], installs: any[]) => {
    const now = new Date();
    const periods = generatePeriods(now, period, 12);

    const downloads: number[] = [];
    const accountsCount: number[] = [];
    const babiesCount: number[] = [];
    const babiesWith10Plus: number[] = [];
    const tasksCount: number[] = [];

    periods.forEach(({ start, end }) => {
      downloads.push(installs.filter((install: any) => {
        if (!install.timestamp) return false;
        const d = install.timestamp.toDate ? install.timestamp.toDate() : new Date(install.timestamp);
        return d >= start && d < end;
      }).length);

      accountsCount.push(users.filter((u: User) => {
        const d = parseUserDate(u.creationDate);
        return d !== null && d >= start && d < end;
      }).length);

      const babiesInPeriod = babies.filter((b: Baby) => {
        const d = parseBabyDate(b);
        return d !== null && d >= start && d < end;
      });
      babiesCount.push(babiesInPeriod.length);
      babiesWith10Plus.push(babiesInPeriod.filter(b => (b.tasks?.length || 0) > 10).length);

      let tc = 0;
      babies.forEach((b: Baby) => {
        b.tasks?.forEach(task => {
          if (!task.date) return;
          const d = new Date(task.date);
          if (!isNaN(d.getTime()) && d >= start && d < end) tc++;
        });
      });
      tasksCount.push(tc);
    });

    setTimeSeries({
      labels: periods.map(({ start, end }) => formatPeriodLabel(start, end, period)),
      downloads,
      accounts: accountsCount,
      babies: babiesCount,
      babiesWith10Plus,
      tasks: tasksCount,
    });
  }, [period]);

  const generatePeriods = (endDate: Date, periodType: Period, count: number) => {
    const periods: { start: Date; end: Date }[] = [];
    const end = new Date(endDate);

    for (let i = count - 1; i >= 0; i--) {
      let start: Date;
      let periodEnd: Date;

      switch (periodType) {
        case 'day':
          start = new Date(end);
          start.setDate(end.getDate() - i);
          start.setHours(0, 0, 0, 0);
          periodEnd = new Date(start);
          periodEnd.setDate(start.getDate() + 1);
          break;
        case 'week':
          start = new Date(end);
          start.setDate(end.getDate() - i * 7);
          start.setHours(0, 0, 0, 0);
          const dow = start.getDay();
          start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
          periodEnd = new Date(start);
          periodEnd.setDate(start.getDate() + 7);
          break;
        case 'month':
          start = new Date(end.getFullYear(), end.getMonth() - i, 1);
          periodEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 1);
          break;
        case 'year':
          start = new Date(end.getFullYear() - i, 0, 1);
          periodEnd = new Date(end.getFullYear() - i + 1, 0, 1);
          break;
        default:
          start = new Date(end.getFullYear(), end.getMonth() - i, 1);
          periodEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 1);
      }

      periods.push({ start, end: periodEnd });
    }

    return periods;
  };

  const formatPeriodLabel = (start: Date, end: Date, periodType: Period): string => {
    switch (periodType) {
      case 'day':
        return start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      case 'week':
        const weekEnd = new Date(end);
        weekEnd.setDate(end.getDate() - 1);
        return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
      case 'month':
        return start.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
      case 'year':
        return start.getFullYear().toString();
    }
  };

  const getPeriodLabel = (p: Period): string => {
    switch (p) {
      case 'day': return 'Par jour';
      case 'week': return 'Par semaine';
      case 'month': return 'Par mois';
      case 'year': return 'Par année';
    }
  };

  const toggleCurve = (curve: keyof typeof visibleCurves) => {
    setVisibleCurves(prev => ({ ...prev, [curve]: !prev[curve] }));
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'top' as const } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  if (loading) {
    return (
      <div className="trends">
        <h2>📈 Évolution</h2>
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trends">
        <h2>📈 Évolution</h2>
        <div className="error-box">{error}</div>
      </div>
    );
  }

  const totalUsers = allUsers.length;
  const pct = (n: number) => totalUsers > 0 ? `${Math.round((n / totalUsers) * 100)}%` : '—';

  const hourLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);
  const dowLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="trends">
      <h2>📈 Évolution</h2>

      {/* Period selector — only affects the time series chart */}
      <div className="period-selector">
        {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
          <button
            key={p}
            className={`period-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {getPeriodLabel(p)}
          </button>
        ))}
      </div>

      {/* ── Time series chart ── */}
      {timeSeries && (
        <div className="charts-container">
          <div className="curve-filters">
            {([
              ['downloads', '#5ac8fa', '📱 Téléchargements'],
              ['accounts', '#ff9500', '👤 Comptes créés'],
              ['babies', '#C75B4A', '👶 Bébés créés'],
              ['babiesWith10Plus', '#34c759', '⭐ Bébés > 10 tâches'],
              ['tasks', '#5856d6', '📝 Tâches créées'],
            ] as [keyof typeof visibleCurves, string, string][]).map(([key, color, label]) => (
              <label key={key} className="curve-filter-item">
                <input type="checkbox" checked={visibleCurves[key]} onChange={() => toggleCurve(key)} />
                <span className="filter-label" style={{ color }}>{label}</span>
              </label>
            ))}
          </div>

          <div className="trend-chart-card single-chart">
            <h3>
              📊 Évolution globale
              <Info>
                <strong>Sources des données</strong>
                <ul>
                  <li><strong>Téléchargements :</strong> collection AppInstalls — enregistré à la première ouverture</li>
                  <li><strong>Comptes créés :</strong> user.creationDate dans la période</li>
                  <li><strong>Bébés créés :</strong> baby.CreatedDate / baby.createdDate dans la période</li>
                  <li><strong>Bébés &gt; 10 tâches :</strong> parmi les bébés créés dans la période, ceux qui ont déjà &gt; 10 tâches au total</li>
                  <li><strong>Tâches créées :</strong> nb de tâches dont task.date tombe dans la période — toutes tâches de tous les bébés</li>
                  <li>Le sélecteur de période n'affecte que ce graphique (les sections ci-dessous sont calculées sur toute la base)</li>
                </ul>
              </Info>
            </h3>
            <div className="chart-wrapper-large">
              <Line
                data={{
                  labels: timeSeries.labels,
                  datasets: [
                    ...(visibleCurves.downloads ? [{ label: '📱 Téléchargements', data: timeSeries.downloads, borderColor: '#5ac8fa', backgroundColor: 'rgba(90,200,250,0.1)', tension: 0.3, fill: false, borderWidth: 2 }] : []),
                    ...(visibleCurves.accounts ? [{ label: '👤 Comptes créés', data: timeSeries.accounts, borderColor: '#ff9500', backgroundColor: 'rgba(255,149,0,0.1)', tension: 0.3, fill: false, borderWidth: 2 }] : []),
                    ...(visibleCurves.babies ? [{ label: '👶 Bébés créés', data: timeSeries.babies, borderColor: '#C75B4A', backgroundColor: 'rgba(199,91,74,0.1)', tension: 0.3, fill: false, borderWidth: 2 }] : []),
                    ...(visibleCurves.babiesWith10Plus ? [{ label: '⭐ Bébés > 10 tâches', data: timeSeries.babiesWith10Plus, borderColor: '#34c759', backgroundColor: 'rgba(52,199,89,0.1)', tension: 0.3, fill: false, borderWidth: 2 }] : []),
                    ...(visibleCurves.tasks ? [{ label: '📝 Tâches créées', data: timeSeries.tasks, borderColor: '#5856d6', backgroundColor: 'rgba(88,86,214,0.1)', tension: 0.3, fill: false, borderWidth: 2 }] : []),
                  ],
                }}
                options={lineOptions}
              />
            </div>
            <div className="totals-summary">
              {([
                ['downloads', '#5ac8fa', '📱 Téléchargements'],
                ['accounts', '#ff9500', '👤 Comptes'],
                ['babies', '#C75B4A', '👶 Bébés'],
                ['babiesWith10Plus', '#34c759', '⭐ Bébés > 10'],
                ['tasks', '#5856d6', '📝 Tâches'],
              ] as [keyof TimeSeriesData, string, string][]).filter(([key]) => visibleCurves[key as keyof typeof visibleCurves]).map(([key, color, label]) => (
                <div key={key} className="total-item">
                  <span className="total-label" style={{ color }}>{label}</span>
                  <span className="total-value">{(timeSeries[key] as number[]).reduce((a, b) => a + b, 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Login frequency ── */}
      {loginFreq && (
        <div className="trend-chart-card" style={{ marginTop: 24 }}>
          <h3>
            🔐 Dernière connexion
            <Info>
              <strong>Source : user.lastLoginDate (string ISO)</strong>
              <ul>
                <li>Écrit par l'app à chaque ouverture de session authentifiée</li>
                <li><strong>Aujourd'hui :</strong> lastLoginDate il y a &lt; 24h</li>
                <li><strong>Cette semaine :</strong> il y a entre 1 et 7 jours</li>
                <li><strong>Ce mois :</strong> il y a entre 7 et 30 jours</li>
                <li><strong>&gt; 30 jours :</strong> inactif depuis plus d'un mois</li>
                <li><strong>Non renseigné :</strong> champ absent — anciens comptes créés avant que le champ soit implémenté</li>
                <li>Ex : 50% "aujourd'hui" = bonne rétention quotidienne</li>
              </ul>
            </Info>
          </h3>
          <p className="trends-subtitle">Répartition des {totalUsers} comptes selon leur dernière activité</p>
          <div className="login-freq-grid">
            {([
              ['Aujourd\'hui', loginFreq.today, '#22c55e'],
              ['Cette semaine', loginFreq.thisWeek, '#84cc16'],
              ['Ce mois', loginFreq.thisMonth, '#f59e0b'],
              ['> 30 jours', loginFreq.older, '#ef4444'],
              ['Non renseigné', loginFreq.noData, '#a0aec0'],
            ] as [string, number, string][]).map(([label, count, color]) => (
              <div key={label} className="login-freq-card" style={{ borderLeftColor: color }}>
                <div className="login-freq-value" style={{ color }}>{count}</div>
                <div className="login-freq-label">{label}</div>
                <div className="login-freq-pct">{pct(count)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Activity heatmap ── */}
      {heatmap && (
        <div className="trend-chart-card" style={{ marginTop: 24 }}>
          <h3>
            🕐 Activité des utilisateurs
            <Info>
              <strong>Quand les parents utilisent l'app</strong>
              <ul>
                <li>Source : task.date sur toutes les tâches de tous les bébés</li>
                <li><strong>Par heure :</strong> heure locale extraite de la date de la tâche (0h–23h)</li>
                <li><strong>Par jour :</strong> jour de la semaine de la tâche (Lun–Dim)</li>
                <li>Utile pour planifier les push notifications (ex : pic à 8h → envoyer les rappels le matin)</li>
                <li>Ex : pic le week-end → les deux parents sont disponibles et utilisent l'app ensemble</li>
              </ul>
            </Info>
          </h3>
          <p className="trends-subtitle">Heure et jour des tâches créées (toutes tâches confondues)</p>
          <div className="heatmap-grid">
            <div className="heatmap-chart">
              <h4>Par heure du jour</h4>
              <div style={{ height: 220 }}>
                <Bar
                  data={{
                    labels: hourLabels,
                    datasets: [{
                      label: 'Tâches',
                      data: heatmap.byHour,
                      backgroundColor: 'rgba(88,86,214,0.7)',
                      borderRadius: 3,
                    }],
                  }}
                  options={{ ...barOptions, scales: { ...barOptions.scales, x: { ticks: { font: { size: 10 } } } } }}
                />
              </div>
            </div>
            <div className="heatmap-chart">
              <h4>Par jour de la semaine</h4>
              <div style={{ height: 220 }}>
                <Bar
                  data={{
                    labels: dowLabels,
                    datasets: [{
                      label: 'Tâches',
                      data: heatmap.byDayOfWeek,
                      backgroundColor: 'rgba(199,91,74,0.7)',
                      borderRadius: 3,
                    }],
                  }}
                  options={barOptions}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Cohort retention ── */}
      {cohorts.length > 0 && (
        <div className="trend-chart-card" style={{ marginTop: 24 }}>
          <h3>
            🔁 Rétention par cohorte (semaine)
            <Info>
              <strong>Comment lire ce tableau</strong>
              <ul>
                <li>Chaque ligne = une cohorte d'utilisateurs inscrits la même semaine ISO (ex : 2025-W12 = semaine du 17 mars 2025)</li>
                <li><strong>Taille :</strong> nb d'utilisateurs inscrits cette semaine-là</li>
                <li><strong>S+1 :</strong> % de la cohorte ayant créé au moins une tâche la semaine suivante</li>
                <li><strong>S+2, S+4, S+8 :</strong> idem à 2, 4 et 8 semaines après l'inscription</li>
                <li>Lien : user → baby via baby.admin = userId → tâches via baby.tasks[]</li>
                <li>⚠️ Les cohortes récentes auront forcément 0% à S+8 si 8 semaines ne sont pas encore écoulées</li>
                <li>Ex : S+1 = 40% → 4 utilisateurs sur 10 reviennent la semaine suivante leur inscription</li>
              </ul>
            </Info>
          </h3>
          <p className="trends-subtitle">% d'utilisateurs ayant créé une tâche dans les semaines suivant leur inscription</p>
          <div className="cohort-table-wrap">
            <table className="cohort-table">
              <thead>
                <tr>
                  <th>Cohorte</th>
                  <th>Taille</th>
                  <th>S+1</th>
                  <th>S+2</th>
                  <th>S+4</th>
                  <th>S+8</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map(row => (
                  <tr key={row.label}>
                    <td className="cohort-label">{row.label}</td>
                    <td className="cohort-size">{row.size}</td>
                    {[row.w1, row.w2, row.w4, row.w8].map((pctVal, i) => (
                      <td
                        key={i}
                        className="cohort-cell"
                        style={{ backgroundColor: retentionColor(pctVal), color: pctVal >= 20 ? 'white' : '#4a5568' }}
                      >
                        {pctVal > 0 ? `${pctVal}%` : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="cohort-legend">
            {([['≥ 60%', '#22c55e'], ['≥ 40%', '#84cc16'], ['≥ 20%', '#f59e0b'], ['< 20%', '#ef4444']] as [string, string][]).map(([label, color]) => (
              <span key={label} className="cohort-legend-item">
                <span className="cohort-legend-dot" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
