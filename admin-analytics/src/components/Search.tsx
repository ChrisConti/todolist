import React, { useState, useEffect, useRef } from 'react';
import type { Baby, User } from '../types';
import { getAllBabies, getAllUsers } from '../services/analyticsService';
import { BabyDetailsModal } from './BabyDetailsModal';
import { UserDetailsModal } from './UserDetailsModal';
import './Search.css';

type AgeRange = '0-1' | '1-3' | '3-6' | '6-12' | '12-18' | '18+' | 'all';

interface BabyWithAge extends Baby {
  ageInMonths: number;
  parentEmails: string[];
}

export const Search: React.FC = () => {
  const [selectedRange, setSelectedRange] = useState<AgeRange>('all');
  const [loading, setLoading] = useState(false);
  const [babies, setBabies] = useState<BabyWithAge[]>([]);
  const [filteredBabies, setFilteredBabies] = useState<BabyWithAge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedBaby, setSelectedBaby] = useState<Baby | null>(null);
  const [isBabyModalOpen, setIsBabyModalOpen] = useState(false);

  // User search
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBabies();
  }, []);

  useEffect(() => {
    filterBabiesByAge();
  }, [selectedRange, babies]);

  const loadBabies = async () => {
    try {
      setLoading(true);
      setError(null);

      const [allBabies, fetchedUsers] = await Promise.all([
        getAllBabies(),
        getAllUsers()
      ]);

      setAllUsers(fetchedUsers);

      // Create a map of userId to email
      const userEmailMap = new Map<string, string>();
      fetchedUsers.forEach((u: User) => userEmailMap.set(u.userId, u.email));

      // Calculate age for each baby
      const babiesWithAge: BabyWithAge[] = allBabies
        .map((baby: Baby) => {
          const ageInMonths = calculateAgeInMonths(baby.birthDate);
          return {
            ...baby,
            ageInMonths,
            parentEmails: baby.user?.map(uid => userEmailMap.get(uid) || 'N/A').filter(Boolean) || []
          };
        })
        .filter((baby: BabyWithAge) => baby.ageInMonths !== null);

      setBabies(babiesWithAge);
    } catch (err: any) {
      console.error('Error loading babies:', err);
      setError(err.message || 'Erreur lors du chargement des bébés');
    } finally {
      setLoading(false);
    }
  };

  const calculateAgeInMonths = (birthDate: string | undefined): number => {
    if (!birthDate) return -1;

    let birth: Date;

    // Parse birth date (can be DD/MM/YYYY or ISO format)
    if (birthDate.includes('/')) {
      let [day, month, year] = birthDate.split('/').map(Number);

      // Handle 2-digit years: if year <= 50, assume 20XX, else 19XX
      if (year < 100) {
        year = year <= 50 ? 2000 + year : 1900 + year;
      }

      birth = new Date(year, month - 1, day);
    } else {
      birth = new Date(birthDate);
    }

    if (isNaN(birth.getTime())) return -1;

    const now = new Date();

    // Calculate months difference properly
    const yearsDiff = now.getFullYear() - birth.getFullYear();
    const monthsDiff = now.getMonth() - birth.getMonth();
    const daysDiff = now.getDate() - birth.getDate();

    let totalMonths = yearsDiff * 12 + monthsDiff;

    // If the day hasn't been reached yet this month, subtract one month
    if (daysDiff < 0) {
      totalMonths--;
    }

    return totalMonths >= 0 ? totalMonths : -1;
  };

  const filterBabiesByAge = () => {
    if (selectedRange === 'all') {
      setFilteredBabies([...babies].sort((a, b) => a.ageInMonths - b.ageInMonths));
      return;
    }

    const filtered = babies.filter(baby => {
      switch (selectedRange) {
        case '0-1':
          return baby.ageInMonths >= 0 && baby.ageInMonths <= 1;
        case '1-3':
          return baby.ageInMonths > 1 && baby.ageInMonths <= 3;
        case '3-6':
          return baby.ageInMonths > 3 && baby.ageInMonths <= 6;
        case '6-12':
          return baby.ageInMonths > 6 && baby.ageInMonths <= 12;
        case '12-18':
          return baby.ageInMonths > 12 && baby.ageInMonths <= 18;
        case '18+':
          return baby.ageInMonths > 18;
        default:
          return true;
      }
    });

    setFilteredBabies(filtered.sort((a, b) => a.ageInMonths - b.ageInMonths));
  };

  const handleBabyClick = (baby: BabyWithAge) => {
    setSelectedBaby(baby);
    setIsBabyModalOpen(true);
  };

  const handleBabyDeleted = async () => {
    setIsBabyModalOpen(false);
    await loadBabies();
  };

  const handleUserSearch = (query: string) => {
    setUserQuery(query);
    if (!query.trim()) {
      setUserResults([]);
      return;
    }
    const q = query.toLowerCase().trim();
    const results = allUsers
      .filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .slice(0, 10);
    setUserResults(results);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
    setUserQuery('');
    setUserResults([]);
  };

  const handleParentClick = (userId: string) => {
    const user = allUsers.find(u => u.userId === userId);
    if (user) {
      setSelectedUser({ ...user, linkedBaby: selectedBaby ?? user.linkedBaby });
      setIsUserModalOpen(true);
    }
  };

  const getAgeLabel = (range: AgeRange): string => {
    switch (range) {
      case '0-1': return '0-1 mois';
      case '1-3': return '1-3 mois';
      case '3-6': return '3-6 mois';
      case '6-12': return '6-12 mois';
      case '12-18': return '12-18 mois';
      case '18+': return '18+ mois';
      case 'all': return 'Tous les âges';
    }
  };

  const formatAge = (months: number): string => {
    if (months < 0) return 'N/A';
    if (months === 0) return 'Nouveau-né';
    if (months === 1) return '1 mois';
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} an${years > 1 ? 's' : ''}`;
    return `${years} an${years > 1 ? 's' : ''} ${remainingMonths} mois`;
  };

  return (
    <div className="search">
      <div className="user-search-block" ref={searchRef}>
        <h2>Recherche par utilisateur</h2>
        <div className="user-search-input-wrap">
          <input
            type="text"
            className="user-search-input"
            placeholder="Nom, prénom ou email..."
            value={userQuery}
            onChange={e => handleUserSearch(e.target.value)}
          />
          {userQuery && (
            <button className="user-search-clear" onClick={() => { setUserQuery(''); setUserResults([]); }}>✕</button>
          )}
        </div>
        {userResults.length > 0 && (
          <div className="user-search-dropdown">
            {userResults.map(u => (
              <div key={u.userId} className="user-search-result" onClick={() => handleUserSelect(u)}>
                <span className="user-result-name">{u.username || '—'}</span>
                <span className="user-result-email">{u.email}</span>
              </div>
            ))}
          </div>
        )}
        {userQuery.trim() && userResults.length === 0 && !loading && (
          <div className="user-search-empty">Aucun utilisateur trouvé</div>
        )}
      </div>

      <h2>Recherche par tranche d'âge</h2>

      <div className="age-range-selector">
        <button
          className={`age-btn ${selectedRange === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedRange('all')}
        >
          Tous ({babies.length})
        </button>
        {(['0-1', '1-3', '3-6', '6-12', '12-18', '18+'] as AgeRange[]).map(range => {
          const count = babies.filter(baby => {
            switch (range) {
              case '0-1': return baby.ageInMonths >= 0 && baby.ageInMonths <= 1;
              case '1-3': return baby.ageInMonths > 1 && baby.ageInMonths <= 3;
              case '3-6': return baby.ageInMonths > 3 && baby.ageInMonths <= 6;
              case '6-12': return baby.ageInMonths > 6 && baby.ageInMonths <= 12;
              case '12-18': return baby.ageInMonths > 12 && baby.ageInMonths <= 18;
              case '18+': return baby.ageInMonths > 18;
              default: return false;
            }
          }).length;

          return (
            <button
              key={range}
              className={`age-btn ${selectedRange === range ? 'active' : ''}`}
              onClick={() => setSelectedRange(range)}
            >
              {getAgeLabel(range)} ({count})
            </button>
          );
        })}
      </div>

      {loading && <div className="loading">Chargement des bébés...</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && !error && (
        <div className="babies-list">
          <div className="babies-list-header">
            <h3>
              {filteredBabies.length} bébé{filteredBabies.length > 1 ? 's' : ''} -{' '}
              {getAgeLabel(selectedRange)}
            </h3>
          </div>

          {filteredBabies.length === 0 ? (
            <div className="no-results">Aucun bébé dans cette tranche d'âge</div>
          ) : (
            <div className="babies-grid">
              {filteredBabies.map(baby => (
                <div
                  key={baby.id}
                  className="baby-card"
                  onClick={() => handleBabyClick(baby)}
                >
                  <div className="baby-card-header">
                    <div className="baby-card-icon">👶</div>
                    <div className="baby-card-info">
                      <div className="baby-card-name">{baby.name}</div>
                      <div className="baby-card-age">{formatAge(baby.ageInMonths)}</div>
                    </div>
                  </div>

                  <div className="baby-card-details">
                    <div className="baby-card-stat">
                      <span className="stat-label">Tâches:</span>
                      <span className="stat-value">{baby.tasks?.length || 0}</span>
                    </div>
                    <div className="baby-card-stat">
                      <span className="stat-label">Parents:</span>
                      <span className="stat-value">{baby.user?.length || 0}</span>
                    </div>
                  </div>

                  {baby.parentEmails.length > 0 && (
                    <div className="baby-card-parents">
                      {baby.parentEmails.map((email, idx) => (
                        <div key={idx} className="parent-email">{email}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BabyDetailsModal
        isOpen={isBabyModalOpen}
        onClose={() => setIsBabyModalOpen(false)}
        baby={selectedBaby}
        onBabyDeleted={handleBabyDeleted}
        onParentClick={handleParentClick}
      />

      <UserDetailsModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
      />
    </div>
  );
};
