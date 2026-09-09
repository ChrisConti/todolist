import React, { useState, useEffect } from 'react';
import type { DateRange, PresetRange, AnalyticsMetrics, User, Baby } from '../types';
import { parseBabyDate } from '../types';
import { DateRangeSelector } from './DateRangeSelector';
import { getAnalyticsMetrics, getAllUsers, getAllBabies, isRealPremiumPurchase, getPremiumPurchaseDate } from '../services/analyticsService';
import { ListModal } from './ListModal';
import { Charts } from './Charts';
import { BabyDetailsModal } from './BabyDetailsModal';
import { UserDetailsModal } from './UserDetailsModal';
import { TaskDistribution } from './TaskDistribution';
import { TaskDistributionByAge } from './TaskDistributionByAge';
import './Analytics.css';

type ModalType = 'accounts' | 'babies' | 'accountsWithoutBaby' | 'deletedAccounts' | 'babies1Task' | 'babies5Tasks' | 'babies30Tasks' | 'babies100Tasks' | 'babiesMultipleParents' | 'babiesActiveRecently' | 'emailOptIn' | 'providerGoogle' | 'providerApple' | 'providerEmail' | 'premiumTotal' | 'premiumToday' | 'premiumYesterday' | 'premium7Days' | 'premium30Days' | null;

type DelayType = 'accountToBaby' | 'babyToFirst' | 'accountToFirst';
interface DelayEntry { delay: number; baby: Baby; user?: User; }
interface DelayDetail { type: DelayType; title: string; min: DelayEntry[]; mid: DelayEntry[]; max: DelayEntry[]; }

// Reusable info tooltip
const Info: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="info-tooltip" style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 5 }}>
    <span className="info-icon" style={{ fontSize: 13 }}>ℹ️</span>
    <div className="tooltip-content">{children}</div>
  </span>
);

export const Analytics: React.FC = () => {
  const [preset, setPreset] = useState<PresetRange>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<User[] | Baby[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allBabies, setAllBabies] = useState<Baby[]>([]);
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [isBabyModalOpen, setIsBabyModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [delayDetail, setDelayDetail] = useState<DelayDetail | null>(null);

  useEffect(() => { loadMetrics(); }, [dateRange, searchTerm]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, users, babies] = await Promise.all([
        getAnalyticsMetrics(dateRange, searchTerm),
        getAllUsers(),
        getAllBabies(searchTerm),
      ]);
      setMetrics(data);
      setAllUsers(users);
      setAllBabies(babies);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des métriques');
    } finally {
      setLoading(false);
    }
  };

  const handleBabyClick = (baby: Baby) => { setSelectedBaby(baby); setIsBabyModalOpen(true); };
  const handleUserClick = (user: User) => {
    const baby = allBabies.find(b => b.user?.includes(user.userId));
    setSelectedUser({ ...user, linkedBaby: baby ?? undefined });
    setIsUserModalOpen(true);
  };
  const handleParentClick = (userId: string) => {
    const user = allUsers.find(u => u.userId === userId);
    if (user) handleUserClick(user);
  };

  const handleDelayCardClick = (type: DelayType) => {
    const userMap = new Map<string, User>();
    const userCreationMap = new Map<string, Date>();
    allUsers.forEach(u => {
      userMap.set(u.userId, u);
      if (!u.creationDate) return;
      const d = typeof u.creationDate === 'object' && 'toDate' in u.creationDate
        ? (u.creationDate as any).toDate() : new Date(u.creationDate);
      if (!isNaN(d.getTime())) userCreationMap.set(u.userId, d);
    });

    const entries: DelayEntry[] = [];
    allBabies.forEach(baby => {
      if (!baby.tasks?.length) return;
      const sorted = [...baby.tasks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const firstTaskDate = new Date(sorted[0].date);
      if (isNaN(firstTaskDate.getTime())) return;
      const babyCreatedAt = parseBabyDate(baby);
      const adminCreatedAt = baby.admin ? userCreationMap.get(baby.admin) : undefined;
      let delay: number | null = null;
      if (type === 'accountToBaby' && adminCreatedAt && babyCreatedAt)
        delay = Math.max(0, Math.floor((babyCreatedAt.getTime() - adminCreatedAt.getTime()) / 86400000));
      else if (type === 'babyToFirst' && babyCreatedAt)
        delay = Math.max(0, Math.floor((firstTaskDate.getTime() - babyCreatedAt.getTime()) / 86400000));
      else if (type === 'accountToFirst' && adminCreatedAt)
        delay = Math.max(0, Math.floor((firstTaskDate.getTime() - adminCreatedAt.getTime()) / 86400000));
      if (delay !== null) entries.push({ delay, baby, user: baby.admin ? userMap.get(baby.admin) : undefined });
    });
    entries.sort((a, b) => a.delay - b.delay);

    const pick3 = (pos: 'start' | 'mid' | 'end'): DelayEntry[] => {
      if (entries.length === 0) return [];
      if (pos === 'start') return entries.slice(0, 3);
      if (pos === 'end') return [...entries.slice(-3)].reverse();
      const mid = Math.floor(entries.length / 2);
      return entries.slice(Math.max(0, mid - 1), mid + 2);
    };

    const titles: Record<DelayType, string> = {
      accountToBaby: 'Compte → création bébé',
      babyToFirst: 'Bébé créé → 1ère tâche',
      accountToFirst: 'Compte → 1ère tâche',
    };
    setDelayDetail({ type, title: titles[type], min: pick3('start'), mid: pick3('mid'), max: pick3('end') });
  };

  const handleBabyDeleted = async () => { setModalType(null); setModalData([]); await loadMetrics(); };

  const renderTrend = (current: number, previous?: number) => {
    if (!previous || !metrics?.previousPeriod) return null;
    const diff = current - previous;
    if (diff === 0) return null;
    const color = diff > 0 ? '#10b981' : '#ef4444';
    return <div className="metric-trend" style={{ color, fontSize: '13px', fontWeight: 500 }}>{diff > 0 ? '⬆️' : '⬇️'} {diff > 0 ? '+' : ''}{diff}</div>;
  };

  const handleCardClick = async (type: ModalType) => {
    if (!type) return;
    try {
      const allUsers = await getAllUsers();
      const allBabies = await getAllBabies(searchTerm);
      const userEmailMap = new Map<string, string>();
      allUsers.forEach(u => userEmailMap.set(u.userId, u.email));

      let users = allUsers;
      let babies = allBabies;

      if (dateRange.start && dateRange.end) {
        users = allUsers.filter(u => {
          if (!u.creationDate) return false;
          const userDate = typeof u.creationDate === 'object' && 'toDate' in u.creationDate
            ? (u.creationDate as any).toDate() : new Date(u.creationDate);
          return userDate >= dateRange.start! && userDate <= dateRange.end!;
        });
        babies = allBabies.filter(b => {
          const d = parseBabyDate(b);
          return d && d >= dateRange.start! && d <= dateRange.end!;
        });
      }

      const sortUsers = (list: User[]) => list.sort((a, b) => {
        const da = a.creationDate ? (typeof a.creationDate === 'string' ? new Date(a.creationDate) : (a.creationDate as any).toDate()) : new Date(0);
        const db = b.creationDate ? (typeof b.creationDate === 'string' ? new Date(b.creationDate) : (b.creationDate as any).toDate()) : new Date(0);
        return db.getTime() - da.getTime();
      });
      const sortBabies = (list: Baby[]) => list.sort((a, b) => ((parseBabyDate(b) ?? new Date(0)).getTime()) - ((parseBabyDate(a) ?? new Date(0)).getTime()));
      const enrichBabies = (list: Baby[]) => list.map(baby => ({
        ...baby,
        parentEmails: baby.user?.map(uid => userEmailMap.get(uid) || 'N/A').filter(Boolean) || [],
        linkedUsers: baby.user?.map(uid => users.find(u => u.userId === uid)).filter(Boolean) as User[] || [],
      }));

      const babiesInPeriodAdminIds = new Set(babies.map(b => b.admin).filter(Boolean));

      switch (type) {
        case 'accounts': {
          const allUserEmailMap = new Map<string, string>();
          allUsers.forEach(u => allUserEmailMap.set(u.userId, u.email));
          const enrichedUsers = sortUsers([...users]).map(u => {
            const baby = allBabies.find(b => b.user?.includes(u.userId));
            const babyStatus: User['babyStatus'] = !baby
              ? 'none'
              : babiesInPeriodAdminIds.has(u.userId)
                ? 'created'
                : 'joined';
            const enrichedBaby = baby ? {
              ...baby,
              parentEmails: baby.user?.map(uid => allUserEmailMap.get(uid) || 'N/A').filter(Boolean) || [],
              linkedUsers: baby.user?.map(uid => allUsers.find(u2 => u2.userId === uid)).filter(Boolean) as User[] || [],
            } : undefined;
            return { ...u, linkedBaby: enrichedBaby, babyStatus };
          });
          setModalData(enrichedUsers);
          break;
        }
        case 'babies': setModalData(enrichBabies(sortBabies([...babies]))); break;
        case 'accountsWithoutBaby': {
          const ids = new Set<string>();
          allBabies.forEach(b => b.user?.forEach(uid => ids.add(uid)));
          setModalData(sortUsers(users.filter(u => !ids.has(u.userId))));
          break;
        }
        case 'deletedAccounts': setModalData(sortUsers(users.filter(u => u.deleted))); break;
        case 'babies1Task': setModalData(enrichBabies(sortBabies(babies.filter(b => (b.tasks?.length || 0) >= 1)))); break;
        case 'babies5Tasks': setModalData(enrichBabies(sortBabies(babies.filter(b => (b.tasks?.length || 0) > 5)))); break;
        case 'babies30Tasks': setModalData(enrichBabies(sortBabies(babies.filter(b => (b.tasks?.length || 0) > 30)))); break;
        case 'babies100Tasks': setModalData(enrichBabies(sortBabies(babies.filter(b => (b.tasks?.length || 0) > 100)))); break;
        case 'babiesMultipleParents': setModalData(enrichBabies(sortBabies(babies.filter(b => (b.user?.length || 0) > 1)))); break;
        case 'babiesActiveRecently': {
          const ago = new Date(); ago.setDate(ago.getDate() - 7);
          setModalData(enrichBabies(sortBabies(babies.filter(b => b.tasks?.some(t => { const d = new Date(t.date); return !isNaN(d.getTime()) && d >= ago; })))));
          break;
        }
        case 'emailOptIn': setModalData(sortUsers(users.filter(u => u.emailOptIn).map(u => ({ ...u, linkedBaby: allBabies.find(b => b.user?.includes(u.userId)) })))); break;
        case 'providerGoogle': setModalData(sortUsers(users.filter(u => u.provider === 'google'))); break;
        case 'providerApple': setModalData(sortUsers(users.filter(u => u.provider === 'apple'))); break;
        case 'providerEmail': setModalData(sortUsers(users.filter(u => !u.provider || u.provider === 'email'))); break;
        case 'premiumTotal':
        case 'premiumToday':
        case 'premiumYesterday':
        case 'premium7Days':
        case 'premium30Days': {
          // Premium lists are always global (not date-range filtered), same rule as the cards.
          // Les périodes sont datées par premiumDate (date d'achat), comme les cartes.
          const nowP = new Date();
          const todayStart = new Date(nowP.getFullYear(), nowP.getMonth(), nowP.getDate());
          const yesterdayStart = new Date(todayStart.getTime() - 86400000);
          const sevenDaysStart = new Date(todayStart.getTime() - 6 * 86400000);
          const thirtyDaysStart = new Date(todayStart.getTime() - 29 * 86400000);
          const inPeriod = (u: User): boolean => {
            if (type === 'premiumTotal') return true;
            const d = getPremiumPurchaseDate(u);
            if (!d) return false;
            if (type === 'premiumToday') return d >= todayStart;
            if (type === 'premiumYesterday') return d >= yesterdayStart && d < todayStart;
            if (type === 'premium30Days') return d >= thirtyDaysStart;
            return d >= sevenDaysStart;
          };
          // Tri par date d'achat décroissante (les achats sans date passent en fin de liste)
          const byPurchaseDate = (list: User[]) => list.sort((a, b) =>
            ((getPremiumPurchaseDate(b)?.getTime()) ?? 0) - ((getPremiumPurchaseDate(a)?.getTime()) ?? 0)
          );
          setModalData(byPurchaseDate(allUsers.filter(u => isRealPremiumPurchase(u) && inPeriod(u))).map(u => ({ ...u, linkedBaby: allBabies.find(b => b.user?.includes(u.userId)) })));
          break;
        }
      }
      setModalType(type);
    } catch (err) { console.error(err); }
  };

  const getModalTitle = (): string => {
    const titles: Record<string, string> = {
      accounts: 'Comptes créés', babies: 'Bébés créés', accountsWithoutBaby: 'Comptes sans bébé',
      deletedAccounts: 'Comptes supprimés', babies1Task: 'Bébés avec ≥ 1 tâche', babies5Tasks: 'Bébés avec > 5 tâches',
      babies30Tasks: 'Bébés avec > 30 tâches', babies100Tasks: 'Bébés avec > 100 tâches',
      babiesMultipleParents: 'Bébés partagés (> 1 parent)', babiesActiveRecently: 'Bébés actifs (7 derniers jours)',
      emailOptIn: 'Comptes opt-in email', providerGoogle: 'Comptes Google', providerApple: 'Comptes Apple', providerEmail: 'Comptes Email/Mot de passe',
      premiumTotal: 'Premium payants (toute la base)', premiumToday: 'Achats premium aujourd\'hui',
      premiumYesterday: 'Achats premium hier', premium7Days: 'Achats premium sur 7 jours',
      premium30Days: 'Achats premium sur 30 jours',
    };
    return titles[modalType as string] || '';
  };

  if (loading && !metrics) {
    return (
      <div className="analytics">
        <h2>Vue d'ensemble</h2>
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} preset={preset} onPresetChange={setPreset} />
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="analytics">
        <h2>Vue d'ensemble</h2>
        <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} preset={preset} onPresetChange={setPreset} />
        <div className="error-box">{error}</div>
      </div>
    );
  }

  return (
    <div className="analytics">
      <div className="header-with-info">
        <h2>Vue d'ensemble</h2>
        <button className="refresh-btn" onClick={loadMetrics} disabled={loading}>🔄 Actualiser</button>
        <div className="info-tooltip">
          <span className="info-icon">ℹ️</span>
          <div className="tooltip-content">
            <strong>Règles de filtrage</strong>
            <ul>
              <li><strong>Toute la base :</strong> aucun filtre, toutes les données</li>
              <li><strong>Filtre date :</strong> filtre les comptes ET les bébés créés dans la période — les métriques d'engagement sont calculées sur ces bébés seulement</li>
              <li><strong>Comptes de test exclus :</strong> android@android.com et test@apple.com sont retirés de toutes les stats</li>
            </ul>
          </div>
        </div>
      </div>

      <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} preset={preset} onPresetChange={setPreset} />

      <div className="search-container">
        <input
          type="text"
          className="baby-search-input"
          placeholder="🔍 Rechercher un bébé par nom..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && <button className="clear-search-btn" onClick={() => setSearchTerm('')}>✕</button>}
      </div>

      {loading && <div className="loading-overlay">Actualisation...</div>}

      {/* ── Métriques principales ── */}
      <div className="metrics-grid">

        <div className="metric-card">
          <div className="metric-icon">📱</div>
          <div className="metric-content">
            <div className="metric-label">
              Téléchargements
              <Info>
                <strong>Source : collection AppInstalls (Firebase)</strong>
                <ul>
                  <li>Enregistré à la première ouverture de l'app</li>
                  <li>iOS : platform = 'ios' · Android : platform = 'android'</li>
                  <li>Ex : si 100 installs et 80 comptes → taux de conversion 80%</li>
                </ul>
              </Info>
            </div>
            <div className="metric-value">{(metrics?.iosDownloads || 0) + (metrics?.androidDownloads || 0)}</div>
            <div className="metric-breakdown">
              <span>iOS: {metrics?.iosDownloads || 0}</span>
              <span>Android: {metrics?.androidDownloads || 0}</span>
            </div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('accounts')}>
          <div className="metric-icon">👤</div>
          <div className="metric-content">
            <div className="metric-label">
              Comptes créés
              <Info>
                <strong>Source : collection Users</strong>
                <ul>
                  <li>Créé automatiquement à la première connexion</li>
                  <li>Champs : userId, email, username, creationDate, provider</li>
                  <li>Comptes de test exclus (android@android.com, test@apple.com)</li>
                  <li>Ex : un utilisateur qui se connecte via Google → 1 compte créé</li>
                </ul>
              </Info>
            </div>
            <div className="metric-value">{metrics?.totalAccounts || 0}</div>
            {renderTrend(metrics?.totalAccounts || 0, metrics?.previousPeriod?.totalAccounts)}
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('babies')}>
          <div className="metric-icon">👶</div>
          <div className="metric-content">
            <div className="metric-label">
              Bébés créés
              <Info>
                <strong>Source : collection Baby</strong>
                <ul>
                  <li>Créé quand un utilisateur enregistre un profil bébé</li>
                  <li>1 utilisateur = 1 seul bébé max (pas de multi-bébé)</li>
                  <li>baby.admin = userId du créateur</li>
                  <li>Ex : une famille peut avoir 1 bébé partagé entre 2 parents</li>
                </ul>
              </Info>
            </div>
            <div className="metric-value">{metrics?.totalBabies || 0}</div>
            {renderTrend(metrics?.totalBabies || 0, metrics?.previousPeriod?.totalBabies)}
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable warning" onClick={() => handleCardClick('accountsWithoutBaby')}>
          <div className="metric-icon">⚠️</div>
          <div className="metric-content">
            <div className="metric-label">
              Comptes sans bébé
              <Info>
                <strong>Utilisateur sans bébé associé</strong>
                <ul>
                  <li>Règle : userId absent de tout Baby.user[]</li>
                  <li>Inclut : comptes créés mais pas encore utilisés, invitations non finalisées</li>
                  <li>N'inclut PAS les comptes supprimés (déjà comptés séparément)</li>
                  <li>Ex : quelqu'un crée un compte puis abandonne avant de créer le bébé</li>
                </ul>
              </Info>
            </div>
            <div className="metric-value">{metrics?.accountsWithoutBaby || 0}</div>
            <div className="metric-breakdown"><span>{metrics?.totalAccounts ? Math.round((metrics.accountsWithoutBaby || 0) / metrics.totalAccounts * 100) : 0}% des comptes</span></div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        {dateRange.start && dateRange.end && (metrics?.joinedExistingBaby || 0) > 0 && (
          <div className="metric-card">
            <div className="metric-icon">🔗</div>
            <div className="metric-content">
              <div className="metric-label">
                A rejoint un bébé
                <Info>
                  <strong>Compte créé dans la période, sans avoir créé de bébé</strong>
                  <ul>
                    <li>N'est pas admin d'un bébé créé dans la période</li>
                    <li>Inclut : co-parents d'un nouveau bébé + users qui ont rejoint un bébé plus ancien</li>
                    <li>Complète l'équation : Comptes = Créateurs + A rejoint + Sans bébé</li>
                  </ul>
                </Info>
              </div>
              <div className="metric-value">{metrics?.joinedExistingBaby || 0}</div>
              <div className="metric-breakdown"><span>{metrics?.totalAccounts ? Math.round((metrics.joinedExistingBaby || 0) / metrics.totalAccounts * 100) : 0}% des comptes</span></div>
            </div>
          </div>
        )}

        <div className="metric-card clickable" onClick={() => handleCardClick('deletedAccounts')}>
          <div className="metric-icon">🗑️</div>
          <div className="metric-content">
            <div className="metric-label">
              Comptes supprimés
              <Info>
                <strong>Suppression soft (données conservées)</strong>
                <ul>
                  <li>Règle : user.deleted === true</li>
                  <li>Déclenché par le bouton "Supprimer mon compte" dans l'app</li>
                  <li>Les données (bébé, tâches) sont conservées en base</li>
                  <li>Ex : un utilisateur supprime son compte → deleted = true, deletedAt = date</li>
                </ul>
              </Info>
            </div>
            <div className="metric-value">{metrics?.deletedAccounts || 0}</div>
            <div className="metric-breakdown"><span>{metrics?.totalAccounts ? Math.round((metrics.deletedAccounts || 0) / metrics.totalAccounts * 100) : 0}% des comptes</span></div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('emailOptIn')}>
          <div className="metric-icon">📧</div>
          <div className="metric-content">
            <div className="metric-label">
              Opt-in email
              <Info>
                <strong>Acceptation des communications email</strong>
                <ul>
                  <li>Règle : user.emailOptIn === true</li>
                  <li>Coché lors de l'inscription ou dans les paramètres de l'app</li>
                  <li>Ces utilisateurs peuvent recevoir newsletters / notifications</li>
                  <li>Ex : 30% d'opt-in est un taux typique pour une app mobile</li>
                </ul>
              </Info>
            </div>
            <div className="metric-value">{metrics?.emailOptInCount || 0}</div>
            <div className="metric-breakdown"><span>{metrics?.totalAccounts ? Math.round(((metrics.emailOptInCount || 0) / metrics.totalAccounts) * 100) : 0}% des comptes</span></div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🔑</div>
          <div className="metric-content">
            <div className="metric-label">
              Providers de connexion
              <Info>
                <strong>Méthode d'authentification utilisée</strong>
                <ul>
                  <li><strong>Google :</strong> OAuth Google (user.provider = 'google')</li>
                  <li><strong>Apple :</strong> Sign in with Apple (user.provider = 'apple')</li>
                  <li><strong>Email :</strong> email + mot de passe (provider null ou 'email')</li>
                  <li>Ex : si 70% Google → la majorité préfère la connexion rapide sans mot de passe</li>
                </ul>
              </Info>
            </div>
            <div className="metric-breakdown" style={{ marginTop: '8px', gap: '6px', display: 'flex', flexDirection: 'column' }}>
              <span className="provider-badge clickable-badge" onClick={() => handleCardClick('providerGoogle')} title="Voir la liste">
                🔵 Google: <strong>{metrics?.providerGoogleCount || 0}</strong> <span style={{ color: '#a0aec0', fontWeight: 400 }}>({metrics?.totalAccounts ? Math.round((metrics.providerGoogleCount || 0) / metrics.totalAccounts * 100) : 0}%)</span>
              </span>
              <span className="provider-badge clickable-badge" onClick={() => handleCardClick('providerApple')} title="Voir la liste">
                🍎 Apple: <strong>{metrics?.providerAppleCount || 0}</strong> <span style={{ color: '#a0aec0', fontWeight: 400 }}>({metrics?.totalAccounts ? Math.round((metrics.providerAppleCount || 0) / metrics.totalAccounts * 100) : 0}%)</span>
              </span>
              <span className="provider-badge clickable-badge" onClick={() => handleCardClick('providerEmail')} title="Voir la liste">
                ✉️ Email: <strong>{metrics?.providerEmailCount || 0}</strong> <span style={{ color: '#a0aec0', fontWeight: 400 }}>({metrics?.totalAccounts ? Math.round((metrics.providerEmailCount || 0) / metrics.totalAccounts * 100) : 0}%)</span>
              </span>
            </div>
          </div>
        </div>

        {([
          {
            type: 'babies1Task' as ModalType, icon: '📝', label: 'Bébés avec ≥ 1 tâche', value: metrics?.babiesWithMoreThan1Task || 0,
            tooltip: <><strong>Preuve d'utilisation réelle</strong><ul><li>Règle : baby.tasks.length ≥ 1</li><li>Le seuil minimal : l'utilisateur a ouvert l'app et enregistré au moins une action</li><li>Ex : 90% ici = seuls 10% créent un bébé sans jamais enregistrer une tâche</li></ul></>
          },
          {
            type: 'babies5Tasks' as ModalType, icon: '✅', label: 'Bébés avec > 5 tâches', value: metrics?.babiesWithMoreThan5Tasks || 0,
            tooltip: <><strong>Usage régulier (quelques jours)</strong><ul><li>Règle : baby.tasks.length &gt; 5</li><li>5 tâches ≈ 1-2 jours d'utilisation intensive (biberon toutes les 3h + couches)</li><li>Indicateur que l'utilisateur est passé au-delà de la phase de test</li></ul></>
          },
          {
            type: 'babies30Tasks' as ModalType, icon: '🔥', label: 'Bébés avec > 30 tâches', value: metrics?.babiesWithMoreThan30Tasks || 0,
            tooltip: <><strong>Engagement fort</strong><ul><li>Règle : baby.tasks.length &gt; 30</li><li>30 tâches ≈ plusieurs jours d'usage régulier ou ~1 semaine intensive</li><li>Ces utilisateurs ont vraiment adopté l'app dans leur quotidien</li></ul></>
          },
          {
            type: 'babies100Tasks' as ModalType, icon: '⭐', label: 'Bébés avec > 100 tâches', value: metrics?.babiesWithMoreThan100Tasks || 0,
            tooltip: <><strong>Power users</strong><ul><li>Règle : baby.tasks.length &gt; 100</li><li>100 tâches ≈ 2-3 semaines d'utilisation quotidienne</li><li>Ces utilisateurs sont les plus susceptibles de laisser un avis positif</li></ul></>
          },
          {
            type: 'babiesMultipleParents' as ModalType, icon: '👨‍👩‍👧', label: 'Bébés partagés (> 1 parent)', value: metrics?.babiesWithMultipleParents || 0,
            tooltip: <><strong>Bébés avec plusieurs parents</strong><ul><li>Règle : baby.user[].length &gt; 1</li><li>Un parent a partagé le bébé via code d'invitation → l'autre a rejoint</li><li>baby.admin = créateur, baby.user[] = tous les parents</li><li>Ex : 25% de partage = 1 bébé sur 4 est suivi par les deux parents</li></ul></>
          },
          {
            type: 'babiesActiveRecently' as ModalType, icon: '🟢', label: 'Bébés actifs (7 derniers jours)', value: metrics?.babiesActiveRecently || 0, trend: true,
            tooltip: <><strong>Activité récente</strong><ul><li>Règle : au moins une tâche avec task.date ≥ aujourd'hui − 7 jours</li><li>Indépendant du filtre de période : calculé toujours sur les 7 derniers jours glissants</li><li>Ex : 60% d'actifs récents = bonne rétention à court terme</li></ul></>
          },
        ]).map(({ type, icon, label, value, trend, tooltip }) => (
          <div key={type} className="metric-card clickable" onClick={() => handleCardClick(type)}>
            <div className="metric-icon">{icon}</div>
            <div className="metric-content">
              <div className="metric-label">{label}<Info>{tooltip}</Info></div>
              <div className="metric-value">{value}</div>
              <div className="metric-breakdown"><span>{metrics?.totalBabies ? Math.round(value / metrics.totalBabies * 100) : 0}% des bébés</span></div>
              {trend && renderTrend(value, metrics?.previousPeriod?.babiesActiveRecently)}
              <div className="metric-hint">Cliquez pour voir la liste</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Premium ── */}
      {metrics?.premiumStats && (
        <div className="section-card" style={{ marginBottom: 24 }}>
          <h3>⭐ Premium</h3>
          <p className="section-subtitle">
            Total global : <strong>{metrics.premiumStats.total}</strong> achats premium
            <Info>
              <strong>Comment est calculé le premium</strong>
              <ul>
                <li><strong>isPremium: true</strong> en base Firestore</li>
                <li><strong>ET</strong> compte créé après le 10/06/2026 — avant, le premium a été offert
                    en masse par script, ces comptes ne sont donc pas des achats</li>
                <li>Les périodes ci-dessous sont datées par <strong>premiumDate</strong> (date d'achat),
                    pas par la date de création du compte : le délai entre inscription et achat est
                    souvent de plusieurs semaines</li>
                <li>Cliquez sur une carte pour voir la liste des acheteurs</li>
              </ul>
            </Info>
          </p>
          <div className="metrics-grid">
            <div className="metric-card clickable" onClick={() => handleCardClick('premiumToday')}>
              <div className="metric-icon">⭐</div>
              <div className="metric-content">
                <div className="metric-label">Achats aujourd'hui</div>
                <div className="metric-value">{metrics.premiumStats.today}</div>
              </div>
            </div>
            <div className="metric-card clickable" onClick={() => handleCardClick('premiumYesterday')}>
              <div className="metric-icon">⭐</div>
              <div className="metric-content">
                <div className="metric-label">Achats hier</div>
                <div className="metric-value">{metrics.premiumStats.yesterday}</div>
              </div>
            </div>
            <div className="metric-card clickable" onClick={() => handleCardClick('premium7Days')}>
              <div className="metric-icon">⭐</div>
              <div className="metric-content">
                <div className="metric-label">Achats sur 7 jours</div>
                <div className="metric-value">{metrics.premiumStats.last7Days}</div>
              </div>
            </div>
            <div className="metric-card clickable" onClick={() => handleCardClick('premium30Days')}>
              <div className="metric-icon">📈</div>
              <div className="metric-content">
                <div className="metric-label">Achats sur 30 jours</div>
                <div className="metric-value">{metrics.premiumStats.last30Days}</div>
              </div>
            </div>
            <div className="metric-card clickable" onClick={() => handleCardClick('premiumTotal')}>
              <div className="metric-icon">🏆</div>
              <div className="metric-content">
                <div className="metric-label">Total achats (toute la base)</div>
                <div className="metric-value">{metrics.premiumStats.total}</div>
              </div>
            </div>
          </div>
          {metrics.premiumStats.undatedPurchases > 0 && (
            <p style={{ fontSize: 12, color: '#888', marginTop: 12 }}>
              ⚠️ {metrics.premiumStats.undatedPurchases} achat{metrics.premiumStats.undatedPurchases > 1 ? 's' : ''} sans
              date (antérieur{metrics.premiumStats.undatedPurchases > 1 ? 's' : ''} à la v1.3.2, qui a introduit
              le champ <code>premiumDate</code>) — compté{metrics.premiumStats.undatedPurchases > 1 ? 's' : ''} dans
              le total, absent{metrics.premiumStats.undatedPurchases > 1 ? 's' : ''} des périodes.
            </p>
          )}
        </div>
      )}

      {/* ── Taux de conversion ── */}
      {metrics && (
        <div className="conversion-section">
          <h3>
            📊 Taux de conversion
            <Info>
              <strong>Comment lire ces taux</strong>
              <ul>
                <li>Chaque taux mesure le % d'utilisateurs qui passent à l'étape suivante du funnel</li>
                <li>⚠️ Téléchargements → Comptes peut dépasser 100% si la période est différente (ex : compte créé après la période filtrée)</li>
                <li>Engagement fort (&gt;30 tâches) = utilisateurs vraiment actifs au quotidien</li>
                <li>Ex : 80% Comptes→Bébés = 1 compte sur 5 ne crée pas de bébé</li>
              </ul>
            </Info>
          </h3>
          <div className="conversion-grid">
            {([
              { label: 'Téléchargements → Comptes', num: metrics.totalAccounts, den: metrics.iosDownloads + metrics.androidDownloads },
              { label: 'Comptes → Bébés', num: metrics.totalBabies, den: metrics.totalAccounts },
              { label: 'Bébés → Utilisation (≥ 1 tâche)', num: metrics.babiesWithMoreThan1Task, den: metrics.totalBabies },
              { label: 'Bébés → Engagement fort (> 30 tâches)', num: metrics.babiesWithMoreThan30Tasks, den: metrics.totalBabies },
              { label: 'Bébés → Actifs récemment', num: metrics.babiesActiveRecently, den: metrics.totalBabies },
              { label: 'Bébés partagés (multi-parents)', num: metrics.babiesWithMultipleParents, den: metrics.totalBabies },
            ]).map(({ label, num, den }) => (
              <div key={label} className="conversion-card">
                <div className="conversion-label">{label}</div>
                <div className="conversion-value">{den > 0 ? `${Math.round((num / den) * 100)}%` : 'N/A'}</div>
                <div className="conversion-detail">{num} / {den}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Statistiques moyennes ── */}
      {metrics?.averageStats && (
        <div className="stats-section">
          <h3>
            📈 Statistiques moyennes
            <Info>
              <strong>Moyennes calculées sur tous les bébés filtrés</strong>
              <ul>
                <li>Tâches/bébé : total tâches ÷ nombre de bébés — indicateur d'intensité d'usage</li>
                <li>Parents/bébé : moyenne du nombre d'adultes suivant chaque bébé</li>
                <li>Durée de vie (comptes supprimés) : jours entre creationDate et deletedAt</li>
                <li>Ex : 150 tâches/bébé = environ 1-2 mois d'usage quotidien</li>
              </ul>
            </Info>
          </h3>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon">📊</div><div className="stat-content"><div className="stat-label">Nb moyen de tâches par bébé</div><div className="stat-value">{metrics.averageStats.avgTasksPerBaby}</div></div></div>
            <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-content"><div className="stat-label">Nb moyen de parents par bébé</div><div className="stat-value">{metrics.averageStats.avgParentsPerBaby}</div></div></div>
            <div className="stat-card"><div className="stat-icon">⭐</div><div className="stat-content"><div className="stat-label">Type de tâche le plus populaire</div><div className="stat-value">{metrics.averageStats.mostPopularTaskType}</div><div className="stat-detail">{metrics.averageStats.mostPopularTaskCount} tâches</div></div></div>
            {metrics.averageStats.avgAccountLifetime > 0 && (
              <div className="stat-card"><div className="stat-icon">⏱️</div><div className="stat-content"><div className="stat-label">Durée de vie moyenne (comptes supprimés)</div><div className="stat-value">{metrics.averageStats.avgAccountLifetime} jours</div></div></div>
            )}
          </div>
        </div>
      )}

      {/* ── Répartition des tâches ── */}
      {metrics?.taskDistribution && (
        <TaskDistribution
          distribution={metrics.taskDistribution}
          biberonMilkType={metrics.biberonMilkType}
          allaitementTimerType={metrics.allaitementTimerType}
          diaperContent={metrics.diaperContentDistribution}
        />
      )}
      {metrics?.taskDistributionByAge && Object.keys(metrics.taskDistributionByAge).length > 0 && (
        <TaskDistributionByAge distributionByAge={metrics.taskDistributionByAge} />
      )}

      {/* ── Analyse des abandons ── */}
      {metrics?.dropoutAnalysis && (
        <div className="section-card">
          <h3>
            Analyse des abandons
            <Info>
              <strong>Qui abandonne et à quel stade ?</strong>
              <ul>
                <li><strong>Sans tâche :</strong> profil bébé créé mais jamais utilisé pour logger une action</li>
                <li><strong>1 tâche exactement :</strong> a testé l'app une fois puis n'est pas revenu</li>
                <li><strong>2–5 tâches :</strong> usage très court, souvent 1-2 jours puis abandon</li>
                <li>Calculé sur l'ensemble de la base (pas filtré par période)</li>
              </ul>
            </Info>
          </h3>
          <p className="section-subtitle">Total : <strong>{metrics.totalBabies}</strong> bébés</p>

          <div className="metrics-grid" style={{ marginBottom: 24 }}>
            <div className="metric-item">
              <span className="metric-value">{metrics.dropoutAnalysis.exactly0Tasks}</span>
              <span className="metric-pct">{metrics.totalBabies > 0 ? Math.round(metrics.dropoutAnalysis.exactly0Tasks / metrics.totalBabies * 100) : 0}%</span>
              <span className="metric-label">Bébés sans tâche</span>
            </div>
            <div className="metric-item">
              <span className="metric-value">{metrics.dropoutAnalysis.exactly1Task}</span>
              <span className="metric-pct">{metrics.totalBabies > 0 ? Math.round(metrics.dropoutAnalysis.exactly1Task / metrics.totalBabies * 100) : 0}%</span>
              <span className="metric-label">Exactement 1 tâche</span>
            </div>
            <div className="metric-item">
              <span className="metric-value">{metrics.dropoutAnalysis.tasks2to5}</span>
              <span className="metric-pct">{metrics.totalBabies > 0 ? Math.round(metrics.dropoutAnalysis.tasks2to5 / metrics.totalBabies * 100) : 0}%</span>
              <span className="metric-label">2 à 5 tâches</span>
            </div>

            {([
              {
                type: 'accountToBaby' as DelayType,
                label: 'Compte → création bébé',
                avg: metrics.dropoutAnalysis.avgDaysAccountToBaby,
                min: metrics.dropoutAnalysis.minDaysAccountToBaby,
                max: metrics.dropoutAnalysis.maxDaysAccountToBaby,
                tooltip: <><strong>Délai entre création du compte et création du profil bébé</strong><ul><li>0 jour = compte et bébé créés le même jour (cas le plus fréquent)</li><li>Un délai long = l'utilisateur a attendu avant de créer le profil (ex : bébé pas encore né)</li><li>Calculé via : parseBabyDate(baby) − user.creationDate</li><li>Ex : moy. 2j → la majorité configure le bébé le jour même ou le lendemain</li></ul></>
              },
              {
                type: 'babyToFirst' as DelayType,
                label: 'Bébé créé → 1ère tâche',
                avg: metrics.dropoutAnalysis.avgDaysBabyToFirstTask,
                min: metrics.dropoutAnalysis.minDaysBabyToFirstTask,
                max: metrics.dropoutAnalysis.maxDaysBabyToFirstTask,
                tooltip: <><strong>Délai entre création du profil bébé et première tâche enregistrée</strong><ul><li>0 jour = bébé créé et première tâche le même jour</li><li>Indique si l'onboarding est fluide : un délai long = friction à la première utilisation</li><li>Calculé via : firstTask.date − parseBabyDate(baby)</li><li>Ex : moy. 0j → les utilisateurs commencent à logger immédiatement après la création</li></ul></>
              },
              {
                type: 'accountToFirst' as DelayType,
                label: 'Compte → 1ère tâche',
                avg: metrics.dropoutAnalysis.avgDaysAccountToFirstTask,
                min: metrics.dropoutAnalysis.minDaysAccountToFirstTask,
                max: metrics.dropoutAnalysis.maxDaysAccountToFirstTask,
                tooltip: <><strong>Délai total entre création du compte et première utilisation réelle</strong><ul><li>Combine les deux délais précédents : compte→bébé + bébé→tâche</li><li>C'est le délai "time to value" : combien de temps avant que l'utilisateur tire de la valeur de l'app</li><li>Calculé via : firstTask.date − user.creationDate</li><li>Ex : moy. 1j → les utilisateurs trouvent de la valeur très rapidement</li></ul></>
              },
            ]).map(({ type, label, avg, min, max, tooltip }) => (
              <div key={type} className="metric-item" style={{ cursor: 'pointer' }} onClick={() => handleDelayCardClick(type)} title="Voir les exemples">
                <span className="metric-value">{avg}j</span>
                <span className="metric-label">
                  {label}
                  <Info>{tooltip}</Info>
                </span>
                <span className="metric-sub">min {min}j · max {max}j</span>
                <span className="metric-hint" style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>Cliquez pour des exemples</span>
              </div>
            ))}
          </div>

          <div className="profiles-grid">
            {Object.keys(metrics.dropoutAnalysis.firstTaskTypeFor1Task).length > 0 && (() => {
              const total1 = metrics.dropoutAnalysis!.exactly1Task || 1;
              return (
                <div className="profile-section">
                  <h4>
                    1ère (et unique) tâche des abandonnistes
                    <Info>
                      <strong>Quelle tâche les utilisateurs à 1 tâche ont-ils enregistrée ?</strong>
                      <ul>
                        <li>Uniquement les bébés avec exactement 1 tâche enregistrée</li>
                        <li>Si "Biberon" domine → les parents testent l'app lors d'un repas puis abandonnent</li>
                        <li>Utile pour cibler l'onboarding sur la tâche de découverte principale</li>
                      </ul>
                    </Info>
                  </h4>
                  {Object.entries(metrics.dropoutAnalysis!.firstTaskTypeFor1Task).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                    <div key={type} className="profile-bar-row">
                      <span className="profile-label">{type}</span>
                      <span className="profile-count">{count} <span className="profile-pct">({Math.round(count / total1 * 100)}%)</span></span>
                    </div>
                  ))}
                  <p className="profile-note">Durée moy. d'usage (2-5 tâches) : {metrics.dropoutAnalysis!.avgDaysActiveFor2to5}j</p>
                </div>
              );
            })()}

            {(() => {
              const buckets = metrics.dropoutAnalysis!.activeDurationBuckets;
              const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
              return (
                <div className="profile-section">
                  <h4>
                    Durée d'usage (bébés ≥ 2 tâches)
                    <Info>
                      <strong>Combien de temps les utilisateurs utilisent l'app</strong>
                      <ul>
                        <li>Durée = date de la dernière tâche − date de la première tâche</li>
                        <li>Seulement les bébés avec ≥ 2 tâches (exclut les abandonnistes à 1 tâche)</li>
                        <li>Ex : 60% dans "3 mois+" = la majorité utilise l'app pendant plusieurs mois</li>
                      </ul>
                    </Info>
                  </h4>
                  {[
                    { key: 'under7', label: '< 1 semaine' },
                    { key: 'd7to30', label: '1 sem – 1 mois' },
                    { key: 'd30to90', label: '1 – 3 mois' },
                    { key: 'over90', label: '3 mois +' },
                  ].map(({ key, label }) => {
                    const count = (buckets as any)[key];
                    return (
                      <div key={key} className="profile-bar-row">
                        <span className="profile-label">{label}</span>
                        <span className="profile-count">{count} <span className="profile-pct">({Math.round(count / total * 100)}%)</span></span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {(() => {
              const buckets = metrics.dropoutAnalysis!.babyAgeAtLastTaskBuckets;
              const total = Object.values(buckets).reduce((a, b) => a + b, 0) || 1;
              return (
                <div className="profile-section">
                  <h4>
                    Âge du bébé à la dernière tâche
                    <Info>
                      <strong>À quel âge du bébé les parents arrêtent-ils l'app ?</strong>
                      <ul>
                        <li>Âge calculé depuis baby.birthDate (âge réel du bébé, pas la date du profil)</li>
                        <li>Donne l'étape de développement où l'app est abandonnée</li>
                        <li>Ex : majorité à "1–3 mois" → les parents cherchent une app pour les premiers mois puis s'arrêtent</li>
                        <li>Ex : "3 mois+" dominant → très bon signe d'engagement long terme</li>
                      </ul>
                    </Info>
                  </h4>
                  {[
                    { key: 'under30', label: '< 1 mois' },
                    { key: 'd30to90', label: '1 – 3 mois' },
                    { key: 'd90to180', label: '3 – 6 mois' },
                    { key: 'd180to365', label: '6 – 12 mois' },
                    { key: 'over365', label: '12 mois +' },
                  ].map(({ key, label }) => {
                    const count = (buckets as any)[key];
                    return (
                      <div key={key} className="profile-bar-row">
                        <span className="profile-label">{label}</span>
                        <span className="profile-count">{count} <span className="profile-pct">({Math.round(count / total * 100)}%)</span></span>
                      </div>
                    );
                  })}
                  <p className="profile-note">Âge moyen à la dernière tâche : {Math.round(metrics.dropoutAnalysis!.avgBabyAgeAtLastTaskDays / 30)} mois</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Rétention ── */}
      {metrics?.retentionByAge && (
        <div className="section-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Rétention des bébés</h3>
            <div className="info-tooltip" style={{ marginTop: 2 }}>
              <span className="info-icon">ℹ️</span>
              <div className="tooltip-content">
                <strong>Comment ce graphique est construit</strong>
                <ul>
                  <li>Pour chaque bébé avec ≥ 1 tâche, on calcule : <code style={{ background: '#333', padding: '1px 4px', borderRadius: 3 }}>durée = date dernière tâche − date création du profil bébé</code></li>
                  <li><strong>J+7 = 161</strong> signifie : 161 bébés ont leur dernière tâche au moins 7 jours après avoir créé le profil</li>
                  <li>⚠️ Ce n'est PAS "actif à J+7" — c'est "a utilisé l'app pendant au moins 7 jours au total"</li>
                  <li>Un bébé à J+90 peut avoir arrêté à J+91</li>
                  <li>Référence : date de création du profil bébé (pas la date de naissance, pas la date du compte)</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="section-subtitle" style={{ marginTop: 8 }}>
            Sur <strong>{metrics.retentionByAge.totalWithDate}</strong> bébés avec au moins une tâche
          </p>
          <div className="retention-table">
            {([
              { key: 'd1', label: 'J+1' }, { key: 'd3', label: 'J+3' }, { key: 'd7', label: 'J+7' },
              { key: 'd15', label: 'J+15' }, { key: 'd20', label: 'J+20' }, { key: 'd25', label: 'J+25' },
              { key: 'd30', label: 'J+30' }, { key: 'd45', label: 'J+45' }, { key: 'd60', label: 'J+60' },
              { key: 'd75', label: 'J+75' }, { key: 'd90', label: 'J+90' },
            ] as { key: keyof typeof metrics.retentionByAge; label: string }[]).map(({ key, label }) => {
              const count = metrics.retentionByAge![key] as number;
              const pct = Math.round((count / metrics.retentionByAge!.totalWithDate) * 100);
              return (
                <div key={key} className="retention-row">
                  <span className="retention-label">{label}</span>
                  <div className="retention-bar-wrap"><div className="retention-bar" style={{ width: `${pct}%` }} /></div>
                  <span className="retention-pct">{pct}%</span>
                  <span className="retention-count">{count} bébés</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Profils parents ── */}
      {(metrics?.roleDistribution || metrics?.ageRangeDistribution) && (
        <div className="section-card">
          <h3>
            Profils des parents
            <Info>
              <strong>Données déclaratives saisies dans l'app</strong>
              <ul>
                <li><strong>Rôles :</strong> stocké dans baby.memberRoles[userId] — renseigné lors de la création du profil bébé (ex : Maman, Papa, Grand-mère…)</li>
                <li><strong>Tranches d'âge :</strong> stocké dans user.parentAgeRange — sélectionné lors de l'inscription (ex : '25-30', 'over40')</li>
                <li>Premier enfant : nb de fois où firstChildFor[userId] = true</li>
                <li>Ces données ne sont renseignées que si l'utilisateur a répondu aux questions d'onboarding</li>
              </ul>
            </Info>
          </h3>
          <div className="profiles-grid">
            {metrics.roleDistribution && (() => {
              const total = Object.values(metrics.roleDistribution!).reduce((a, b) => a + b, 0) || 1;
              return (
                <div className="profile-section">
                  <h4>Rôles</h4>
                  {Object.entries(metrics.roleDistribution!).sort(([, a], [, b]) => b - a).map(([role, count]) => (
                    <div key={role} className="profile-bar-row">
                      <span className="profile-label">{role}</span>
                      <span className="profile-count">{count} <span className="profile-pct">({Math.round(count / total * 100)}%)</span></span>
                    </div>
                  ))}
                  {metrics.firstChildCount !== undefined && <p className="profile-note">Premier enfant : {metrics.firstChildCount} fois</p>}
                </div>
              );
            })()}
            {metrics.ageRangeDistribution && (() => {
              const total = Object.values(metrics.ageRangeDistribution!).reduce((a, b) => a + b, 0) || 1;
              return (
                <div className="profile-section">
                  <h4>Tranches d'âge</h4>
                  {['under25', 'r25to30', 'r30to35', 'r35to40', 'over40'].map(range => {
                    const labels: Record<string, string> = { under25: '< 25', r25to30: '25-30', r30to35: '30-35', r35to40: '35-40', over40: '40+' };
                    const count = metrics.ageRangeDistribution![range] || 0;
                    return (
                      <div key={range} className="profile-bar-row">
                        <span className="profile-label">{labels[range]}</span>
                        <span className="profile-count">{count} <span className="profile-pct">({Math.round(count / total * 100)}%)</span></span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Funnel utilisateurs ── */}
      {metrics?.userFunnel && (
        <div className="section-card">
          <h3>
            Comportement après création de compte
            <Info>
              <strong>Que font les utilisateurs une fois inscrits ?</strong>
              <ul>
                <li><strong>A créé un bébé :</strong> user.userId = baby.admin → c'est lui qui a initié le profil bébé</li>
                <li><strong>A rejoint un bébé :</strong> présent dans baby.user[] mais pas baby.admin → a rejoint via code d'invitation partagé par l'autre parent</li>
                <li><strong>Aucun bébé (compte fantôme) :</strong> userId absent de tout baby.user[] → compte créé mais pas utilisé</li>
                <li>Les 3 catégories sont mutuellement exclusives (pas de multi-bébé dans l'app)</li>
                <li>Ex : 10% de "fantômes" → bon signe, peu d'abandon post-inscription</li>
              </ul>
            </Info>
          </h3>
          <p className="section-subtitle">Sur <strong>{metrics.userFunnel.total}</strong> comptes</p>
          <div className="profile-section">
            {[
              { key: 'createdBaby', label: 'A créé un bébé' },
              { key: 'joinedBaby', label: 'A rejoint un bébé' },
              { key: 'noBaby', label: 'Aucun bébé (compte fantôme)' },
            ].map(({ key, label }) => {
              const count = (metrics.userFunnel as any)[key];
              const pct = Math.round(count / metrics.userFunnel!.total * 100);
              return (
                <div key={key} className="profile-bar-row">
                  <span className="profile-label">{label}</span>
                  <span className="profile-count">{count} <span className="profile-pct">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {metrics && allUsers.length > 0 && allBabies.length > 0 && (
        <Charts users={allUsers} babies={allBabies} iosDownloads={metrics.iosDownloads} androidDownloads={metrics.androidDownloads} />
      )}

      <div className="info-box">
        <p><strong>Note :</strong> Les téléchargements par OS sont basés sur Firebase Analytics.</p>
        <p>Pour voir les tendances dans le temps, allez dans l'onglet "Évolution".</p>
      </div>

      <ListModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={getModalTitle()}
        type={['accounts', 'accountsWithoutBaby', 'deletedAccounts', 'emailOptIn', 'providerGoogle', 'providerApple', 'providerEmail', 'premiumTotal', 'premiumToday', 'premiumYesterday', 'premium7Days', 'premium30Days'].includes(modalType as string) ? 'users' : 'babies'}
        data={modalData}
        showAgeBreakdown={modalType === 'accountsWithoutBaby'}
        onBabyClick={handleBabyClick}
        onUserClick={handleUserClick}
      />

      <BabyDetailsModal isOpen={isBabyModalOpen} onClose={() => setIsBabyModalOpen(false)} baby={selectedBaby} onBabyDeleted={handleBabyDeleted} onParentClick={handleParentClick} />
      <UserDetailsModal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} user={selectedUser} />

      {delayDetail && (
        <div className="modal-overlay" onClick={() => setDelayDetail(null)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{delayDetail.title}</h3>
              <button className="close-btn" onClick={() => setDelayDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              {([
                { label: '3 plus rapides', entries: delayDetail.min, color: '#10b981' },
                { label: '3 médians', entries: delayDetail.mid, color: '#f59e0b' },
                { label: '3 plus longs', entries: delayDetail.max, color: '#ef4444' },
              ]).map(({ label, entries, color }) => (
                <div key={label} style={{ marginBottom: 24 }}>
                  <h4 style={{ color, margin: '0 0 10px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</h4>
                  {entries.map((entry, i) => (
                    <div key={i} style={{ background: '#f7fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: 15 }}>👶 {entry.baby.name}</strong>
                          {entry.user && <span style={{ color: '#718096', fontSize: 13, marginLeft: 10 }}>{entry.user.email}</span>}
                        </div>
                        <span style={{ color, fontWeight: 700, fontSize: 20 }}>{entry.delay}j</span>
                      </div>
                      {entry.user && (
                        <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 4 }}>
                          {entry.user.username} · {entry.user.provider === 'google' ? '🔵 Google' : entry.user.provider === 'apple' ? '🍎 Apple' : '✉️ Email'}
                          {entry.user.creationDate && <>{' · compte créé le '}{new Date(typeof entry.user.creationDate === 'string' ? entry.user.creationDate : (entry.user.creationDate as any).toDate()).toLocaleDateString('fr-FR')}</>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
