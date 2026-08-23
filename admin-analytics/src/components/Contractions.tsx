import React, { useState, useEffect, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import {
  type User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { query, where, orderBy, getDocsFromServer, Timestamp } from 'firebase/firestore';
import {
  contractionsAuth,
  contractionsUsersRef,
  allContractionsRef,
} from '../config/contractionsFirebase';
import { isAdminEmail } from '../config/adminEmails';
import { DateRangeSelector } from './DateRangeSelector';
import type { DateRange, PresetRange } from '../types';
import './Contractions.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const PRIMARY = '#C75B4A';
const PALETTE = ['#C75B4A', '#E8897A', '#A04438', '#FDBF8E', '#8E5B4A', '#D9A79A'];

interface CUser {
  uid: string;
  email: string;
  username: string;
  createdAt: Date | null;
  country: string;
  language: string;
  platform: string;
  dueDate?: string;
  contactConsent?: boolean;
}

interface CContraction {
  uid: string;
  startTime: Date;
  duration: number;
  intensity?: number;
}

interface Stats {
  totalContractions: number;
  avgDuration: number;
  avgIntensity: number;
  contractionsByDay: Map<string, number>;
  signupsByDay: Map<string, number>;
  byPlatform: Map<string, number>;
  byLanguage: Map<string, number>;
  byCountry: Map<string, number>;
  contractionCountByUid: Map<string, number>;
}

const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v === 'object' && 'toDate' in v) return v.toDate();
  const p = new Date(v);
  return isNaN(p.getTime()) ? null : p;
};

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatDuration = (s: number) =>
  s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m${String(Math.round(s % 60)).padStart(2, '0')}`;

const formatDate = (d: Date | null) =>
  d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const inRange = (d: Date | null, range: DateRange) => {
  if (!d) return false;
  if (range.start && d < range.start) return false;
  if (range.end && d > range.end) return false;
  return true;
};

const computeStats = (users: CUser[], contractions: CContraction[], range: DateRange): Stats => {
  const contractionsByDay = new Map<string, number>();
  const contractionCountByUid = new Map<string, number>();
  let totalDuration = 0;
  let intensitySum = 0;
  let intensityCount = 0;
  contractions.forEach((c) => {
    const key = dayKey(c.startTime);
    contractionsByDay.set(key, (contractionsByDay.get(key) ?? 0) + 1);
    contractionCountByUid.set(c.uid, (contractionCountByUid.get(c.uid) ?? 0) + 1);
    totalDuration += c.duration;
    if (c.intensity != null) {
      intensitySum += c.intensity;
      intensityCount++;
    }
  });

  const signupsByDay = new Map<string, number>();
  users.forEach((u) => {
    if (inRange(u.createdAt, range)) {
      const key = dayKey(u.createdAt!);
      signupsByDay.set(key, (signupsByDay.get(key) ?? 0) + 1);
    }
  });

  const count = (field: (u: CUser) => string) => {
    const m = new Map<string, number>();
    users.forEach((u) => {
      const v = field(u) || 'inconnu';
      m.set(v, (m.get(v) ?? 0) + 1);
    });
    return new Map([...m.entries()].sort((a, b) => b[1] - a[1]));
  };

  return {
    totalContractions: contractions.length,
    avgDuration: contractions.length ? totalDuration / contractions.length : 0,
    avgIntensity: intensityCount ? Math.round((intensitySum / intensityCount) * 10) / 10 : 0,
    contractionsByDay,
    signupsByDay,
    byPlatform: count((u) => u.platform),
    byLanguage: count((u) => u.language),
    byCountry: count((u) => u.country),
    contractionCountByUid,
  };
};

const sortedDays = (m: Map<string, number>) => [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));

const barData = (m: Map<string, number>, label: string) => {
  const entries = sortedDays(m);
  return {
    labels: entries.map(([d]) => d.slice(5)),
    datasets: [{ label, data: entries.map(([, v]) => v), backgroundColor: PRIMARY, borderRadius: 4 }],
  };
};

const doughnutData = (m: Map<string, number>) => {
  const entries = [...m.entries()].slice(0, 6);
  return {
    labels: entries.map(([k]) => k),
    datasets: [{ data: entries.map(([, v]) => v), backgroundColor: PALETTE, borderWidth: 0 }],
  };
};

const ContractionsLogin: React.FC<{ onError: (msg: string) => void; error: string | null }> = ({
  onError,
  error,
}) => {
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await signInWithPopup(contractionsAuth, new GoogleAuthProvider());
      if (!isAdminEmail(result.user.email ?? '')) {
        await signOut(contractionsAuth);
        throw new Error('Accès non autorisé. Seuls les administrateurs peuvent se connecter.');
      }
    } catch (err: any) {
      onError(err?.message ?? 'Erreur de connexion');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ctr-login">
      <h2>⏱️ Suivi Contractions</h2>
      <p className="ctr-login-hint">
        Session Suivi Contractions absente — reconnecte-la avec ton compte Google admin (une seule
        fois, elle sera conservée ; les prochaines connexions Google au dashboard ouvriront les deux
        projets automatiquement).
      </p>
      <button className="ctr-google-btn" onClick={handleGoogle} disabled={busy}>
        Se connecter avec Google
      </button>
      {error && <p className="ctr-error">{error}</p>}
    </div>
  );
};

interface UserListModalProps {
  title: string;
  users: CUser[];
  contractionCountByUid: Map<string, number>;
  onClose: () => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ title, users, contractionCountByUid, onClose }) => (
  <div className="ctr-modal-overlay" onClick={onClose}>
    <div className="ctr-modal" onClick={(e) => e.stopPropagation()}>
      <div className="ctr-modal-header">
        <h3>
          {title} <span className="ctr-modal-count">{users.length}</span>
        </h3>
        <button className="ctr-modal-close" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="ctr-modal-body">
        {users.length === 0 ? (
          <p className="ctr-empty">Aucune utilisatrice</p>
        ) : (
          <table className="ctr-table">
            <thead>
              <tr>
                <th>Prénom</th>
                <th>Email</th>
                <th>Créé le</th>
                <th>Terme</th>
                <th>Pays</th>
                <th>Langue</th>
                <th>Plateforme</th>
                <th>Contact OK</th>
                <th>Contractions (période)</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.username || '—'}</td>
                  <td>{u.email || '—'}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>{u.dueDate || '—'}</td>
                  <td>{u.country || '—'}</td>
                  <td>{u.language || '—'}</td>
                  <td>{u.platform || '—'}</td>
                  <td>
                    {u.contactConsent === true ? (
                      <span className="ctr-consent ctr-consent-yes">✓ Oui</span>
                    ) : u.contactConsent === false ? (
                      <span className="ctr-consent ctr-consent-no">✗ Non</span>
                    ) : (
                      <span className="ctr-consent ctr-consent-unknown">Non demandé</span>
                    )}
                  </td>
                  <td className="ctr-table-num">{contractionCountByUid.get(u.uid) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>
);

type UserListKind = 'total' | 'new' | 'active' | 'dueDate' | null;

export const Contractions: React.FC = () => {
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [users, setUsers] = useState<CUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openList, setOpenList] = useState<UserListKind>(null);

  const [preset, setPreset] = useState<PresetRange>('30days');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start, end };
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(contractionsAuth, (user) => {
      if (user && !isAdminEmail(user.email ?? '')) {
        signOut(contractionsAuth);
        setAuthUser(null);
      } else {
        setAuthUser(user);
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  const loadData = useCallback(async () => {
    if (!authUser) return;
    setLoading(true);
    setLoadError(null);
    try {
      const usersSnap = await getDocsFromServer(contractionsUsersRef);
      const loadedUsers: CUser[] = usersSnap.docs.map((d) => {
        const raw = d.data();
        return {
          uid: d.id,
          email: raw.email ?? '',
          username: raw.username ?? '',
          createdAt: toDate(raw.createdAt),
          country: raw.country ?? '',
          language: raw.language ?? '',
          platform: raw.platform ?? '',
          dueDate: raw.dueDate,
          contactConsent: raw.contactConsent,
        };
      });

      const clauses = [];
      if (dateRange.start) clauses.push(where('startTime', '>=', Timestamp.fromDate(dateRange.start)));
      if (dateRange.end) clauses.push(where('startTime', '<=', Timestamp.fromDate(dateRange.end)));
      const q = query(allContractionsRef, ...clauses, orderBy('startTime', 'asc'));
      const ctrSnap = await getDocsFromServer(q);
      const contractions: CContraction[] = ctrSnap.docs.map((d) => {
        const raw = d.data();
        return {
          uid: d.ref.parent.parent?.id ?? '',
          startTime: toDate(raw.startTime) ?? new Date(0),
          duration: raw.duration ?? 0,
          intensity: raw.intensity,
        };
      });

      setUsers(loadedUsers);
      setStats(computeStats(loadedUsers, contractions, dateRange));
    } catch (err: any) {
      console.error('Contractions load error:', err);
      setLoadError(err?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [authUser, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!authReady) return <div className="ctr-loading">Chargement…</div>;

  if (!authUser) {
    return <ContractionsLogin onError={setAuthError} error={authError} />;
  }

  const newUsers = users.filter((u) => inRange(u.createdAt, dateRange));
  const activeUsers = stats ? users.filter((u) => stats.contractionCountByUid.has(u.uid)) : [];
  const dueDateUsers = users.filter((u) => !!u.dueDate);

  const listConfig: Record<Exclude<UserListKind, null>, { title: string; users: CUser[] }> = {
    total: { title: 'Tous les comptes', users },
    new: { title: 'Nouveaux comptes (période)', users: newUsers },
    active: { title: 'Utilisatrices actives (période)', users: activeUsers },
    dueDate: { title: 'Comptes avec date de terme', users: dueDateUsers },
  };

  return (
    <div className="contractions">
      <div className="ctr-header">
        <h2>⏱️ Suivi Contractions</h2>
        <span className="ctr-project-badge">{authUser.email}</span>
        <button className="ctr-refresh-btn" onClick={loadData} disabled={loading}>
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
        <button className="ctr-signout-btn" onClick={() => signOut(contractionsAuth)}>
          Déconnexion
        </button>
      </div>

      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      {loadError && <p className="ctr-error">{loadError}</p>}

      {stats && (
        <>
          <div className="ctr-kpis">
            <button className="ctr-kpi ctr-kpi-clickable" onClick={() => setOpenList('total')}>
              <span className="ctr-kpi-value">{users.length}</span>
              <span className="ctr-kpi-label">Comptes total</span>
            </button>
            <button className="ctr-kpi ctr-kpi-clickable" onClick={() => setOpenList('new')}>
              <span className="ctr-kpi-value">{newUsers.length}</span>
              <span className="ctr-kpi-label">Nouveaux comptes (période)</span>
            </button>
            <button className="ctr-kpi ctr-kpi-clickable" onClick={() => setOpenList('active')}>
              <span className="ctr-kpi-value">{activeUsers.length}</span>
              <span className="ctr-kpi-label">Utilisatrices actives (période)</span>
            </button>
            <button className="ctr-kpi ctr-kpi-clickable" onClick={() => setOpenList('dueDate')}>
              <span className="ctr-kpi-value">{dueDateUsers.length}</span>
              <span className="ctr-kpi-label">Avec date de terme</span>
            </button>
            <div className="ctr-kpi">
              <span className="ctr-kpi-value">{stats.totalContractions}</span>
              <span className="ctr-kpi-label">Contractions (période)</span>
            </div>
            <div className="ctr-kpi">
              <span className="ctr-kpi-value">{formatDuration(stats.avgDuration)}</span>
              <span className="ctr-kpi-label">Durée moyenne</span>
            </div>
            <div className="ctr-kpi">
              <span className="ctr-kpi-value">{stats.avgIntensity > 0 ? `${stats.avgIntensity}/5` : '—'}</span>
              <span className="ctr-kpi-label">Intensité moyenne</span>
            </div>
          </div>

          <div className="ctr-charts">
            <div className="ctr-chart ctr-chart-wide">
              <h3>Contractions par jour</h3>
              {stats.contractionsByDay.size > 0 ? (
                <Bar
                  data={barData(stats.contractionsByDay, 'Contractions')}
                  options={{ responsive: true, plugins: { legend: { display: false } } }}
                />
              ) : (
                <p className="ctr-empty">Aucune contraction sur la période</p>
              )}
            </div>
            <div className="ctr-chart ctr-chart-wide">
              <h3>Nouveaux comptes par jour</h3>
              {stats.signupsByDay.size > 0 ? (
                <Bar
                  data={barData(stats.signupsByDay, 'Comptes')}
                  options={{ responsive: true, plugins: { legend: { display: false } } }}
                />
              ) : (
                <p className="ctr-empty">Aucune inscription sur la période</p>
              )}
            </div>
            <div className="ctr-chart">
              <h3>Plateforme</h3>
              <Doughnut data={doughnutData(stats.byPlatform)} />
            </div>
            <div className="ctr-chart">
              <h3>Langue</h3>
              <Doughnut data={doughnutData(stats.byLanguage)} />
            </div>
            <div className="ctr-chart">
              <h3>Pays</h3>
              <Doughnut data={doughnutData(stats.byCountry)} />
            </div>
          </div>

          {openList && (
            <UserListModal
              title={listConfig[openList].title}
              users={listConfig[openList].users}
              contractionCountByUid={stats.contractionCountByUid}
              onClose={() => setOpenList(null)}
            />
          )}
        </>
      )}
    </div>
  );
};
