import React from 'react';
import type { User, Baby } from '../types';
import { parseBabyDate } from '../types';
import './ListModal.css';

interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'users' | 'babies';
  data: User[] | Baby[];
  showAgeBreakdown?: boolean;
  onBabyClick?: (baby: Baby) => void;
  onUserClick?: (user: User) => void;
}

export const ListModal: React.FC<ListModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  data,
  showAgeBreakdown = false,
  onBabyClick,
  onUserClick,
}) => {
  if (!isOpen) return null;

  // Date d'achat premium — affichée en colonne dès qu'au moins un user de la liste en a une.
  // Absente pour les achats antérieurs à la v1.3.2, qui a introduit le champ premiumDate.
  const formatPurchaseDate = (u: User): string | null => {
    if (!u.premiumDate) return null;
    const d = typeof u.premiumDate === 'string' ? new Date(u.premiumDate) : (u.premiumDate as any).toDate();
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  const showPurchaseDate = type === 'users' && (data as User[]).some(u => u.premiumDate);

  // Calculate age breakdown for users without baby
  const ageBreakdown = showAgeBreakdown && type === 'users' ? (() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let createdToday = 0;
    let created1to7Days = 0;
    let createdOver7Days = 0;

    (data as User[]).forEach(user => {
      if (!user.creationDate) return;

      let userDate: Date;
      if (typeof user.creationDate === 'string') {
        userDate = new Date(user.creationDate);
      } else if (typeof user.creationDate === 'object' && 'toDate' in user.creationDate) {
        userDate = (user.creationDate as any).toDate();
      } else {
        return;
      }

      if (userDate >= today) {
        createdToday++;
      } else if (userDate >= sevenDaysAgo) {
        created1to7Days++;
      } else {
        createdOver7Days++;
      }
    });

    return { createdToday, created1to7Days, createdOver7Days };
  })() : null;

  // Calculate age from birthdate
  const calculateAge = (birthDate: string | undefined): string => {
    if (!birthDate) return 'N/A';

    // Parse DD/MM/YYYY format
    let birth: Date;
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

    if (isNaN(birth.getTime())) return 'N/A';

    const now = new Date();

    // For very recent babies, show days
    const diffMs = now.getTime() - birth.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'N/A';
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return '1 jour';
    if (diffDays < 30) return `${diffDays} jours`;

    // Calculate months difference properly
    const yearsDiff = now.getFullYear() - birth.getFullYear();
    const monthsDiff = now.getMonth() - birth.getMonth();
    const daysDiff = now.getDate() - birth.getDate();

    let totalMonths = yearsDiff * 12 + monthsDiff;

    // If the day hasn't been reached yet this month, subtract one month
    if (daysDiff < 0) {
      totalMonths--;
    }

    if (totalMonths < 0) return 'N/A';
    if (totalMonths === 1) return '1 mois';
    if (totalMonths < 12) return `${totalMonths} mois`;

    const years = Math.floor(totalMonths / 12);
    const remainingMonths = totalMonths % 12;
    if (years === 1 && remainingMonths === 0) return '1 an';
    if (years === 1) return `1 an ${remainingMonths}m`;
    if (remainingMonths === 0) return `${years} ans`;
    return `${years} ans ${remainingMonths}m`;
  };

  const exportToCSV = () => {
    let csv = '';

    if (type === 'users') {
      const hasDeletedUsers = (data as User[]).some(u => u.deleted);
      csv = 'Email,Nom,Provider,Opt-in email,Pays,Plateforme,Date de création'
        + (showPurchaseDate ? ",Date d'achat" : '')
        + (hasDeletedUsers ? ',Période de vie' : '')
        + '\n';

      (data as User[]).forEach(user => {
        const date = user.creationDate
          ? new Date(typeof user.creationDate === 'string' ? user.creationDate : (user.creationDate as any).toDate()).toLocaleDateString('fr-FR')
          : 'N/A';

        let lifetime = 'N/A';
        if (user.deleted && user.creationDate && user.deletedAt) {
          const creationDate = typeof user.creationDate === 'string'
            ? new Date(user.creationDate)
            : (user.creationDate as any).toDate();
          const deletionDate = new Date(user.deletedAt);
          const daysDiff = Math.floor((deletionDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
          lifetime = `${daysDiff} jours`;
        }

        const provider = user.provider || 'email';
        const optIn = user.emailOptIn ? 'Oui' : 'Non';
        const country = user.country || 'N/A';
        const platform = (user as any).platform || 'N/A';

        csv += `${user.email},${user.username},${provider},${optIn},${country},${platform},${date}`
          + (showPurchaseDate ? `,${formatPurchaseDate(user) ?? 'non daté'}` : '')
          + (hasDeletedUsers ? `,${lifetime}` : '')
          + '\n';
      });
    } else {
      csv = 'Nom du bébé,Sexe,Date de naissance,Âge,Poids (kg),Taille (cm),Nb parents,Nombre de tâches,Emails parents (email|rôle|tranche âge),Date de création\n';
      (data as Baby[]).forEach(baby => {
        const createdDateObj = parseBabyDate(baby);
        const createdDate = createdDateObj ? createdDateObj.toLocaleDateString('fr-FR') : 'N/A';

        // Parse birthDate in DD/MM/YYYY format
        let birthDateDisplay = 'N/A';
        if (baby.birthDate) {
          if (baby.birthDate.includes('/')) {
            birthDateDisplay = baby.birthDate;
          } else {
            birthDateDisplay = new Date(baby.birthDate).toLocaleDateString('fr-FR');
          }
        }

        const age = calculateAge(baby.birthDate);
        const taskCount = baby.tasks?.length || 0;
        const sex = baby.type === 'Boy' ? 'Garçon' : baby.type === 'Girl' ? 'Fille' : 'N/A';
        const weight = baby.weight ? baby.weight.toString() : 'N/A';
        const height = baby.height ? baby.height.toString() : 'N/A';
        const parentCount = baby.user?.length || 0;

        let emails: string;
        if (baby.linkedUsers && baby.linkedUsers.length > 0) {
          emails = baby.linkedUsers.map(u => {
            const role = baby.memberRoles?.[u.userId] || '';
            const ageRange = u.parentAgeRange || '';
            return [u.email, role, ageRange].filter(Boolean).join('|');
          }).join(' / ');
        } else if (baby.parentEmails && baby.parentEmails.length > 0) {
          emails = baby.parentEmails.join(' | ');
        } else {
          emails = baby.userEmail || 'N/A';
        }

        csv += `${baby.name},${sex},${birthDateDisplay},${age},${weight},${height},${parentCount},${taskCount},"${emails}",${createdDate}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <div className="modal-actions">
            <button className="export-btn" onClick={exportToCSV}>
              📥 Exporter CSV
            </button>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {ageBreakdown && (
          <div className="age-breakdown">
            <div className="breakdown-item">
              <span className="breakdown-label">Créés aujourd'hui:</span>
              <span className="breakdown-value">{ageBreakdown.createdToday}</span>
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Créés il y a 1-7 jours:</span>
              <span className="breakdown-value">{ageBreakdown.created1to7Days}</span>
            </div>
            <div className="breakdown-item warning">
              <span className="breakdown-label">Créés il y a &gt; 7 jours:</span>
              <span className="breakdown-value">{ageBreakdown.createdOver7Days}</span>
              <span className="breakdown-note">⚠️ À relancer ?</span>
            </div>
          </div>
        )}

        {type === 'users' && (data as User[]).some(u => u.babyStatus) && (
          <div style={{ display: 'flex', gap: 12, padding: '8px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 12, color: '#6b7280' }}>
            <span><span style={{ background: '#dcfce7', color: '#166534', padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>👶 Nom</span> = bébé créé dans la période</span>
            <span><span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>🔗 Nom</span> = a rejoint un bébé existant</span>
            <span><span style={{ color: '#9ca3af' }}>—</span> = sans bébé</span>
          </div>
        )}

        <div className="modal-body">
          {data.length === 0 ? (
            <div className="empty-state">Aucune donnée à afficher</div>
          ) : (
            <div className="data-table">
              {type === 'users' ? (
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Nom</th>
                      <th>Provider</th>
                      <th>Opt-in</th>
                      <th>Pays</th>
                      <th>Plateforme</th>
                      <th>Date de création</th>
                      {showPurchaseDate && <th>Date d'achat</th>}
                      {(data as User[]).some(u => u.deleted) && <th>Période de vie</th>}
                      {(data as User[]).some(u => u.babyStatus) && <th>Bébé</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(data as User[]).map((user) => {
                      const dateObj = user.creationDate
                        ? new Date(typeof user.creationDate === 'string' ? user.creationDate : (user.creationDate as any).toDate())
                        : null;
                      const date = dateObj
                        ? dateObj.toLocaleDateString('fr-FR') + ' ' + dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : 'N/A';

                      let lifetime = 'N/A';
                      if (user.deleted && user.creationDate && user.deletedAt) {
                        const creationDate = typeof user.creationDate === 'string'
                          ? new Date(user.creationDate)
                          : (user.creationDate as any).toDate();
                        const deletionDate = new Date(user.deletedAt);
                        const daysDiff = Math.floor((deletionDate.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24));
                        lifetime = `${daysDiff} jours`;
                      }

                      const providerIcon = user.provider === 'google' ? '🔵 Google'
                        : user.provider === 'apple' ? '🍎 Apple'
                        : '✉️ Email';

                      return (
                        <tr key={user.userId} onClick={() => onUserClick?.(user)} style={{ cursor: onUserClick ? 'pointer' : 'default' }}>
                          <td>{user.email}</td>
                          <td>{user.username}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{providerIcon}</td>
                          <td style={{ textAlign: 'center' }}>{user.emailOptIn ? '✅' : '❌'}</td>
                          <td>{user.country || '—'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div>{(user as any).platform === 'ios' ? '🍎' : (user as any).platform === 'android' ? '🤖' : '—'}</div>
                            {user.appVersion && <div style={{ fontSize: '11px', color: '#888' }}>v{user.appVersion}</div>}
                          </td>
                          <td>{date}</td>
                          {showPurchaseDate && (
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {formatPurchaseDate(user) ?? (
                                <span style={{ color: '#9ca3af' }} title="Achat antérieur à la v1.3.2, qui a introduit le champ premiumDate">
                                  — non daté
                                </span>
                              )}
                            </td>
                          )}
                          {(data as User[]).some(u => u.deleted) && <td>{lifetime}</td>}
                          {(data as User[]).some(u => u.babyStatus) && (
                            <td>
                              {user.babyStatus === 'created' && user.linkedBaby && (
                                <span
                                  onClick={e => { e.stopPropagation(); onBabyClick?.(user.linkedBaby!); }}
                                  style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: onBabyClick ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                                  title={user.linkedBaby.name}
                                >
                                  👶 {user.linkedBaby.name}
                                </span>
                              )}
                              {user.babyStatus === 'joined' && user.linkedBaby && (
                                <span
                                  onClick={e => { e.stopPropagation(); onBabyClick?.(user.linkedBaby!); }}
                                  style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: onBabyClick ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
                                  title={user.linkedBaby.name}
                                >
                                  🔗 {user.linkedBaby.name}
                                </span>
                              )}
                              {user.babyStatus === 'none' && (
                                <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nom du bébé</th>
                      <th>Sexe</th>
                      <th>Date de naissance <span title="Format DD/MM/YYYY. Peut être une date future si le bébé n'est pas encore né." style={{ cursor: 'help', color: '#888', fontSize: '12px' }}>ⓘ</span></th>
                      <th>Âge <span title="N/A si la date de naissance est dans le futur (bébé enregistré avant la naissance)." style={{ cursor: 'help', color: '#888', fontSize: '12px' }}>ⓘ</span></th>
                      <th>Poids/Taille <span title="N/A si non renseigné par le parent." style={{ cursor: 'help', color: '#888', fontSize: '12px' }}>ⓘ</span></th>
                      <th>Parents</th>
                      <th>Tâches</th>
                      <th>Emails parents <span title="Email, rôle (ex: maman/papa) et tranche d'âge du parent, si renseignés." style={{ cursor: 'help', color: '#888', fontSize: '12px' }}>ⓘ</span></th>
                      <th>Date de création</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data as Baby[]).map((baby) => {
                      const createdDateObj = parseBabyDate(baby);
                      const createdDate = createdDateObj
                        ? createdDateObj.toLocaleDateString('fr-FR') + ' ' + createdDateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : 'N/A';

                      // Parse birthDate in DD/MM/YYYY format
                      let birthDateDisplay = 'N/A';
                      if (baby.birthDate) {
                        if (baby.birthDate.includes('/')) {
                          birthDateDisplay = baby.birthDate;
                        } else {
                          birthDateDisplay = new Date(baby.birthDate).toLocaleDateString('fr-FR');
                        }
                      }

                      const age = calculateAge(baby.birthDate);
                      const taskCount = baby.tasks?.length || 0;
                      const sexIcon = baby.type === 'Boy' ? '👦' : baby.type === 'Girl' ? '👧' : '❓';
                      const parentCount = baby.user?.length || 0;
                      const weightHeight = [
                        baby.weight ? `${baby.weight} kg` : null,
                        baby.height ? `${baby.height} cm` : null
                      ].filter(Boolean).join(' / ') || 'N/A';

                      // Display all parent emails with role and age range
                      const parentEmailsDisplay = baby.linkedUsers && baby.linkedUsers.length > 0
                        ? baby.linkedUsers.map((u, idx) => {
                            const role = baby.memberRoles?.[u.userId];
                            const ageRange = u.parentAgeRange;
                            return (
                              <div key={idx} style={{ marginBottom: '4px' }}>
                                <div style={{ fontSize: '12px' }}>{u.email}</div>
                                <div style={{ display: 'flex', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                                  {role && (
                                    <span style={{ background: '#e3f2fd', color: '#1565c0', padding: '1px 5px', borderRadius: '8px', fontSize: '10px' }}>{role}</span>
                                  )}
                                  {ageRange && (
                                    <span style={{ background: '#f3e5f5', color: '#6a1b9a', padding: '1px 5px', borderRadius: '8px', fontSize: '10px' }}>{ageRange}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        : baby.parentEmails && baby.parentEmails.length > 0
                          ? baby.parentEmails.map((email, idx) => (
                              <div key={idx} style={{ fontSize: '12px', marginBottom: '2px' }}>{email}</div>
                            ))
                          : (baby.userEmail || 'N/A');

                      return (
                        <tr
                          key={baby.id}
                          onClick={() => onBabyClick?.(baby)}
                          style={{ cursor: onBabyClick ? 'pointer' : 'default' }}
                          className={onBabyClick ? 'clickable-row' : ''}
                        >
                          <td>{baby.name}</td>
                          <td style={{ fontSize: '20px', textAlign: 'center' }}>{sexIcon}</td>
                          <td>{birthDateDisplay}</td>
                          <td>{age}</td>
                          <td>{weightHeight}</td>
                          <td>
                            {parentCount}
                            {parentCount > 1 && <span style={{ marginLeft: '5px', background: '#4CAF50', color: 'white', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>partagé</span>}
                          </td>
                          <td>{taskCount}</td>
                          <td>{parentEmailsDisplay}</td>
                          <td>{createdDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
