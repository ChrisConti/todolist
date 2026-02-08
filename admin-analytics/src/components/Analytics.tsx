import React, { useState, useEffect } from 'react';
import type { DateRange, PresetRange, AnalyticsMetrics, User, Baby } from '../types';
import { DateRangeSelector } from './DateRangeSelector';
import { getAnalyticsMetrics, getAllUsers, getAllBabies } from '../services/analyticsService';
import { ListModal } from './ListModal';
import { Charts } from './Charts';
import { BabyDetailsModal } from './BabyDetailsModal';
import { TaskDistribution } from './TaskDistribution';
import './Analytics.css';

type ModalType = 'accounts' | 'babies' | 'accountsWithoutBaby' | 'deletedAccounts' | 'babies1Task' | 'babies5Tasks' | 'babies30Tasks' | 'babies100Tasks' | 'babiesMultipleParents' | 'babiesActiveRecently' | null;

export const Analytics: React.FC = () => {
  const [preset, setPreset] = useState<PresetRange>('today');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<User[] | Baby[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allBabies, setAllBabies] = useState<Baby[]>([]);
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [isBabyModalOpen, setIsBabyModalOpen] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, users, babies] = await Promise.all([
        getAnalyticsMetrics(dateRange),
        getAllUsers(),
        getAllBabies(),
      ]);
      setMetrics(data);
      setAllUsers(users);
      setAllBabies(babies);
    } catch (err: any) {
      console.error('Error loading metrics:', err);
      setError(err.message || 'Erreur lors du chargement des métriques');
    } finally {
      setLoading(false);
    }
  };

  const handleBabyClick = (baby: Baby) => {
    setSelectedBaby(baby);
    setIsBabyModalOpen(true);
  };

  const renderTrend = (current: number, previous?: number) => {
    if (!previous || !metrics?.previousPeriod) return null;

    const diff = current - previous;
    if (diff === 0) return null;

    const isPositive = diff > 0;
    const arrow = isPositive ? '⬆️' : '⬇️';
    const color = isPositive ? '#10b981' : '#ef4444';

    return (
      <div className="metric-trend" style={{ color, fontSize: '13px', fontWeight: 500 }}>
        {arrow} {diff > 0 ? '+' : ''}{diff}
      </div>
    );
  };

  const handleCardClick = async (type: ModalType) => {
    if (!type) return;

    try {
      const allUsers = await getAllUsers();
      const allBabies = await getAllBabies();

      // Create a map of userId to email for quick lookup
      const userEmailMap = new Map<string, string>();
      allUsers.forEach(u => userEmailMap.set(u.userId, u.email));

      // Filter by date range
      let users = allUsers;
      let babies = allBabies;

      if (dateRange.start && dateRange.end) {
        users = allUsers.filter(u => {
          if (!u.creationDate) return false;
          let userDate: Date;
          if (typeof u.creationDate === 'object' && 'toDate' in u.creationDate) {
            userDate = (u.creationDate as any).toDate();
          } else if (typeof u.creationDate === 'string') {
            userDate = new Date(u.creationDate);
          } else {
            return false;
          }
          return userDate >= dateRange.start! && userDate <= dateRange.end!;
        });

        babies = allBabies.filter(b => {
          if (!b.CreatedDate) return false;
          const babyDate = new Date(b.CreatedDate);
          if (isNaN(babyDate.getTime())) return false;
          return babyDate >= dateRange.start! && babyDate <= dateRange.end!;
        });
      }

      // Sort function for users by creation date (descending)
      const sortUsers = (userList: User[]) => {
        return userList.sort((a, b) => {
          const dateA = a.creationDate
            ? (typeof a.creationDate === 'string' ? new Date(a.creationDate) : (a.creationDate as any).toDate())
            : new Date(0);
          const dateB = b.creationDate
            ? (typeof b.creationDate === 'string' ? new Date(b.creationDate) : (b.creationDate as any).toDate())
            : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      };

      // Sort function for babies by creation date (descending)
      const sortBabies = (babyList: Baby[]) => {
        return babyList.sort((a, b) => {
          const dateA = a.CreatedDate ? new Date(a.CreatedDate) : new Date(0);
          const dateB = b.CreatedDate ? new Date(b.CreatedDate) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
      };

      // Add parent emails to each baby
      const enrichBabiesWithEmails = (babyList: Baby[]) => {
        return babyList.map(baby => ({
          ...baby,
          parentEmails: baby.user?.map(uid => userEmailMap.get(uid) || 'N/A').filter(Boolean) || []
        }));
      };

      switch (type) {
        case 'accounts':
          setModalData(sortUsers([...users]));
          break;
        case 'babies':
          setModalData(enrichBabiesWithEmails(sortBabies([...babies])));
          break;
        case 'accountsWithoutBaby':
          const userIdsWithBabies = new Set<string>();
          babies.forEach(baby => {
            if (baby.user && Array.isArray(baby.user)) {
              baby.user.forEach(uid => userIdsWithBabies.add(uid));
            }
          });
          const usersWithoutBaby = users.filter(u => !userIdsWithBabies.has(u.userId));
          setModalData(sortUsers(usersWithoutBaby));
          break;
        case 'deletedAccounts':
          const deletedUsers = users.filter(u => u.deleted === true);
          setModalData(sortUsers(deletedUsers));
          break;
        case 'babies1Task':
          setModalData(enrichBabiesWithEmails(sortBabies(babies.filter(b => (b.tasks?.length || 0) >= 1))));
          break;
        case 'babies5Tasks':
          setModalData(enrichBabiesWithEmails(sortBabies(babies.filter(b => (b.tasks?.length || 0) > 5))));
          break;
        case 'babies30Tasks':
          setModalData(enrichBabiesWithEmails(sortBabies(babies.filter(b => (b.tasks?.length || 0) > 30))));
          break;
        case 'babies100Tasks':
          setModalData(enrichBabiesWithEmails(sortBabies(babies.filter(b => (b.tasks?.length || 0) > 100))));
          break;
        case 'babiesMultipleParents':
          setModalData(enrichBabiesWithEmails(sortBabies(babies.filter(b => (b.user?.length || 0) > 1))));
          break;
        case 'babiesActiveRecently':
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const activeBabies = babies.filter(b => {
            return b.tasks?.some(task => {
              if (!task.date) return false;
              const taskDate = new Date(task.date);
              return !isNaN(taskDate.getTime()) && taskDate >= sevenDaysAgo;
            });
          });
          setModalData(enrichBabiesWithEmails(sortBabies(activeBabies)));
          break;
      }

      setModalType(type);
    } catch (err) {
      console.error('Error loading list data:', err);
    }
  };

  const getModalTitle = (): string => {
    switch (modalType) {
      case 'accounts': return 'Comptes créés';
      case 'babies': return 'Bébés créés';
      case 'accountsWithoutBaby': return 'Comptes sans bébé';
      case 'deletedAccounts': return 'Comptes supprimés';
      case 'babies1Task': return 'Bébés avec ≥ 1 tâche';
      case 'babies5Tasks': return 'Bébés avec > 5 tâches';
      case 'babies30Tasks': return 'Bébés avec > 30 tâches';
      case 'babies100Tasks': return 'Bébés avec > 100 tâches';
      case 'babiesMultipleParents': return 'Bébés partagés (> 1 parent)';
      case 'babiesActiveRecently': return 'Bébés actifs (7 derniers jours)';
      default: return '';
    }
  };

  if (loading && !metrics) {
    return (
      <div className="analytics">
        <h2>Vue d'ensemble</h2>
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          preset={preset}
          onPresetChange={setPreset}
        />
        <div className="loading">Chargement des données...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics">
        <h2>Vue d'ensemble</h2>
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          preset={preset}
          onPresetChange={setPreset}
        />
        <div className="error-box">{error}</div>
      </div>
    );
  }

  return (
    <div className="analytics">
      <div className="header-with-info">
        <h2>Vue d'ensemble</h2>
        <button className="refresh-btn" onClick={loadMetrics} disabled={loading} title="Actualiser les données">
          🔄 Actualiser
        </button>
        <div className="info-tooltip">
          <span className="info-icon">ℹ️</span>
          <div className="tooltip-content">
            <strong>Règles de filtrage:</strong>
            <ul>
              <li><strong>"Toute la base":</strong> Toutes les données (aucun filtre)</li>
              <li><strong>"Aujourd'hui":</strong> Données créées aujourd'hui uniquement</li>
              <li><strong>Autres périodes:</strong> Comptes et bébés créés dans la période sélectionnée</li>
              <li>Les métriques d'engagement sont calculées sur les bébés filtrés</li>
            </ul>
          </div>
        </div>
      </div>

      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      {loading && <div className="loading-overlay">Actualisation...</div>}

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📱</div>
          <div className="metric-content">
            <div className="metric-label">Téléchargements</div>
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
            <div className="metric-label">Comptes créés</div>
            <div className="metric-value">{metrics?.totalAccounts || 0}</div>
            {renderTrend(metrics?.totalAccounts || 0, metrics?.previousPeriod?.totalAccounts)}
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('babies')}>
          <div className="metric-icon">👶</div>
          <div className="metric-content">
            <div className="metric-label">Bébés créés</div>
            <div className="metric-value">{metrics?.totalBabies || 0}</div>
            {renderTrend(metrics?.totalBabies || 0, metrics?.previousPeriod?.totalBabies)}
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable warning" onClick={() => handleCardClick('accountsWithoutBaby')}>
          <div className="metric-icon">⚠️</div>
          <div className="metric-content">
            <div className="metric-label">Comptes sans bébé</div>
            <div className="metric-value">{metrics?.accountsWithoutBaby || 0}</div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('deletedAccounts')}>
          <div className="metric-icon">🗑️</div>
          <div className="metric-content">
            <div className="metric-label">Comptes supprimés</div>
            <div className="metric-value">{metrics?.deletedAccounts || 0}</div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('babies1Task')}>
          <div className="metric-icon">📝</div>
          <div className="metric-content">
            <div className="metric-label">Bébés avec ≥ 1 tâche</div>
            <div className="metric-value">{metrics?.babiesWithMoreThan1Task || 0}</div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('babies5Tasks')}>
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <div className="metric-label">Bébés avec &gt; 5 tâches</div>
            <div className="metric-value">{metrics?.babiesWithMoreThan5Tasks || 0}</div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('babies30Tasks')}>
          <div className="metric-icon">🔥</div>
          <div className="metric-content">
            <div className="metric-label">Bébés avec &gt; 30 tâches</div>
            <div className="metric-value">{metrics?.babiesWithMoreThan30Tasks || 0}</div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('babies100Tasks')}>
          <div className="metric-icon">⭐</div>
          <div className="metric-content">
            <div className="metric-label">Bébés avec &gt; 100 tâches</div>
            <div className="metric-value">{metrics?.babiesWithMoreThan100Tasks || 0}</div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('babiesMultipleParents')}>
          <div className="metric-icon">👨‍👩‍👧</div>
          <div className="metric-content">
            <div className="metric-label">Bébés partagés (&gt; 1 parent)</div>
            <div className="metric-value">{metrics?.babiesWithMultipleParents || 0}</div>
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>

        <div className="metric-card clickable" onClick={() => handleCardClick('babiesActiveRecently')}>
          <div className="metric-icon">🟢</div>
          <div className="metric-content">
            <div className="metric-label">Bébés actifs (7 derniers jours)</div>
            <div className="metric-value">{metrics?.babiesActiveRecently || 0}</div>
            {renderTrend(metrics?.babiesActiveRecently || 0, metrics?.previousPeriod?.babiesActiveRecently)}
            <div className="metric-hint">Cliquez pour voir la liste</div>
          </div>
        </div>
      </div>

      {metrics && (
        <div className="conversion-section">
          <h3>📊 Taux de conversion</h3>
          <div className="conversion-grid">
            <div className="conversion-card">
              <div className="conversion-label">Téléchargements → Comptes</div>
              <div className="conversion-value">
                {metrics.totalAccounts > 0 && (metrics.iosDownloads + metrics.androidDownloads) > 0
                  ? `${Math.round((metrics.totalAccounts / (metrics.iosDownloads + metrics.androidDownloads)) * 100)}%`
                  : 'N/A'}
              </div>
              <div className="conversion-detail">
                {metrics.totalAccounts} / {metrics.iosDownloads + metrics.androidDownloads}
              </div>
            </div>

            <div className="conversion-card">
              <div className="conversion-label">Comptes → Bébés</div>
              <div className="conversion-value">
                {metrics.totalAccounts > 0
                  ? `${Math.round((metrics.totalBabies / metrics.totalAccounts) * 100)}%`
                  : 'N/A'}
              </div>
              <div className="conversion-detail">
                {metrics.totalBabies} / {metrics.totalAccounts}
              </div>
            </div>

            <div className="conversion-card">
              <div className="conversion-label">Bébés → Utilisation (≥1 tâche)</div>
              <div className="conversion-value">
                {metrics.totalBabies > 0
                  ? `${Math.round((metrics.babiesWithMoreThan1Task / metrics.totalBabies) * 100)}%`
                  : 'N/A'}
              </div>
              <div className="conversion-detail">
                {metrics.babiesWithMoreThan1Task} / {metrics.totalBabies}
              </div>
            </div>

            <div className="conversion-card">
              <div className="conversion-label">Bébés → Engagement fort (&gt;30 tâches)</div>
              <div className="conversion-value">
                {metrics.totalBabies > 0
                  ? `${Math.round((metrics.babiesWithMoreThan30Tasks / metrics.totalBabies) * 100)}%`
                  : 'N/A'}
              </div>
              <div className="conversion-detail">
                {metrics.babiesWithMoreThan30Tasks} / {metrics.totalBabies}
              </div>
            </div>

            <div className="conversion-card">
              <div className="conversion-label">Bébés → Actifs récemment</div>
              <div className="conversion-value">
                {metrics.totalBabies > 0
                  ? `${Math.round((metrics.babiesActiveRecently / metrics.totalBabies) * 100)}%`
                  : 'N/A'}
              </div>
              <div className="conversion-detail">
                {metrics.babiesActiveRecently} / {metrics.totalBabies}
              </div>
            </div>

            <div className="conversion-card">
              <div className="conversion-label">Bébés partagés (multi-parents)</div>
              <div className="conversion-value">
                {metrics.totalBabies > 0
                  ? `${Math.round((metrics.babiesWithMultipleParents / metrics.totalBabies) * 100)}%`
                  : 'N/A'}
              </div>
              <div className="conversion-detail">
                {metrics.babiesWithMultipleParents} / {metrics.totalBabies}
              </div>
            </div>
          </div>
        </div>
      )}

      {metrics?.averageStats && (
        <div className="stats-section">
          <h3>📈 Statistiques moyennes</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-label">Nb moyen de tâches par bébé</div>
                <div className="stat-value">{metrics.averageStats.avgTasksPerBaby}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-label">Nb moyen de parents par bébé</div>
                <div className="stat-value">{metrics.averageStats.avgParentsPerBaby}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-label">Type de tâche le plus populaire</div>
                <div className="stat-value">{metrics.averageStats.mostPopularTaskType}</div>
                <div className="stat-detail">
                  {metrics.averageStats.mostPopularTaskCount} tâches
                </div>
              </div>
            </div>

            {metrics.averageStats.avgAccountLifetime > 0 && (
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <div className="stat-label">Durée de vie moyenne (comptes supprimés)</div>
                  <div className="stat-value">{metrics.averageStats.avgAccountLifetime} jours</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {metrics?.taskDistribution && (
        <TaskDistribution distribution={metrics.taskDistribution} />
      )}

      {metrics && allUsers.length > 0 && allBabies.length > 0 && (
        <Charts
          users={allUsers}
          babies={allBabies}
          iosDownloads={metrics.iosDownloads}
          androidDownloads={metrics.androidDownloads}
        />
      )}

      <div className="info-box">
        <p><strong>Note:</strong> Les téléchargements par OS sont basés sur Firebase Analytics.</p>
        <p>Pour voir le funnel d'engagement détaillé, allez dans l'onglet "Funnel".</p>
      </div>

      <ListModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        title={getModalTitle()}
        type={modalType === 'accounts' || modalType === 'accountsWithoutBaby' || modalType === 'deletedAccounts' ? 'users' : 'babies'}
        data={modalData}
        showAgeBreakdown={modalType === 'accountsWithoutBaby'}
        onBabyClick={handleBabyClick}
      />

      <BabyDetailsModal
        isOpen={isBabyModalOpen}
        onClose={() => setIsBabyModalOpen(false)}
        baby={selectedBaby}
      />
    </div>
  );
};
